import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  LifeOSData,
  MealLog,
  WaterLog,
  WorkoutLog,
  JournalEntry,
  BodyMeasurementLog,
  Habit,
  DailyPriority,
  StepLog,
  SleepLog,
  HeartRateLog,
  FoodItem,
} from '../types/wellness';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId to getFirestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Operation types for strict Firestore error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

// Initial connection test to verify server connectivity
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}
// Run connection test at boot
testConnection();

// Sign-In via Google Popup
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.error('Google Sign-in failed:', err);
    throw err;
  }
}

// Sign-Out
export async function signOutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err: any) {
    console.error('Google Sign-out failed:', err);
    throw err;
  }
}

// Batch write helper to respect Firestore limit of 500 ops per batch
interface BatchWriteItem {
  path: string;
  data: Record<string, any>;
}

async function executeBatchedWrites(items: BatchWriteItem[]): Promise<number> {
  const BATCH_LIMIT = 400;
  let totalCommitted = 0;

  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);

    for (const item of chunk) {
      batch.set(doc(db, item.path), item.data, { merge: true });
    }

    try {
      await batch.commit();
      totalCommitted += chunk.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, chunk[0]?.path || null);
    }
  }

  return totalCommitted;
}

import { isDemoRecord, filterOutDemoRecords } from '../utils/mockData';

