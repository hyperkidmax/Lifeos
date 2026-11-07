import { LifeOSData, RecordTombstone } from '../types/wellness';

const DB_NAME = 'lifeos_local_store';
const DB_VERSION = 1;

export interface QuarantinedDataset {
  quarantineId: string;
  userId: string;
  generation: number;
  quarantinedAt: number;
  reason: string;
  records: Record<string, any[]>;
}

class LocalDatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private isIndexedDBAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private async getDb(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDBAvailable()) return null;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('wellness_data')) {
          db.createObjectStore('wellness_data', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('tombstones')) {
          const store = db.createObjectStore('tombstones', { keyPath: 'docKey' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('id', 'id', { unique: false });
        }
        if (!db.objectStoreNames.contains('pending_deletions')) {
          const store = db.createObjectStore('pending_deletions', { keyPath: 'docKey' });
          store.createIndex('userId', 'userId', { unique: false });
        }
        if (!db.objectStoreNames.contains('quarantine')) {
          db.createObjectStore('quarantine', { keyPath: 'quarantineId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB failed to open, falling back to localStorage:', request.error);
        resolve(null as any);
      };
    });

    return this.dbPromise;
  }

  private getFallbackKey(userId: string, suffix: string): string {
    return `lifeos_${userId || 'anonymous'}_${suffix}`;
  }

  // 1. Load User Data
  public async loadUserData(userId: string, defaultState: LifeOSData): Promise<LifeOSData> {
    const db = await this.getDb();
    if (db) {
      try {
        const tx = db.transaction('wellness_data', 'readonly');
        const store = tx.objectStore('wellness_data');
        const req = store.get(userId);
        const result = await new Promise<any>((res, rej) => {
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });

        if (result && result.data) {
          return result.data;
        }
      } catch (e) {
        console.warn('IndexedDB read failed, trying localStorage:', e);
      }
    }

    // LocalStorage fallback
    try {
      const key = this.getFallbackKey(userId, 'data');
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
      // Check legacy non-user-scoped key for seamless migration
      const legacyRaw = localStorage.getItem('lifeos_wellness_data');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        localStorage.setItem(key, legacyRaw); // migrate to user-scoped key
        return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }

    return defaultState;
  }

  // 2. Save User Data
  public async saveUserData(userId: string, data: LifeOSData): Promise<void> {
    const key = this.getFallbackKey(userId, 'data');
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }

