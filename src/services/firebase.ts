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

// Write local records into user's private Firestore subcollections and bundle document
export async function saveAllUserRecordsToFirestore(
  userId: string,
  localData: LifeOSData
): Promise<{ success: boolean; lastSyncedAt: number; totalUploaded: number }> {
  const timestamp = Date.now();
  const writeItems: BatchWriteItem[] = [];

  // 1. User profile document: /users/{userId}
  writeItems.push({
    path: `users/${userId}`,
    data: {
      userId,
      name: localData.profile.name || 'LifeOS User',
      email: auth.currentUser?.email || '',
      age: localData.profile.age || 28,
      heightCm: localData.profile.heightCm || 178,
      weightUnit: localData.profile.weightUnit || 'kg',
      waterUnit: localData.profile.waterUnit || 'ml',
      distanceUnit: localData.profile.distanceUnit || 'km',
      accentColor: localData.profile.accentColor || 'cyan',
      updatedAt: timestamp,
    },
  });

  // 2. User daily goals: /users/{userId}/goals/main
  writeItems.push({
    path: `users/${userId}/goals/main`,
    data: {
      userId,
      dailySteps: Number(localData.goals.dailySteps) || 10000,
      dailyActiveCalories: Number(localData.goals.dailyActiveCalories) || 500,
      dailyWaterMl: Number(localData.goals.dailyWaterMl) || 2500,
      dailyCalories: Number(localData.goals.dailyCalories) || 2200,
      dailyProteinG: Number(localData.goals.dailyProteinG) || 140,
      dailyCarbsG: Number(localData.goals.dailyCarbsG) || 220,
      dailyFatG: Number(localData.goals.dailyFatG) || 70,
      dailySleepMinutes: Number(localData.goals.dailySleepMinutes) || 480,
      targetWeightKg: Number(localData.goals.targetWeightKg) || 75,
      updatedAt: timestamp,
    },
  });

  // 3. Granular Meals Subcollection: /users/{userId}/mealLogs/{meal.id}
  for (const meal of localData.mealLogs) {
    if (meal && meal.id) {
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
  for (const water of localData.waterLogs) {
    if (water && water.id) {
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
  for (const workout of localData.workoutLogs) {
    if (workout && workout.id) {
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
  for (const journal of localData.journalEntries) {
    if (journal && journal.id) {
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
  for (const body of localData.bodyLogs) {
    if (body && body.id) {
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
  for (const habit of localData.habits) {
    if (habit && habit.id) {
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
  for (const priority of localData.dailyPriorities) {
    if (priority && priority.id) {
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
  for (const step of localData.stepLogs) {
    if (step && step.id) {
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
  for (const sleep of localData.sleepLogs) {
    if (sleep && sleep.id) {
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
  for (const hr of localData.heartRateLogs) {
    if (hr && hr.id) {
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
  for (const food of localData.savedFoods) {
    if (food && food.id) {
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
  writeItems.push({
    path: `users/${userId}/cloudBackup/latest`,
    data: {
      userId,
      backupData: JSON.stringify(localData),
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

// Helper to deduplicate array of objects by unique id field
function mergeUniqueById<T extends { id: string; timestamp?: number }>(
  localList: T[] = [],
  cloudList: T[] = []
): { merged: T[]; addedFromCloud: number; addedFromLocal: number } {
  const map = new Map<string, T>();

  // Add cloud records first
  for (const item of cloudList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  let addedFromLocal = 0;
  // Merge local records: if duplicate ID, prefer newer timestamp if available
  for (const item of localList) {
    if (item && item.id) {
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
        addedFromLocal++;
      } else {
        if ((item.timestamp || 0) >= (existing.timestamp || 0)) {
          map.set(item.id, item);
        }
      }
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
    cloudMeals,
    cloudWater,
    cloudWorkouts,
    cloudJournal,
    cloudBody,
    cloudHabits,
    cloudPriorities,
    cloudSteps,
    cloudSleep,
    cloudHr,
    cloudFoods,
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

  // Also check cloud backup bundle for profile and goals
  let cloudProfile = localData.profile;
  let cloudGoals = localData.goals;
  try {
    const backupSnap = await getDoc(doc(db, 'users', userId, 'cloudBackup', 'latest'));
    if (backupSnap.exists()) {
      const bData = backupSnap.data();
      if (bData && bData.backupData) {
        const parsed = JSON.parse(bData.backupData);
        if (parsed.profile) cloudProfile = { ...parsed.profile, ...localData.profile };
        if (parsed.goals) cloudGoals = { ...parsed.goals, ...localData.goals };
      }
    }
  } catch (e) {
    console.warn('Backup bundle fetch skipped or unavailable:', e);
  }

  // 2. Merge all collections safely by unique ID
  const mergedMeals = mergeUniqueById(localData.mealLogs, cloudMeals);
  const mergedWater = mergeUniqueById(localData.waterLogs, cloudWater);
  const mergedWorkouts = mergeUniqueById(localData.workoutLogs, cloudWorkouts);
  const mergedJournal = mergeUniqueById(localData.journalEntries, cloudJournal);
  const mergedBodyLogs = mergeUniqueById(localData.bodyLogs, cloudBody);
  const mergedHabits = mergeUniqueById(localData.habits, cloudHabits);
  const mergedPriorities = mergeUniqueById(localData.dailyPriorities, cloudPriorities);
  const mergedSteps = mergeUniqueById(localData.stepLogs, cloudSteps);
  const mergedSleep = mergeUniqueById(localData.sleepLogs, cloudSleep);
  const mergedHr = mergeUniqueById(localData.heartRateLogs, cloudHr);
  const mergedFoods = mergeUniqueById(localData.savedFoods, cloudFoods);

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
    version: localData.version || 1,
    isDemoMode: localData.isDemoMode,
    profile: {
      ...cloudProfile,
      ...localData.profile,
    },
    goals: {
      ...cloudGoals,
      ...localData.goals,
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

  // 3. Write ALL unified records directly to user's Firestore path
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