// Write local records into user's private Firestore subcollections and bundle document
export async function saveAllUserRecordsToFirestore(
  userId: string,
  localData: LifeOSData
): Promise<{ success: boolean; lastSyncedAt: number; totalUploaded: number }> {
  const timestamp = Date.now();
  const writeItems: BatchWriteItem[] = [];

  // Sanitize localData to guarantee that NO demo records are ever prepared for Firestore
  const cleanData = filterOutDemoRecords(localData);

  // 1. User profile document: /users/{userId}
  writeItems.push({
    path: `users/${userId}`,
    data: {
      userId,
      name: cleanData.profile.name || 'LifeOS User',
      email: auth.currentUser?.email || '',
      age: cleanData.profile.age || 28,
      heightCm: cleanData.profile.heightCm || 178,
      weightUnit: cleanData.profile.weightUnit || 'kg',
      waterUnit: cleanData.profile.waterUnit || 'ml',
      distanceUnit: cleanData.profile.distanceUnit || 'km',
      accentColor: cleanData.profile.accentColor || 'cyan',
      updatedAt: timestamp,
    },
  });

  // 2. User daily goals: /users/{userId}/goals/main
  writeItems.push({
    path: `users/${userId}/goals/main`,
    data: {
      userId,
      dailySteps: Number(cleanData.goals.dailySteps) || 10000,
      dailyActiveCalories: Number(cleanData.goals.dailyActiveCalories) || 500,
      dailyWaterMl: Number(cleanData.goals.dailyWaterMl) || 2500,
      dailyCalories: Number(cleanData.goals.dailyCalories) || 2200,
      dailyProteinG: Number(cleanData.goals.dailyProteinG) || 140,
      dailyCarbsG: Number(cleanData.goals.dailyCarbsG) || 220,
      dailyFatG: Number(cleanData.goals.dailyFatG) || 70,
      dailySleepMinutes: Number(cleanData.goals.dailySleepMinutes) || 480,
      targetWeightKg: Number(cleanData.goals.targetWeightKg) || 75,
      updatedAt: timestamp,
    },
  });

  // 3. Granular Meals Subcollection: /users/{userId}/mealLogs/{meal.id}
  for (const meal of cleanData.mealLogs) {
    if (meal && meal.id && !isDemoRecord(meal)) {
      writeItems.push({
        path: `users/${userId}/mealLogs/${meal.id}`,
        data: {
          ...meal,
          userId,
          calories: Number(meal.calories) || 0,
          protein: Number(meal.protein) || 0,
          carbs: Number(meal.carbs) || 0,
          fats: Number(meal.fats) || 0,
          serving: meal.serving || '1 serving',
          timestamp: meal.timestamp || timestamp,
        },
      });
    }
  }

  // 4. Granular Hydration Subcollection: /users/{userId}/waterLogs/{water.id}
  for (const water of cleanData.waterLogs) {
    if (water && water.id && !isDemoRecord(water)) {
      writeItems.push({
        path: `users/${userId}/waterLogs/${water.id}`,
        data: {
          ...water,
          userId,
          amountMl: Number(water.amountMl) || 250,
          timestamp: water.timestamp || timestamp,
        },
      });
    }
  }

  // 5. Granular Workouts Subcollection: /users/{userId}/workoutLogs/{workout.id}
  for (const workout of cleanData.workoutLogs) {
    if (workout && workout.id && !isDemoRecord(workout)) {
      writeItems.push({
        path: `users/${userId}/workoutLogs/${workout.id}`,
        data: {
          ...workout,
          userId,
          durationMinutes: Number(workout.durationMinutes) || 30,
          caloriesBurned: Number(workout.caloriesBurned) || 0,
          timestamp: workout.timestamp || timestamp,
        },
      });
    }
  }

  // 6. Granular Journal Entries Subcollection: /users/{userId}/journalEntries/{journal.id}
  for (const journal of cleanData.journalEntries) {
    if (journal && journal.id && !isDemoRecord(journal)) {
      writeItems.push({
        path: `users/${userId}/journalEntries/${journal.id}`,
        data: {
          ...journal,
          userId,
          mood: Number(journal.mood) || 3,
          energy: Number(journal.energy) || 3,
          reflection: journal.reflection || '',
          timestamp: journal.timestamp || timestamp,
        },
      });
    }
  }

  // 7. Granular Body Logs Subcollection: /users/{userId}/bodyLogs/{body.id}
  for (const body of cleanData.bodyLogs) {
    if (body && body.id && !isDemoRecord(body)) {
      writeItems.push({
        path: `users/${userId}/bodyLogs/${body.id}`,
        data: {
          ...body,
          userId,
          weightKg: Number(body.weightKg) || 70,
          timestamp: body.timestamp || timestamp,
        },
      });
    }
  }

  // 8. Granular Habits Subcollection: /users/{userId}/habits/{habit.id}
  for (const habit of cleanData.habits) {
    if (habit && habit.id && !isDemoRecord(habit)) {
      writeItems.push({
        path: `users/${userId}/habits/${habit.id}`,
        data: {
          ...habit,
          userId,
          targetDaysPerWeek: Number(habit.targetDaysPerWeek) || 7,
        },
      });
    }
  }

  // 9. Granular Priorities Subcollection: /users/{userId}/dailyPriorities/{priority.id}
  for (const priority of cleanData.dailyPriorities) {
    if (priority && priority.id && !isDemoRecord(priority)) {
      writeItems.push({
        path: `users/${userId}/dailyPriorities/${priority.id}`,
        data: {
          ...priority,
          userId,
          completed: Boolean(priority.completed),
          order: Number(priority.order) || 0,
        },
      });
    }
  }

  // 10. Steps Subcollection: /users/{userId}/stepLogs/{step.id}
  for (const step of cleanData.stepLogs) {
    if (step && step.id && !isDemoRecord(step)) {
      writeItems.push({
        path: `users/${userId}/stepLogs/${step.id}`,
        data: {
          ...step,
          userId,
          count: Number(step.count) || 0,
          timestamp: step.timestamp || timestamp,
        },
      });
    }
  }

  // 11. Sleep Subcollection: /users/{userId}/sleepLogs/{sleep.id}
  for (const sleep of cleanData.sleepLogs) {
    if (sleep && sleep.id && !isDemoRecord(sleep)) {
      writeItems.push({
        path: `users/${userId}/sleepLogs/${sleep.id}`,
        data: {
          ...sleep,
          userId,
          totalMinutes: Number(sleep.totalMinutes) || 0,
          timestamp: sleep.timestamp || timestamp,
        },
      });
    }
  }

  // 12. Heart Rate Subcollection: /users/{userId}/heartRateLogs/{hr.id}
  for (const hr of cleanData.heartRateLogs) {
    if (hr && hr.id && !isDemoRecord(hr)) {
      writeItems.push({
        path: `users/${userId}/heartRateLogs/${hr.id}`,
        data: {
          ...hr,
          userId,
          timestamp: hr.timestamp || timestamp,
        },
      });
    }
  }

  // 13. Saved Foods Subcollection: /users/{userId}/savedFoods/{food.id}
  for (const food of cleanData.savedFoods) {
    if (food && food.id && !isDemoRecord(food)) {
      writeItems.push({
        path: `users/${userId}/savedFoods/${food.id}`,
        data: {
          ...food,
          userId,
          calories: Number(food.calories) || 0,
        },
      });
    }
  }

  // 14. Full snapshot backup bundle for instant multi-device restoration
  // Only the cleanData (strictly sans demo records) is serialized to cloudBackup/latest
  writeItems.push({
    path: `users/${userId}/cloudBackup/latest`,
    data: {
      userId,
      backupData: JSON.stringify(cleanData),
      lastSyncedAt: timestamp,
    },
  });

  // Execute all batched writes to Firestore
  const totalUploaded = await executeBatchedWrites(writeItems);

  return { success: true, lastSyncedAt: timestamp, totalUploaded };
}

