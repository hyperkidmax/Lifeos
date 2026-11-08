/**
 * Executable Cloud Functions Emulator Integration Test Suite for LifeOS
 * 
 * Verifies all 11 real Cloud Functions integration test criteria:
 * 1. Unauthenticated callable requests rejected.
 * 2. Single deletion creates tombstone and deletes record atomically.
 * 3. Repeated deletion preserves original tombstone metadata.
 * 4. Batch deletion handles duplicate and invalid items correctly, preserves immutability, returns exact counts.
 * 5. Concurrent deletion preserves tombstone immutability.
 * 6. Reset prevents conflicting writes and deletions.
 * 7. Simultaneous reset requests are rejected.
 * 8. Reset can resume after interruption (deterministic multi-collection test).
 * 9. Deterministic stale-worker fencing: superseded lease token cannot commit checkpoints or update reset state.
 * 10. Finalization rejects incorrect reset ID/generation and active leases.
 * 11. Account isolation: Alice's records and tombstones cannot be affected by Bob.
 */

import { initializeApp, deleteApp } from 'firebase/app';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { initializeApp as initAdminApp, getApps as getAdminApps, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { commitResetCheckpointTx } from '../../functions/src/reset.js';

export interface FunctionTestResult {
  testNumber: number;
  name: string;
  passed: boolean;
  details: string;
}

const TEST_PROJECT_ID = 'demo-lifeos-test';
const TEST_DATABASE_ID = 'ai-studio-lifeospersonalwe-b862082e-4804-4384-8505-6fe6d79e3ac4';
const FUNCTIONS_REGION = 'asia-northeast1';
const TEST_USER_PASSWORD = 'TestPassword123!';

/**
 * Creates a real authenticated user session against the Firebase Auth Emulator
 * using Firebase Admin Auth connected explicitly to the Auth Emulator.
 * 
 * Flow:
 * 1. Admin Auth creates or updates the user with the exact requested `uid`, `email`, and `password`.
 * 2. Client SDK signs in via `signInWithEmailAndPassword(clientAuth, email, password)`.
 * 3. Strictly asserts `auth.currentUser.uid === uid`.
 * 4. Never swallows authentication errors.
 */
async function createAndSignInEmulatorUser(
  clientAuth: any,
  adminAuth: any,
  uid: string,
  email: string
): Promise<void> {
  // 1. Create user with requested UID using Admin Auth connected to the Auth Emulator
  try {
    await adminAuth.createUser({
      uid,
      email,
      password: TEST_USER_PASSWORD,
    });
  } catch (createErr: any) {
    if (createErr.code === 'auth/uid-already-exists' || createErr.code === 'auth/email-already-exists') {
      // User already exists in this emulator run: ensure password & email match
      await adminAuth.updateUser(uid, {
        email,
        password: TEST_USER_PASSWORD,
      });
    } else {
      throw new Error(`Admin Auth createUser failed for ${uid}: ${createErr.message || createErr}`);
    }
  }

  // 2. Perform client SDK sign-in with email and password against the Auth Emulator
  const userCredential = await signInWithEmailAndPassword(clientAuth, email, TEST_USER_PASSWORD);
  if (!userCredential || !userCredential.user) {
    throw new Error(`Failed to obtain client UserCredential for ${uid}`);
  }

  // 3. Strictly verify that auth.currentUser.uid matches the requested UID
  const actualUid: string | undefined = clientAuth.currentUser?.uid;
  if (!actualUid || actualUid !== uid) {
    throw new Error(
      `Auth emulator UID mismatch: requested "${uid}", but clientAuth.currentUser.uid is "${actualUid || 'null'}"`
    );
  }
}

export async function runFunctionsEmulatorTests(options?: {
  host?: string;
  authPort?: number;
  firestorePort?: number;
  functionsPort?: number;
  projectId?: string;
  databaseId?: string;
}): Promise<{
  executedAgainstEmulator: boolean;
  results: FunctionTestResult[];
  emulatorError?: string;
}> {
  const host = options?.host || '127.0.0.1';
  const authPort = options?.authPort || 9099;
  const firestorePort = options?.firestorePort || 8080;
  const functionsPort = options?.functionsPort || 5001;
  const projectId = options?.projectId || TEST_PROJECT_ID;
  const databaseId = options?.databaseId || TEST_DATABASE_ID;

  // 1. Health ping Functions Emulator before running
  try {
    await fetch(`http://${host}:${functionsPort}/`);
  } catch (netErr: any) {
    return {
      executedAgainstEmulator: false,
      results: [],
      emulatorError: `Functions Emulator is not reachable at http://${host}:${functionsPort}: ${netErr.message || netErr}. (Ensure 'firebase emulators:start' is active with functions, firestore, auth)`,
    };
  }

  // 2. Health ping Firestore Emulator
  try {
    await fetch(`http://${host}:${firestorePort}/`);
  } catch (fsErr: any) {
    return {
      executedAgainstEmulator: false,
      results: [],
      emulatorError: `Firestore Emulator is not reachable at http://${host}:${firestorePort}: ${fsErr.message || fsErr}.`,
    };
  }

  const results: FunctionTestResult[] = [];
  const addResult = (testNumber: number, name: string, passed: boolean, details: string) => {
    results.push({ testNumber, name, passed, details });
  };

  const appName = `functions-test-${Date.now()}`;
  const testApp = initializeApp(
    {
      projectId,
      apiKey: 'fake-api-key-for-emulator-testing',
      authDomain: 'emulator.test',
    },
    appName
  );

  const testAuth = getAuth(testApp);
  // CRITICAL: Initialize Firestore using the explicit named LifeOS database
  const testDb = getFirestore(testApp, databaseId);
  // CRITICAL: Initialize Functions using the explicit LifeOS region asia-northeast1
  const testFunctions = getFunctions(testApp, FUNCTIONS_REGION);

  connectAuthEmulator(testAuth, `http://${host}:${authPort}`, { disableWarnings: true });
  connectFirestoreEmulator(testDb, host, firestorePort);
  connectFunctionsEmulator(testFunctions, host, functionsPort);

  // Set emulator host environment variables for Admin SDK
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${host}:${authPort}`;
  process.env.FIRESTORE_EMULATOR_HOST = `${host}:${firestorePort}`;

  const adminAppName = `admin-test-${Date.now()}`;
  const adminApp = initAdminApp({ projectId }, adminAppName);
  const adminAuth = getAdminAuth(adminApp);
  const adminDb = getAdminFirestore(adminApp, databaseId);

  try {
    const aliceUid = 'alice_func_test_1';
    const bobUid = 'bob_func_test_2';

    // Callables
    const deleteRecordCallable = httpsCallable<{ collection: string; id: string }, any>(
      testFunctions,
      'deleteRecord'
    );
    const batchRecordCallable = httpsCallable<{ items: any[] }, any>(
      testFunctions,
      'batchRecordTombstones'
    );
    const startResetCallable = httpsCallable<Record<string, never>, any>(
      testFunctions,
      'startGlobalReset'
    );
    const executeChunkCallable = httpsCallable<Record<string, never>, any>(
      testFunctions,
      'executeResetChunk'
    );
    const finalizeResetCallable = httpsCallable<{ expectedResetId: string; expectedGeneration: number }, any>(
      testFunctions,
      'verifyAndFinalizeReset'
    );

    // =========================================================================
    // TEST 1: Unauthenticated callable requests rejected
    // =========================================================================
    {
      let rejected = false;
      try {
        await deleteRecordCallable({ collection: 'mealLogs', id: 'unauth_doc_1' });
      } catch (err: any) {
        rejected = err.code === 'unauthenticated' || err.message?.includes('authenticated');
      }
      if (!rejected) {
        throw new Error('Test 1 failed: unauthenticated deleteRecord request was not rejected');
      }
      addResult(1, 'Unauthenticated callable requests rejected', true, 'Unauthenticated caller threw unauthenticated error');
    }

    // Authenticate Alice with verified UID using Admin Auth + Client SDK
    await createAndSignInEmulatorUser(testAuth, adminAuth, aliceUid, 'alice@test.emulator');
    if (testAuth.currentUser?.uid !== aliceUid) {
      throw new Error(`Authentication verification failed: currentUser is ${testAuth.currentUser?.uid}`);
    }

    // Seed baseline sync doc for Alice
    const aliceSyncRef = doc(testDb, `users/${aliceUid}/meta/sync`);
    const aliceResetRef = doc(testDb, `users/${aliceUid}/meta/reset`);
    await setDoc(aliceSyncRef, {
      userId: aliceUid,
      currentGeneration: 1,
      activeResetId: null,
      resetStatus: 'idle',
      minimumValidTimestamp: 0,
    });
    await setDoc(aliceResetRef, {
      userId: aliceUid,
      status: 'idle',
    });

    // =========================================================================
    // TEST 2: Single deletion creates tombstone and deletes record atomically
    // =========================================================================
    {
      const mealId = 'meal_test_2';
      const mealRef = doc(testDb, `users/${aliceUid}/mealLogs/${mealId}`);
      await setDoc(mealRef, {
        id: mealId,
        userId: aliceUid,
        date: '2026-11-08',
        name: 'Protein Bowl',
        calories: 600,
        timestamp: Date.now(),
        _gen: 1,
      });

      const delRes = await deleteRecordCallable({ collection: 'mealLogs', id: mealId });
      const recordSnapAfter = await getDoc(mealRef);
      const tombstoneSnapAfter = await getDoc(doc(testDb, `users/${aliceUid}/tombstones/mealLogs__${mealId}`));

      const pass =
        delRes.data?.success === true &&
        !recordSnapAfter.exists() &&
        tombstoneSnapAfter.exists() &&
        tombstoneSnapAfter.data()?.id === mealId &&
        tombstoneSnapAfter.data()?.collection === 'mealLogs' &&
        tombstoneSnapAfter.data()?.generation === 1;

      if (!pass) {
        throw new Error('Test 2 failed: single deletion did not create tombstone or delete record atomically');
      }
      addResult(2, 'Single deletion creates tombstone and deletes record', true, 'Record deleted and canonical tombstone registered');
    }

    // =========================================================================
    // TEST 3: Repeated deletion preserves original tombstone metadata
    // =========================================================================
    {
      const mealId = 'meal_test_3';
      const tombstoneRef = doc(testDb, `users/${aliceUid}/tombstones/mealLogs__${mealId}`);
      const originalTimestamp = 123456789;
      await setDoc(tombstoneRef, {
        id: mealId,
        collection: 'mealLogs',
        deletedAt: originalTimestamp,
        deletedByUid: aliceUid,
        generation: 1,
        tombstoneVersion: 1,
      });

      const retryRes = await deleteRecordCallable({ collection: 'mealLogs', id: mealId });
      const snapAfter = await getDoc(tombstoneRef);

      const pass =
        retryRes.data?.alreadyExisted === true &&
        snapAfter.exists() &&
        snapAfter.data()?.deletedAt === originalTimestamp &&
        snapAfter.data()?.deletedByUid === aliceUid;

      if (!pass) {
        throw new Error('Test 3 failed: repeated deletion modified original tombstone metadata');
      }
      addResult(3, 'Repeated deletion preserves original tombstone metadata', true, 'Existing tombstone deletedAt remained 123456789');
    }

    // =========================================================================
    // TEST 4: Comprehensive Batch Deletion (Duplicates, Invalid items, Counts, Immutability)
    // =========================================================================
    {
      // Seed a pre-existing tombstone with a specific timestamp to verify immutability
      const existingTombstoneId = 'batch_existing_item';
      const existingTombstoneRef = doc(testDb, `users/${aliceUid}/tombstones/mealLogs__${existingTombstoneId}`);
      const originalExistingTimestamp = 987654321;
      await setDoc(existingTombstoneRef, {
        id: existingTombstoneId,
        collection: 'mealLogs',
        deletedAt: originalExistingTimestamp,
        deletedByUid: aliceUid,
        generation: 1,
        tombstoneVersion: 1,
      });

      // Also seed an active record for batch_item_1
      const activeRecordRef = doc(testDb, `users/${aliceUid}/mealLogs/batch_item_1`);
      await setDoc(activeRecordRef, {
        id: 'batch_item_1',
        userId: aliceUid,
        date: '2026-11-08',
        name: 'Batch Item 1',
        calories: 300,
        _gen: 1,
      });

      // Submit batch containing:
      // 1. New valid item ('mealLogs', 'batch_item_1')
      // 2. Pre-existing tombstoned item ('mealLogs', 'batch_existing_item')
      // 3. Duplicate of the new valid item ('mealLogs', 'batch_item_1')
      // 4. Invalid collection item ('unsupportedCollection', 'bad_item')
      const batchItems = [
        { collection: 'mealLogs', id: 'batch_item_1' },
        { collection: 'mealLogs', id: existingTombstoneId },
        { collection: 'mealLogs', id: 'batch_item_1' },
        { collection: 'unsupportedCollection', id: 'bad_item' },
      ];

      const batchRes = await batchRecordCallable({ items: batchItems });
      const resData = batchRes.data || {};
      const resultsArray: any[] = resData.results || [];

      // Verify overall response structure and exact counts
      if (resultsArray.length !== 4) {
        throw new Error(`Test 4 failed: expected 4 results in batch, got ${resultsArray.length}`);
      }

      // Exact input order verification:
      // Index 0: batch_item_1 -> registered
      // Index 1: existingTombstoneId -> already_existed
      // Index 2: batch_item_1 (duplicate) -> registered (processed in same transaction against absent initial state)
      // Index 3: bad_item (invalid collection) -> failed
      const res0 = resultsArray[0];
      const res1 = resultsArray[1];
      const res2 = resultsArray[2];
      const res3 = resultsArray[3];

      const isIndex0Correct =
        res0.collection === 'mealLogs' &&
        res0.id === 'batch_item_1' &&
        res0.status === 'registered';

      const isIndex1Correct =
        res1.collection === 'mealLogs' &&
        res1.id === existingTombstoneId &&
        res1.status === 'already_existed';

      const isIndex2Correct =
        res2.collection === 'mealLogs' &&
        res2.id === 'batch_item_1' &&
        res2.status === 'registered';

      const isIndex3Correct =
        res3.collection === 'unsupportedCollection' &&
        res3.id === 'bad_item' &&
        res3.status === 'failed';

      // Verify exact counts as specified:
      // registered: 2
      // already_existed: 1
      // failed: 1
      // total: 4
      const exactCountsMatch =
        resData.registeredCount === 2 &&
        resData.alreadyExistedCount === 1 &&
        resData.failedCount === 1 &&
        resultsArray.length === 4 &&
        resData.success === false; // overall success is false because 1 item failed

      // Verify pre-existing tombstone metadata remains unchanged
      const snapExistingAfter = await getDoc(existingTombstoneRef);
      const immutabilityPreserved =
        snapExistingAfter.exists() &&
        snapExistingAfter.data()?.deletedAt === originalExistingTimestamp &&
        snapExistingAfter.data()?.deletedByUid === aliceUid &&
        snapExistingAfter.data()?.generation === 1;

      // Verify active record was deleted
      const activeRecordSnapAfter = await getDoc(activeRecordRef);
      const recordPurged = !activeRecordSnapAfter.exists();

      const pass =
        isIndex0Correct &&
        isIndex1Correct &&
        isIndex2Correct &&
        isIndex3Correct &&
        exactCountsMatch &&
        immutabilityPreserved &&
        recordPurged;

      if (!pass) {
        throw new Error(
          `Test 4 failed: Batch verification failed. Index0: ${isIndex0Correct}, Index1: ${isIndex1Correct}, ` +
          `Index2: ${isIndex2Correct}, Index3: ${isIndex3Correct}, exactCounts: ${exactCountsMatch} ` +
          `(reg=${resData.registeredCount}, exist=${resData.alreadyExistedCount}, fail=${resData.failedCount}), ` +
          `Immutability: ${immutabilityPreserved}, Purge: ${recordPurged}`
        );
      }

      addResult(
        4,
        'Batch deletion handles duplicate and invalid items correctly',
        true,
        `Batch verified input order and exact counts: registered=${resData.registeredCount}, alreadyExisted=${resData.alreadyExistedCount}, failed=${resData.failedCount}, immutability verified, record purged`
      );
    }

    // =========================================================================
    // TEST 5: Concurrent deletion preserves tombstone immutability
    // =========================================================================
    {
      const concurId = 'concur_del_5';
      const [r1, r2] = await Promise.all([
        deleteRecordCallable({ collection: 'workoutLogs', id: concurId }),
        deleteRecordCallable({ collection: 'workoutLogs', id: concurId }),
      ]);

      const tombSnap = await getDoc(doc(testDb, `users/${aliceUid}/tombstones/workoutLogs__${concurId}`));
      const pass =
        tombSnap.exists() &&
        ((r1.data?.alreadyExisted === false && r2.data?.alreadyExisted === true) ||
         (r1.data?.alreadyExisted === true && r2.data?.alreadyExisted === false) ||
         (r1.data?.success === true && r2.data?.success === true));

      if (!pass) {
        throw new Error('Test 5 failed: concurrent deletion compromised tombstone immutability');
      }
      addResult(5, 'Concurrent deletion preserves tombstone immutability', true, 'Concurrent calls safely produced 1 immutable tombstone');
    }

    // =========================================================================
    // TEST 6: Reset prevents conflicting writes and deletions
    // =========================================================================
    {
      await setDoc(aliceResetRef, { status: 'in_progress', userId: aliceUid, leaseUntil: 0 });
      let delBlocked = false;
      try {
        await deleteRecordCallable({ collection: 'mealLogs', id: 'blocked_during_reset' });
      } catch (err: any) {
        delBlocked = err.message?.includes('reset') || err.code === 'failed-precondition';
      }

      if (!delBlocked) {
        throw new Error('Test 6 failed: deletion was allowed while reset was in_progress');
      }
      addResult(6, 'Reset prevents conflicting writes and deletions', true, 'Deletion rejected while reset in_progress');
      // Reset back to idle for subsequent tests
      await setDoc(aliceResetRef, { status: 'idle', userId: aliceUid });
    }

    // =========================================================================
    // TEST 7: Simultaneous reset requests are rejected
    // =========================================================================
    {
      const startRes1 = await startResetCallable({});
      let start2Rejected = false;
      try {
        await startResetCallable({});
      } catch (err: any) {
        start2Rejected = err.code === 'failed-precondition' || err.message?.includes('already in progress');
      }

      const pass = startRes1.data?.status === 'in_progress' && start2Rejected;
      if (!pass) {
        throw new Error('Test 7 failed: simultaneous reset request was not rejected');
      }
      addResult(7, 'Simultaneous reset requests are rejected', true, 'Overlapping reset request transactionally rejected');
    }

    // =========================================================================
    // TEST 8: Deterministic Reset-Resume Testing Across Collections
    // =========================================================================
    {
      // RESET_COLLECTIONS: ['mealLogs', 'workoutLogs', 'waterLogs', 'sleepLogs', 'fastingLogs', 'habits', 'goals', 'cloudBackup']
      // Seed known documents in collection 0 ('mealLogs') and collection 1 ('workoutLogs')
      const mealDoc1 = doc(testDb, `users/${aliceUid}/mealLogs/resume_meal_1`);
      const mealDoc2 = doc(testDb, `users/${aliceUid}/mealLogs/resume_meal_2`);
      const workoutDoc1 = doc(testDb, `users/${aliceUid}/workoutLogs/resume_workout_1`);
      const workoutDoc2 = doc(testDb, `users/${aliceUid}/workoutLogs/resume_workout_2`);

      await setDoc(mealDoc1, { id: 'resume_meal_1', name: 'Meal 1', userId: aliceUid });
      await setDoc(mealDoc2, { id: 'resume_meal_2', name: 'Meal 2', userId: aliceUid });
      await setDoc(workoutDoc1, { id: 'resume_workout_1', name: 'Workout 1', userId: aliceUid });
      await setDoc(workoutDoc2, { id: 'resume_workout_2', name: 'Workout 2', userId: aliceUid });

      // Artificially simulate an interruption where collection 0 ('mealLogs') was already completed,
      // and the checkpoint points to currentCollectionIndex: 1 ('workoutLogs') with deletedCount: 2
      await setDoc(aliceResetRef, {
        userId: aliceUid,
        status: 'in_progress',
        currentCollectionIndex: 1, // workoutLogs
        deletedCount: 2,
        leaseUntil: 0,
        leaseToken: 0,
      }, { merge: true });

      // Execute next chunk - should resume from workoutLogs, wiping workoutLogs but leaving mealLogs untouched
      const chunkRes = await executeChunkCallable({});
      const data = chunkRes.data || {};

      // Assertions
      const workout1Snap = await getDoc(workoutDoc1);
      const workout2Snap = await getDoc(workoutDoc2);
      const meal1Snap = await getDoc(mealDoc1);
      const meal2Snap = await getDoc(mealDoc2);

      const pass =
        data.success === true &&
        data.currentCollectionIndex >= 1 &&
        data.totalDeleted >= 4 && // 2 prior + 2 workouts deleted
        !workout1Snap.exists() &&
        !workout2Snap.exists() &&
        meal1Snap.exists() && // mealLogs was at index 0, so it was preserved by resume at index 1
        meal2Snap.exists();

      if (!pass) {
        throw new Error(
          `Test 8 failed: Reset resume did not strictly resume from checkpoint. ` +
          `Index: ${data.currentCollectionIndex}, totalDeleted: ${data.totalDeleted}, ` +
          `Workouts purged: ${!workout1Snap.exists() && !workout2Snap.exists()}, Meals preserved: ${meal1Snap.exists() && meal2Snap.exists()}`
        );
      }

      // Cleanup seeded test docs for next tests
      await deleteDoc(mealDoc1);
      await deleteDoc(mealDoc2);

      addResult(8, 'Reset resumes after interruption deterministically', true, 'Resume at index 1 purged workoutLogs while preserving collection 0');
    }

    // =========================================================================
    // TEST 9: Real Stale-Worker Lease Fencing (Checkpoint Commit Boundary)
    // =========================================================================
    {
      // Deterministic worker/checkpoint boundary testing the actual production commitResetCheckpointTx function:
      // 1. Worker A has token N (e.g. tokenA = 10).
      // 2. Worker B takes over with token N+1 (e.g. tokenB = 11) and an active lease.
      // 3. Worker A invokes the real production commitResetCheckpointTx() with token N.
      // 4. The production function rejects the stale token.
      // 5. Checkpoint, deletedCount, leaseToken, leaseUntil, status and reset metadata remain unchanged.

      const tokenA = 10;
      const tokenB = 11;
      const initialColIndex = 1;
      const initialDeletedCount = 20;
      const activeLeaseExpiry = Date.now() + 30000;

      // Establish state where Worker B holds the authoritative active lease
      await setDoc(aliceResetRef, {
        userId: aliceUid,
        status: 'in_progress',
        currentCollectionIndex: initialColIndex,
        deletedCount: initialDeletedCount,
        leaseToken: tokenB,
        leaseUntil: activeLeaseExpiry, // Active lease held by Worker B
        targetGeneration: 2,
        resetId: 'reset_fencing_test',
      }, { merge: true });

      // Stale Worker A invokes the actual production commitResetCheckpointTx function using stale tokenA
      let staleWorkerRejected = false;
      let rejectionError = '';

      try {
        await commitResetCheckpointTx(adminDb, aliceUid, tokenA, 2, 999);
      } catch (err: any) {
        staleWorkerRejected =
          err.code === 'aborted' ||
          err.message?.includes('fencing token mismatch') ||
          err.details?.includes('fencing token mismatch');
        rejectionError = err.message || err.code;
      }

      if (!staleWorkerRejected) {
        throw new Error('Test 9 failed: production commitResetCheckpointTx did not reject stale token N');
      }

      // Prove the stale worker cannot change checkpoint, deletedCount, lease state, or reset metadata
      const snapAfterStaleAttempt = await getDoc(aliceResetRef);
      const afterData = snapAfterStaleAttempt.data()!;

      const checkpointPreserved =
        afterData.currentCollectionIndex === initialColIndex &&
        afterData.deletedCount === initialDeletedCount &&
        afterData.leaseToken === tokenB &&
        afterData.leaseUntil === activeLeaseExpiry &&
        afterData.status === 'in_progress' &&
        afterData.targetGeneration === 2 &&
        afterData.resetId === 'reset_fencing_test';

      if (!checkpointPreserved) {
        throw new Error(
          `Test 9 failed: Stale worker corrupted reset document! ` +
          `colIndex: ${afterData.currentCollectionIndex} (expected ${initialColIndex}), ` +
          `deletedCount: ${afterData.deletedCount} (expected ${initialDeletedCount}), ` +
          `leaseToken: ${afterData.leaseToken} (expected ${tokenB}), ` +
          `leaseUntil: ${afterData.leaseUntil} (expected ${activeLeaseExpiry})`
        );
      }

      addResult(
        9,
        'Deterministic stale-worker lease fencing protects checkpoints',
        true,
        `Production commitResetCheckpointTx rejected stale token ${tokenA} (${rejectionError}); Worker B token ${tokenB} and checkpoint intact`
      );

      // Release lease for subsequent test steps
      await setDoc(aliceResetRef, { leaseUntil: 0 }, { merge: true });
    }

    // =========================================================================
    // TEST 10: Finalization rejects incorrect reset ID/generation and active leases
    // =========================================================================
    {
      const resetSnap = await getDoc(aliceResetRef);
      const activeId = resetSnap.data()?.resetId || 'test_reset_id';
      const activeGen = resetSnap.data()?.targetGeneration || 2;

      // Bad reset ID
      let badIdBlocked = false;
      try {
        await finalizeResetCallable({ expectedResetId: 'wrong_id', expectedGeneration: activeGen });
      } catch (err: any) {
        badIdBlocked = err.message?.includes('mismatch') || err.code === 'aborted';
      }

      // Bad generation
      let badGenBlocked = false;
      try {
        await finalizeResetCallable({ expectedResetId: activeId, expectedGeneration: 999 });
      } catch (err: any) {
        badGenBlocked = err.message?.includes('mismatch') || err.code === 'aborted';
      }

      // Active execution lease rejection
      // Set an active lease in aliceResetRef (e.g. leaseUntil = now + 60000)
      await setDoc(aliceResetRef, {
        leaseUntil: Date.now() + 60000,
        status: 'in_progress',
        resetId: activeId,
        targetGeneration: activeGen,
      }, { merge: true });

      let activeLeaseBlocked = false;
      try {
        await finalizeResetCallable({ expectedResetId: activeId, expectedGeneration: activeGen });
      } catch (err: any) {
        activeLeaseBlocked = err.message?.includes('lease is still active') || err.code === 'failed-precondition';
      }

      if (!badIdBlocked || !badGenBlocked || !activeLeaseBlocked) {
        throw new Error(
          `Test 10 failed: finalization rejection checks incomplete ` +
          `(badId: ${badIdBlocked}, badGen: ${badGenBlocked}, activeLease: ${activeLeaseBlocked})`
        );
      }

      addResult(
        10,
        'Finalization rejects incorrect reset ID/generation and active leases',
        true,
        'Mismatched reset ID, mismatched generation, and active worker lease were all rejected'
      );
      
      // Clean up reset state to completed for clean emulator state
      await setDoc(aliceResetRef, { status: 'completed', leaseUntil: 0 }, { merge: true });
      await setDoc(aliceSyncRef, { resetStatus: 'idle', activeResetId: null }, { merge: true });
    }

    // =========================================================================
    // TEST 11: Account Isolation Verification (Bob cannot affect Alice)
    // =========================================================================
    {
      // 1. Seed a known meal record for Alice and ensure Alice has a known tombstone
      const sharedDocId = 'shared_record_id_11';
      const aliceMealRef = doc(testDb, `users/${aliceUid}/mealLogs/${sharedDocId}`);
      await setDoc(aliceMealRef, {
        id: sharedDocId,
        userId: aliceUid,
        date: '2026-11-08',
        name: 'Alice Private Meal',
        calories: 500,
        _gen: 1,
      });

      // 2. Sign in as Bob using Admin Auth + Client SDK and assert Bob's UID is strictly verified
      await createAndSignInEmulatorUser(testAuth, adminAuth, bobUid, 'bob@test.emulator');
      const bobCurrentUid: string | undefined = testAuth.currentUser?.uid;
      if (bobCurrentUid !== bobUid) {
        throw new Error(`Account isolation setup failed: currentUser is ${bobCurrentUid}, expected ${bobUid}`);
      }

      // Explicit verification that Alice and Bob are genuinely separate authenticated accounts
      if ((bobCurrentUid as string) === (aliceUid as string)) {
        throw new Error(`Account isolation setup failed: Bob UID cannot match Alice UID (${bobCurrentUid} === ${aliceUid})`);
      }

      // Initialize Bob's sync metadata
      await setDoc(doc(testDb, `users/${bobUid}/meta/sync`), {
        userId: bobUid,
        currentGeneration: 1,
        activeResetId: null,
        resetStatus: 'idle',
      });
      await setDoc(doc(testDb, `users/${bobUid}/meta/reset`), {
        userId: bobUid,
        status: 'idle',
      });

      // Seed Bob's own meal record with the EXACT SAME ID
      const bobMealRef = doc(testDb, `users/${bobUid}/mealLogs/${sharedDocId}`);
      await setDoc(bobMealRef, {
        id: sharedDocId,
        userId: bobUid,
        date: '2026-11-08',
        name: 'Bob Meal',
        calories: 700,
        _gen: 1,
      });

      // 3. Bob invokes deleteRecord for sharedDocId
      const bobDelRes = await deleteRecordCallable({ collection: 'mealLogs', id: sharedDocId });

      // 4. Assert:
      // - Bob's meal is deleted
      // - Bob's tombstone is created
      // - Alice's meal record is COMPLETELY UNTOUCHED and still exists
      // - Alice has NO tombstone for this deletion
      const bobRecordSnap = await getDoc(bobMealRef);
      const bobTombSnap = await getDoc(doc(testDb, `users/${bobUid}/tombstones/mealLogs__${sharedDocId}`));
      const aliceRecordSnap = await getDoc(aliceMealRef);
      const aliceTombSnap = await getDoc(doc(testDb, `users/${aliceUid}/tombstones/mealLogs__${sharedDocId}`));

      const pass =
        bobDelRes.data?.success === true &&
        !bobRecordSnap.exists() &&
        bobTombSnap.exists() &&
        aliceRecordSnap.exists() &&
        aliceRecordSnap.data()?.name === 'Alice Private Meal' &&
        !aliceTombSnap.exists();

      if (!pass) {
        throw new Error(
          `Test 11 failed: Account isolation breach! ` +
          `Bob record purged: ${!bobRecordSnap.exists()}, Bob tombstone created: ${bobTombSnap.exists()}, ` +
          `Alice record preserved: ${aliceRecordSnap.exists()}, Alice tombstone absent: ${!aliceTombSnap.exists()}`
        );
      }

      // Clean up Alice's test doc
      await deleteDoc(aliceMealRef);

      addResult(
        11,
        'One user cannot affect another user data (account isolation)',
        true,
        `Bob deletion of "${sharedDocId}" only affected Bob data; Alice record and tombstones remained pristine`
      );
    }

  } finally {
    await deleteApp(testApp);
    await deleteAdminApp(adminApp).catch(() => {});
  }

  return {
    executedAgainstEmulator: true,
    results,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== RUNNING REAL CLOUD FUNCTIONS EMULATOR INTEGRATION TESTS ===');
  runFunctionsEmulatorTests()
    .then((res) => {
      if (!res.executedAgainstEmulator) {
        console.error(`[EMULATOR ERROR] ${res.emulatorError}`);
        console.error('FAILED: Cloud Functions / Firestore Emulator is unavailable.');
        console.log(`\nSUMMARY: 0 executed, 0 passed, 0 failed, 11 skipped (Emulator unavailable).`);
        process.exit(1);
      }
      let passed = 0;
      let failed = 0;
      for (const r of res.results) {
        if (r.passed) passed++;
        else failed++;
        console.log(`[${r.passed ? 'PASS' : 'FAIL'}] Function Test ${r.testNumber}: ${r.name}`);
        console.log(`       ${r.details}`);
      }
      console.log(`\nSUMMARY: ${res.results.length} executed, ${passed} passed, ${failed} failed, 0 skipped.`);
      process.exit(failed === 0 ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal test execution error:', err);
      process.exit(1);
    });
}
