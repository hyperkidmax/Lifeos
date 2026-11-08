import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, SUPPORTED_COLLECTIONS, SupportedCollection } from './config.js';

interface DeleteRecordRequest {
  collection: string;
  id: string;
}

interface BatchTombstoneItem {
  collection: string;
  id: string;
  deletedAt?: number;
}

interface BatchTombstonesRequest {
  items: BatchTombstoneItem[];
}

export function sanitizeRecordId(id: string): string {
  if (!id || typeof id !== 'string' || id.length > 128) {
    throw new HttpsError('invalid-argument', 'Invalid record ID: must be non-empty string <= 128 chars');
  }
  if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
    throw new HttpsError('invalid-argument', 'Record ID must match alphanumeric, underscore, or hyphen');
  }
  return id;
}

export function getTombstoneDocId(collection: string, id: string): string {
  return `${collection}__${sanitizeRecordId(id)}`;
}

// 1. Single record deletion callable function: Transaction-safe, immutable, idempotent
export const deleteRecord = onCall({ region: 'asia-northeast1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to delete records');
  }

  const { collection, id } = request.data as DeleteRecordRequest;
  if (!collection || !id) {
    throw new HttpsError('invalid-argument', 'Missing collection or id parameter');
  }

  if (!SUPPORTED_COLLECTIONS.includes(collection as SupportedCollection)) {
    throw new HttpsError('invalid-argument', `Unsupported collection: ${collection}`);
  }

  const cleanId = sanitizeRecordId(id);
  const tombstoneDocId = getTombstoneDocId(collection, cleanId);

  const syncRef = adminDb.doc(`users/${uid}/meta/sync`);
  const resetRef = adminDb.doc(`users/${uid}/meta/reset`);
  const tombstoneRef = adminDb.doc(`users/${uid}/tombstones/${tombstoneDocId}`);
  const recordRef = adminDb.doc(`users/${uid}/${collection}/${cleanId}`);

  const txResult = await adminDb.runTransaction(async (tx) => {
    // 1. Check if global reset is currently active
    const resetSnap = await tx.get(resetRef);
    if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
      throw new HttpsError(
        'failed-precondition',
        'Global reset is currently in progress; writes and deletions are paused'
      );
    }

    // 2. Read server generation authority
    const syncSnap = await tx.get(syncRef);
    const currentGen = syncSnap.exists ? (syncSnap.data()?.currentGeneration || 1) : 1;

    // 3. Inspect existing tombstone to ensure immutability
    const tombstoneSnap = await tx.get(tombstoneRef);
    if (tombstoneSnap.exists) {
      // Existing tombstone found: NEVER overwrite original deletion metadata!
      // Ensure record is deleted (idempotent retry safety)
      tx.delete(recordRef);
      return {
        alreadyExisted: true,
        generation: tombstoneSnap.data()?.generation || currentGen,
        tombstoneId: tombstoneDocId,
      };
    }

    // 4. Create brand new immutable tombstone and delete record atomically
    tx.set(tombstoneRef, {
      id: cleanId,
      collection,
      deletedAt: FieldValue.serverTimestamp(),
      deletedByUid: uid,
      generation: currentGen,
      tombstoneVersion: 1,
    });
    tx.delete(recordRef);

    return {
      alreadyExisted: false,
      generation: currentGen,
      tombstoneId: tombstoneDocId,
    };
  });

  return {
    success: true,
    tombstoneId: txResult.tombstoneId,
    generation: txResult.generation,
    alreadyExisted: txResult.alreadyExisted,
    collection,
    id: cleanId,
  };
});

// 2. Batch tombstones registration: Safe 250-item limit, chunked to max 200 items (400 writes <= 500 limit)
export const batchRecordTombstones = onCall({ region: 'asia-northeast1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { items } = request.data as BatchTombstonesRequest;
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, registeredCount: 0, alreadyExistedCount: 0, failedItems: [] };
  }

  // Enforce safe ceiling of 250 items per RPC call
  if (items.length > 250) {
    throw new HttpsError('invalid-argument', 'Batch size exceeds maximum limit of 250 items');
  }

  const syncRef = adminDb.doc(`users/${uid}/meta/sync`);
  const resetRef = adminDb.doc(`users/${uid}/meta/reset`);

  const [syncSnap, resetSnap] = await Promise.all([syncRef.get(), resetRef.get()]);
  if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
    throw new HttpsError('failed-precondition', 'Global reset is in progress');
  }

  const currentGen = syncSnap.exists ? (syncSnap.data()?.currentGeneration || 1) : 1;

  // Validate items up-front
  interface ValidatedItem {
    cleanId: string;
    collection: SupportedCollection;
    tombstoneDocId: string;
  }

  const validated: ValidatedItem[] = [];
  const failedItems: Array<{ item: any; reason: string }> = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      failedItems.push({ item, reason: 'Item is not an object' });
      continue;
    }
    if (!item.collection || !SUPPORTED_COLLECTIONS.includes(item.collection as SupportedCollection)) {
      failedItems.push({ item, reason: `Unsupported collection: ${item.collection}` });
      continue;
    }
    try {
      const cleanId = sanitizeRecordId(item.id);
      const tombstoneDocId = getTombstoneDocId(item.collection, cleanId);
      validated.push({
        cleanId,
        collection: item.collection as SupportedCollection,
        tombstoneDocId,
      });
    } catch (e: any) {
      failedItems.push({ item, reason: e.message || 'Invalid record ID' });
    }
  }

  let registeredCount = 0;
  let alreadyExistedCount = 0;

  // Chunk validated items into batches of 200 items (max 400 writes, staying under 500-write limit)
  const CHUNK_SIZE = 200;
  for (let i = 0; i < validated.length; i += CHUNK_SIZE) {
    const chunk = validated.slice(i, i + CHUNK_SIZE);
    const tombstoneRefs = chunk.map((v) => adminDb.doc(`users/${uid}/tombstones/${v.tombstoneDocId}`));

    // Efficiently inspect existing tombstones in one roundtrip
    const snaps = await adminDb.getAll(...tombstoneRefs);
    const existingSet = new Set<string>();
    snaps.forEach((s) => {
      if (s.exists) {
        existingSet.add(s.id);
      }
    });

    const batch = adminDb.batch();

    for (const v of chunk) {
      const tombstoneRef = adminDb.doc(`users/${uid}/tombstones/${v.tombstoneDocId}`);
      const recordRef = adminDb.doc(`users/${uid}/${v.collection}/${v.cleanId}`);

      if (existingSet.has(v.tombstoneDocId)) {
        // Never overwrite existing tombstone metadata; only ensure record document is purged
        batch.delete(recordRef);
        alreadyExistedCount++;
      } else {
        batch.set(tombstoneRef, {
          id: v.cleanId,
          collection: v.collection,
          deletedAt: FieldValue.serverTimestamp(),
          deletedByUid: uid,
          generation: currentGen,
          tombstoneVersion: 1,
        });
        batch.delete(recordRef);
        registeredCount++;
      }
    }

    await batch.commit();
  }

  return {
    success: true,
    registeredCount,
    alreadyExistedCount,
    failedItems,
    generation: currentGen,
  };
});