// Fetch all subcollection documents from user's Firestore path
async function fetchSubcollectionDocs<T extends { id: string }>(
  userId: string,
  subcollection: string
): Promise<T[]> {
  const path = `users/${userId}/${subcollection}`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, subcollection));
    const items: T[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && d.id) {
        items.push(d as T);
      }
    });
    return items;
  } catch (err) {
    console.warn(`Query on ${path} returned:`, err);
    return [];
  }
}

// Helper for deep equality comparison across primitives, arrays, and nested objects
function isDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isDeepEqual(a[key], b[key])) return false;
  }
  return true;
}

// Helper to determine if a value is empty (null, undefined, empty string, empty array, or empty plain object)
function isEmptyValue(val: any): boolean {
  if (val === null || val === undefined || val === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).length === 0) return true;
  return false;
}

const MAX_PRIMARY_ALTERNATIVES = 15;

// Helper to extract all distinct raw alternative values from any conflict representation
// (handles strings, numbers, objects, arrays, legacy {cloud, local}, or modern {alternatives, archivedAlternatives})
function extractConflictValues(conflictData: any): any[] {
  if (conflictData === undefined || conflictData === null) return [];
  const results: any[] = [];

  if (Array.isArray(conflictData)) {
    for (const item of conflictData) {
      results.push(...extractConflictValues(item));
    }
    return results;
  }

  if (typeof conflictData === 'object') {
    // If it has alternatives array:
    if (Array.isArray(conflictData.alternatives)) {
      results.push(...extractConflictValues(conflictData.alternatives));
    }
    // If it has archivedAlternatives array:
    if (Array.isArray(conflictData.archivedAlternatives)) {
      results.push(...extractConflictValues(conflictData.archivedAlternatives));
    }
    // If it has cloud field:
    if ('cloud' in conflictData) {
      results.push(...extractConflictValues(conflictData.cloud));
    }
    // If it has local field:
    if ('local' in conflictData) {
      results.push(...extractConflictValues(conflictData.local));
    }
    // If it is a domain object (e.g. nested stages, exercises) that is not a conflict container:
    if (
      !('alternatives' in conflictData) &&
      !('archivedAlternatives' in conflictData) &&
      !('cloud' in conflictData) &&
      !('local' in conflictData)
    ) {
      results.push(conflictData);
    }
    return results;
  }

  results.push(conflictData);
  return results;
}

// Deterministically sort and deduplicate conflict values
function deduplicateAndSortAlternatives(values: any[]): any[] {
  const unique: any[] = [];
  for (const val of values) {
    if (val === undefined) continue;
    if (!unique.some((u) => isDeepEqual(u, val))) {
      unique.push(val);
    }
  }

  // Deterministic stable sort by JSON representation
  unique.sort((a, b) => {
    const strA = typeof a === 'object' ? JSON.stringify(a) : String(a);
    const strB = typeof b === 'object' ? JSON.stringify(b) : String(b);
    return strA.localeCompare(strB);
  });

  return unique;
}