    const db = await this.getDb();
    if (db) {
      try {
        const tx = db.transaction('wellness_data', 'readwrite');
        const store = tx.objectStore('wellness_data');
        store.put({ userId, data, updatedAt: Date.now() });
      } catch (e) {
        console.warn('IndexedDB write failed:', e);
      }
    }
  }

  // 3. Atomically Remove Record and Persist Tombstone (Crash-Resilient)
  public async atomicallyRemoveRecordAndQueueTombstone(
    userId: string,
    collection: string,
    recordId: string,
    generation: number,
    currentData: LifeOSData
  ): Promise<{ updatedData: LifeOSData; tombstone: RecordTombstone }> {
    const tombstone: RecordTombstone = {
      id: recordId,
      collection,
      deletedAt: Date.now(),
      deletedByUid: userId,
      generation,
      tombstoneVersion: 1,
    };

    const docKey = `${userId}__${collection}__${recordId}`;

    // Filter record from target array in local state
    const updatedCollection = ((currentData as any)[collection] || []).filter(
      (item: any) => item.id !== recordId
    );

    const updatedTombstones = [...(currentData.tombstones || []).filter((t) => t.id !== recordId), tombstone];
    const updatedPending = [...(currentData.pendingTombstones || []).filter((t) => t.id !== recordId), tombstone];

    const updatedData: LifeOSData = {
      ...currentData,
      [collection]: updatedCollection,
      tombstones: updatedTombstones,
      pendingTombstones: updatedPending,
    };

    // 1. Commit to localStorage synchronously
    const dataKey = this.getFallbackKey(userId, 'data');
    const tombstoneKey = this.getFallbackKey(userId, 'pending_tombstones');
    try {
      localStorage.setItem(dataKey, JSON.stringify(updatedData));
      localStorage.setItem(tombstoneKey, JSON.stringify(updatedPending));
    } catch (e) {
      console.error('Failed to sync atomic deletion to localStorage:', e);
    }

    // 2. Commit transaction in IndexedDB
    const db = await this.getDb();
    if (db) {
      try {
        const tx = db.transaction(['wellness_data', 'tombstones', 'pending_deletions'], 'readwrite');
        tx.objectStore('wellness_data').put({ userId, data: updatedData, updatedAt: Date.now() });
        tx.objectStore('tombstones').put({ docKey, userId, ...tombstone });
        tx.objectStore('pending_deletions').put({ docKey, userId, ...tombstone });
      } catch (e) {
        console.warn('IndexedDB atomic transaction warning:', e);
      }
    }

    return { updatedData, tombstone };
  }

  // 4. Mark Pending Tombstone as Synced
  public async markTombstoneSynced(userId: string, collection: string, recordId: string): Promise<void> {
    const docKey = `${userId}__${collection}__${recordId}`;

    const tombstoneKey = this.getFallbackKey(userId, 'pending_tombstones');
    try {
      const raw = localStorage.getItem(tombstoneKey);
      if (raw) {
        const items: RecordTombstone[] = JSON.parse(raw);
        const filtered = items.filter((item) => !(item.collection === collection && item.id === recordId));
        localStorage.setItem(tombstoneKey, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Failed to update pending tombstones in localStorage:', e);
    }

    const db = await this.getDb();
    if (db) {
      try {
        const tx = db.transaction('pending_deletions', 'readwrite');
        tx.objectStore('pending_deletions').delete(docKey);
      } catch (e) {
        console.warn('Failed to delete pending tombstone in IndexedDB:', e);
      }
    }
  }

  // 5. Get All Pending Tombstones
  public async getPendingTombstones(userId: string): Promise<RecordTombstone[]> {
    const tombstoneKey = this.getFallbackKey(userId, 'pending_tombstones');
    try {
      const raw = localStorage.getItem(tombstoneKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to read pending tombstones from localStorage:', e);
    }
    return [];
  }

  // 6. Quarantine Stale Records (When localGen < serverGen)
  public async quarantineStaleGenerationData(
    userId: string,
    staleGeneration: number,
    staleData: LifeOSData,
    reason = 'Stale generation reset detected from cloud'
  ): Promise<QuarantinedDataset> {
    const quarantineId = `quarantine_${userId}_gen${staleGeneration}_${Date.now()}`;
    const collectionsToQuarantine: Record<string, any[]> = {
      mealLogs: staleData.mealLogs || [],
      waterLogs: staleData.waterLogs || [],
      workoutLogs: staleData.workoutLogs || [],
      journalEntries: staleData.journalEntries || [],
      bodyLogs: staleData.bodyLogs || [],
      habits: staleData.habits || [],
      dailyPriorities: staleData.dailyPriorities || [],
      stepLogs: staleData.stepLogs || [],
      sleepLogs: staleData.sleepLogs || [],
      heartRateLogs: staleData.heartRateLogs || [],
      savedFoods: staleData.savedFoods || [],
    };

    const record: QuarantinedDataset = {
      quarantineId,
      userId,
      generation: staleGeneration,
      quarantinedAt: Date.now(),
      reason,
      records: collectionsToQuarantine,
    };

    // Store in localStorage
    const qKey = this.getFallbackKey(userId, `quarantine_gen${staleGeneration}`);
    try {
      localStorage.setItem(qKey, JSON.stringify(record));
    } catch (e) {
      console.error('Failed to store quarantine in localStorage:', e);
    }

    // Store in IndexedDB
    const db = await this.getDb();
    if (db) {
      try {
        const tx = db.transaction('quarantine', 'readwrite');
        tx.objectStore('quarantine').put(record);
      } catch (e) {
        console.warn('Failed to store quarantine in IndexedDB:', e);
      }
    }

    return record;
  }
}

export const localDb = new LocalDatabaseService();