// Helper to safely merge conflict metadata across existing, incoming, and newly discovered conflicts
function mergeConflictsMetadata(
  existingConflicts?: Record<string, any>,
  incomingConflicts?: Record<string, any>,
  newConflicts?: Record<string, any>
): Record<string, any> | undefined {
  const allConflictKeys = new Set<string>();

  if (existingConflicts && typeof existingConflicts === 'object') {
    Object.keys(existingConflicts).forEach((k) => allConflictKeys.add(k));
  }
  if (incomingConflicts && typeof incomingConflicts === 'object') {
    Object.keys(incomingConflicts).forEach((k) => allConflictKeys.add(k));
  }
  if (newConflicts && typeof newConflicts === 'object') {
    Object.keys(newConflicts).forEach((k) => allConflictKeys.add(k));
  }

  if (allConflictKeys.size === 0) return undefined;

  const merged: Record<string, any> = {};

  for (const key of allConflictKeys) {
    const cExisting = existingConflicts ? existingConflicts[key] : undefined;
    const cIncoming = incomingConflicts ? incomingConflicts[key] : undefined;
    const cNew = newConflicts ? newConflicts[key] : undefined;

    // Collect all raw candidate values across histories, preserving any archived alternatives
    const rawValues: any[] = [
      ...extractConflictValues(cExisting),
      ...extractConflictValues(cIncoming),
    ];

    if (cNew) {
      if (cNew.cloud !== undefined) rawValues.push(cNew.cloud);
      if (cNew.local !== undefined) rawValues.push(cNew.local);
    }

    const allAlternatives = deduplicateAndSortAlternatives(rawValues);

    // Provide backward-compatible cloud and local pointers:
    let cloudPointer: any = undefined;
    if (cNew && cNew.cloud !== undefined) {
      cloudPointer = cNew.cloud;
    } else if (cExisting && typeof cExisting === 'object' && 'cloud' in cExisting) {
      cloudPointer = cExisting.cloud;
    } else if (cIncoming && typeof cIncoming === 'object' && 'cloud' in cIncoming) {
      cloudPointer = cIncoming.cloud;
    } else {
      cloudPointer = allAlternatives[0];
    }

    let localPointer: any = undefined;
    if (cNew && cNew.local !== undefined) {
      localPointer = cNew.local;
    } else if (cIncoming && typeof cIncoming === 'object' && 'local' in cIncoming) {
      localPointer = cIncoming.local;
    } else if (cExisting && typeof cExisting === 'object' && 'local' in cExisting) {
      localPointer = cExisting.local;
    } else {
      localPointer = allAlternatives.length > 1 ? allAlternatives[1] : allAlternatives[0];
    }

    // Partition alternatives into primary alternatives and archivedAlternatives (excess preserved, none discarded)
    const primaryAlternatives = allAlternatives.slice(0, MAX_PRIMARY_ALTERNATIVES);
    const archivedAlternatives =
      allAlternatives.length > MAX_PRIMARY_ALTERNATIVES
        ? allAlternatives.slice(MAX_PRIMARY_ALTERNATIVES)
        : undefined;

    const entry: Record<string, any> = {
      cloud: cloudPointer,
      local: localPointer,
      alternatives: primaryAlternatives,
    };

    if (archivedAlternatives && archivedAlternatives.length > 0) {
      entry.archivedAlternatives = archivedAlternatives;
    }

    merged[key] = entry;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

// Helper to deduplicate array of objects by unique id field with deterministic conflict resolution
export function mergeUniqueById<T extends { id: string; timestamp?: number; updatedAt?: number; source?: string }>(
  localList: T[] = [],
  cloudList: T[] = []
): { merged: T[]; addedFromCloud: number; addedFromLocal: number; conflictsResolved: number } {
  const map = new Map<string, T>();
  let conflictsResolved = 0;

  // 1. Add valid cloud records first
  for (const item of cloudList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  let addedFromLocal = 0;
  // 2. Merge local records with deterministic, field-aware conflict resolution
  for (const item of localList) {
    if (!item || !item.id) continue;

    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      addedFromLocal++;
    } else {
      // Modification timestamp separation:
      // - Use updatedAt ONLY when BOTH records have valid modification timestamps (> 0).
      // - Do NOT use event timestamp (timestamp) as a modification-time fallback.
      // - If either record lacks reliable modification metadata, route to the conservative conflict-resolution path.
      const hasValidLocalMod = typeof item.updatedAt === 'number' && item.updatedAt > 0;
      const hasValidCloudMod = typeof existing.updatedAt === 'number' && existing.updatedAt > 0;

      // Extract existing conflicts metadata to prevent loss or nested duplication
      const existingConflicts = (existing as any)._conflicts;
      const localConflicts = (item as any)._conflicts;
      const newlyDiscoveredConflicts: Record<string, { cloud: any; local: any }> = {};

      const allKeys = new Set([...Object.keys(existing), ...Object.keys(item)]);
      allKeys.delete('_conflicts');

      const mergedRecord: Record<string, any> = {};

      if (hasValidLocalMod && hasValidCloudMod && item.updatedAt! > existing.updatedAt!) {
        // CASE 1: Local is strictly newer based on valid modification timestamps.
        // Field-aware merge:
        // - Non-conflicting fields from both versions are preserved.
        // - For fields present in newer local record, use the newer value.
        // - If older cloud value differs, preserve it in _conflicts recovery metadata.
        // - For fields absent from newer local record, preserve the older cloud value (omission is not deletion).
        for (const key of allKeys) {
          const valCloud = (existing as Record<string, any>)[key];
          const valLocal = (item as Record<string, any>)[key];

          if (valLocal !== undefined) {
            mergedRecord[key] = valLocal;
            if (key !== 'timestamp' && key !== 'updatedAt' && valCloud !== undefined && !isDeepEqual(valLocal, valCloud)) {
              newlyDiscoveredConflicts[key] = { cloud: valCloud, local: valLocal };
            }
          } else {
            // Absent in newer local record: preserve older cloud field
            mergedRecord[key] = valCloud;
          }
        }
        conflictsResolved++;
      } else if (hasValidLocalMod && hasValidCloudMod && existing.updatedAt! > item.updatedAt!) {
        // CASE 2: Cloud is strictly newer based on valid modification timestamps.
        // Field-aware merge:
        // - Non-conflicting fields from both versions are preserved.
        // - For fields present in newer cloud record, use the newer value.
        // - If older local value differs, preserve it in _conflicts recovery metadata.
        // - For fields absent from newer cloud record, preserve the older local value (omission is not deletion).
        for (const key of allKeys) {
          const valCloud = (existing as Record<string, any>)[key];
          const valLocal = (item as Record<string, any>)[key];

          if (valCloud !== undefined) {
            mergedRecord[key] = valCloud;
            if (key !== 'timestamp' && key !== 'updatedAt' && valLocal !== undefined && !isDeepEqual(valCloud, valLocal)) {
              newlyDiscoveredConflicts[key] = { cloud: valCloud, local: valLocal };
            }
          } else {
            // Absent in newer cloud record: preserve older local field
            mergedRecord[key] = valLocal;
          }
        }
        conflictsResolved++;
      } else {
        // CASE 3: Conservative conflict-resolution path.
        // Entered when:
        // A. Both records have identical updatedAt, OR
        // B. Either or both records lack reliable modification metadata (updatedAt).
        // Event timestamps (timestamp) are NOT used to guess edit recency.
        // - Never use property count (Object.keys().length) to decide which record wins.
        // - Preserve non-conflicting fields from BOTH records.
        // - Deep equality check for primitives, arrays, and nested objects.
        // - Meaningful non-empty values take precedence over null/undefined/empty string/empty collection.
        // - If both sides have distinct, meaningful values: deterministic tie-breaker (local wins as active working state),
        //   and store the conflicting cloud value in `_conflicts` metadata for recovery.
        for (const key of allKeys) {
          const valCloud = (existing as Record<string, any>)[key];
          const valLocal = (item as Record<string, any>)[key];

          if (key === 'timestamp' || key === 'updatedAt') {
            mergedRecord[key] = Math.max(valLocal || 0, valCloud || 0) || valLocal || valCloud;
          } else if (valLocal === undefined) {
            mergedRecord[key] = valCloud;
          } else if (valCloud === undefined) {
            mergedRecord[key] = valLocal;
          } else if (isDeepEqual(valLocal, valCloud)) {
            mergedRecord[key] = valLocal;
          } else {
            const localEmpty = isEmptyValue(valLocal);
            const cloudEmpty = isEmptyValue(valCloud);

            if (localEmpty && !cloudEmpty) {
              mergedRecord[key] = valCloud;
            } else if (!localEmpty && cloudEmpty) {
              mergedRecord[key] = valLocal;
            } else {
              // Both have meaningful conflicting values and edit order cannot be verified:
              // Preserve local value as active working state, AND preserve cloud value in _conflicts
              mergedRecord[key] = valLocal;
              newlyDiscoveredConflicts[key] = { cloud: valCloud, local: valLocal };
            }
          }
        }
        conflictsResolved++;
      }

      // Preserve previously unresolved _conflicts and attach any newly discovered conflicts
      const finalConflicts = mergeConflictsMetadata(
        existingConflicts,
        localConflicts,
        newlyDiscoveredConflicts
      );
      if (finalConflicts) {
        mergedRecord._conflicts = finalConflicts;
      }

      map.set(item.id, mergedRecord as T);
    }
  }

  // Count items from cloud that were not in local
  const localIdSet = new Set(localList.map((i) => i.id));
  let addedFromCloud = 0;
  for (const cloudItem of cloudList) {
    if (!localIdSet.has(cloudItem.id)) {
      addedFromCloud++;
    }
  }

  return {
    merged: Array.from(map.values()),
    addedFromCloud,
    addedFromLocal,
    conflictsResolved,
  };
}

// Full Two-Way Sync and Merge with Firestore
export async function syncAndMergeWithCloud(
  userId: string,
  localData: LifeOSData
): Promise<{
  mergedData: LifeOSData;
  addedToCloudCount: number;
  addedToLocalCount: number;
  totalUploaded: number;
  totalRecords: number;
  lastSyncedAt: number;
}> {
  // 1. Fetch remote records from Firestore subcollections
  const [
    rawCloudMeals,
    rawCloudWater,
    rawCloudWorkouts,
    rawCloudJournal,
    rawCloudBody,
    rawCloudHabits,
    rawCloudPriorities,
    rawCloudSteps,
    rawCloudSleep,
    rawCloudHr,
    rawCloudFoods,
  ] = await Promise.all([
    fetchSubcollectionDocs<MealLog>(userId, 'mealLogs'),
    fetchSubcollectionDocs<WaterLog>(userId, 'waterLogs'),
    fetchSubcollectionDocs<WorkoutLog>(userId, 'workoutLogs'),
    fetchSubcollectionDocs<JournalEntry>(userId, 'journalEntries'),
    fetchSubcollectionDocs<BodyMeasurementLog>(userId, 'bodyLogs'),
    fetchSubcollectionDocs<Habit>(userId, 'habits'),
    fetchSubcollectionDocs<DailyPriority>(userId, 'dailyPriorities'),
    fetchSubcollectionDocs<StepLog>(userId, 'stepLogs'),
    fetchSubcollectionDocs<SleepLog>(userId, 'sleepLogs'),
    fetchSubcollectionDocs<HeartRateLog>(userId, 'heartRateLogs'),
    fetchSubcollectionDocs<FoodItem>(userId, 'savedFoods'),
  ]);

  // REPAIR 1: Inbound Firebase Demo-Data Protection
  // Filter out positively identified demo records from incoming cloud downloads.
  // Preserves genuine legacy records without source unless their IDs or content positively confirm synthetic demo origin.
  const cloudMeals = rawCloudMeals.filter((m) => !isDemoRecord(m));
  const cloudWater = rawCloudWater.filter((w) => !isDemoRecord(w));
  const cloudWorkouts = rawCloudWorkouts.filter((w) => !isDemoRecord(w));
  const cloudJournal = rawCloudJournal.filter((j) => !isDemoRecord(j));
  const cloudBody = rawCloudBody.filter((b) => !isDemoRecord(b));
  const cloudHabits = rawCloudHabits.filter((h) => !isDemoRecord(h));
  const cloudPriorities = rawCloudPriorities.filter((p) => !isDemoRecord(p));
  const cloudSteps = rawCloudSteps.filter((s) => !isDemoRecord(s));
  const cloudSleep = rawCloudSleep.filter((s) => !isDemoRecord(s));
  const cloudHr = rawCloudHr.filter((h) => !isDemoRecord(h));
  const cloudFoods = rawCloudFoods.filter((f) => !isDemoRecord(f));

  // Sanitize local data so that no local demo records are merged or pushed to the cloud
  const cleanLocalData = filterOutDemoRecords(localData);

  // Also check cloud backup bundle for profile and goals
  let cloudProfile = cleanLocalData.profile;
  let cloudGoals = cleanLocalData.goals;
  try {
    const backupSnap = await getDoc(doc(db, 'users', userId, 'cloudBackup', 'latest'));
    if (backupSnap.exists()) {
      const bData = backupSnap.data();
      if (bData && bData.backupData) {
        const parsed = JSON.parse(bData.backupData);
        if (parsed.profile) cloudProfile = { ...parsed.profile, ...cleanLocalData.profile };
        if (parsed.goals) cloudGoals = { ...parsed.goals, ...cleanLocalData.goals };
      }
    }
  } catch (e) {
    console.warn('Backup bundle fetch skipped or unavailable:', e);
  }

  // 2. Merge all collections safely by unique ID
  // Note: Only clean, non-demo records are merged on both local and cloud sides
  const mergedMeals = mergeUniqueById(cleanLocalData.mealLogs, cloudMeals);
  const mergedWater = mergeUniqueById(cleanLocalData.waterLogs, cloudWater);
  const mergedWorkouts = mergeUniqueById(cleanLocalData.workoutLogs, cloudWorkouts);
  const mergedJournal = mergeUniqueById(cleanLocalData.journalEntries, cloudJournal);
  const mergedBodyLogs = mergeUniqueById(cleanLocalData.bodyLogs, cloudBody);
  const mergedHabits = mergeUniqueById(cleanLocalData.habits, cloudHabits);
  const mergedPriorities = mergeUniqueById(cleanLocalData.dailyPriorities, cloudPriorities);
  const mergedSteps = mergeUniqueById(cleanLocalData.stepLogs, cloudSteps);
  const mergedSleep = mergeUniqueById(cleanLocalData.sleepLogs, cloudSleep);
  const mergedHr = mergeUniqueById(cleanLocalData.heartRateLogs, cloudHr);
  const mergedFoods = mergeUniqueById(cleanLocalData.savedFoods, cloudFoods);

  const totalAddedToCloud =
    mergedMeals.addedFromLocal +
    mergedWater.addedFromLocal +
    mergedWorkouts.addedFromLocal +
    mergedJournal.addedFromLocal +
    mergedBodyLogs.addedFromLocal +
    mergedHabits.addedFromLocal +
    mergedPriorities.addedFromLocal +
    mergedSteps.addedFromLocal +
    mergedSleep.addedFromLocal +
    mergedHr.addedFromLocal +
    mergedFoods.addedFromLocal;

  const totalAddedToLocal =
    mergedMeals.addedFromCloud +
    mergedWater.addedFromCloud +
    mergedWorkouts.addedFromCloud +
    mergedJournal.addedFromCloud +
    mergedBodyLogs.addedFromCloud +
    mergedHabits.addedFromCloud +
    mergedPriorities.addedFromCloud +
    mergedSteps.addedFromCloud +
    mergedSleep.addedFromCloud +
    mergedHr.addedFromCloud +
    mergedFoods.addedFromCloud;

  // Unified data structure combining both local and remote
  const unifiedData: LifeOSData = {
    version: cleanLocalData.version || 1,
    isDemoMode: localData.isDemoMode,
    profile: {
      ...cloudProfile,
      ...cleanLocalData.profile,
    },
    goals: {
      ...cloudGoals,
      ...cleanLocalData.goals,
    },
    mealLogs: mergedMeals.merged,
    waterLogs: mergedWater.merged,
    workoutLogs: mergedWorkouts.merged,
    journalEntries: mergedJournal.merged,
    bodyLogs: mergedBodyLogs.merged,
    habits: mergedHabits.merged,
    dailyPriorities: mergedPriorities.merged,
    stepLogs: mergedSteps.merged,
    sleepLogs: mergedSleep.merged,
    heartRateLogs: mergedHr.merged,
    savedFoods: mergedFoods.merged,
  };

  const totalRecords =
    unifiedData.mealLogs.length +
    unifiedData.waterLogs.length +
    unifiedData.workoutLogs.length +
    unifiedData.journalEntries.length +
    unifiedData.bodyLogs.length +
    unifiedData.habits.length +
    unifiedData.dailyPriorities.length +
    unifiedData.stepLogs.length +
    unifiedData.sleepLogs.length +
    unifiedData.heartRateLogs.length;

  // 3. Write only genuine non-demo records directly to user's Firestore path (saveAllUserRecordsToFirestore applies cleanData)
  const saveResult = await saveAllUserRecordsToFirestore(userId, unifiedData);

  return {
    mergedData: unifiedData,
    addedToCloudCount: totalAddedToCloud,
    addedToLocalCount: totalAddedToLocal,
    totalUploaded: saveResult.totalUploaded,
    totalRecords,
    lastSyncedAt: saveResult.lastSyncedAt,
  };
}
