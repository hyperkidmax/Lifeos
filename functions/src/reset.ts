import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, SUPPORTED_COLLECTIONS } from './config';

// 1. Get current generation or initialize baseline Generation 1
export const getSyncGeneration = onCall({ region: 'asia-northeast1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const syncRef = adminDb.doc(`users/${uid}/meta/sync`);
  const syncSnap = await syncRef.get();

  if (!syncSnap.exists) {
    const initialMeta = {
      userId: uid,
      currentGeneration: 1,
      generationEstablishedAt: FieldValue.serverTimestamp(),
      activeResetId: null,
      minimumValidTimestamp: 0,
    };
    await syncRef.set(initialMeta);
    return {
      currentGeneration: 1,
      activeResetId: null,
      status: 'active',
    };
  }

  const data = syncSnap.data()!;
  const resetSnap = await adminDb.doc(`users/${uid}/meta/reset`).get();
  const resetData = resetSnap.exists ? resetSnap.data() : null;

  return {
    currentGeneration: data.currentGeneration || 1,
    activeResetId: data.activeResetId || null,
    resetStatus: resetData?.status || 'idle',
  };
});

// 2. Start Global Reset (Increments Generation, locks writes)
export const startGlobalReset = onCall({ region: 'asia-northeast1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const resetId = 'reset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const syncRef = adminDb.doc(`users/${uid}/meta/sync`);
  const resetRef = adminDb.doc(`users/${uid}/meta/reset`);

  // Transactionally advance generation and set reset marker
  const newGeneration = await adminDb.runTransaction(async (tx) => {
    const syncDoc = await tx.get(syncRef);
    const currentGen = syncDoc.exists ? (syncDoc.data()?.currentGeneration || 1) : 1;
    const nextGen = currentGen + 1;

    tx.set(
      syncRef,
      {
        userId: uid,
        currentGeneration: nextGen,
        generationEstablishedAt: FieldValue.serverTimestamp(),
        activeResetId: resetId,
        minimumValidTimestamp: Date.now(),
      },
      { merge: true }
    );

    tx.set(resetRef, {
      userId: uid,
      resetId,
      status: 'in_progress',
      startedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      targetGeneration: nextGen,
      currentCollectionIndex: 0,
      deletedCount: 0,
    });

    return nextGen;
  });

  return {
    success: true,
    resetId,
    newGeneration,
    status: 'in_progress',
  };
});

// 3. Execute Reset Chunk (Synchronous batch within function execution window)
export const executeResetChunk = onCall({ region: 'asia-northeast1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const resetRef = adminDb.doc(`users/${uid}/meta/reset`);
  const resetSnap = await resetRef.get();
  if (!resetSnap.exists || resetSnap.data()?.status !== 'in_progress') {
    throw new HttpsError('failed-precondition', 'No active reset in progress');
  }

  const resetData = resetSnap.data()!;
  const collectionsToWipe = [...SUPPORTED_COLLECTIONS, 'cloudBackup', 'tombstones'];
  let colIndex = resetData.currentCollectionIndex || 0;
  let chunkDeleted = 0;
  const CHUNK_LIMIT = 400;

  while (colIndex < collectionsToWipe.length && chunkDeleted < CHUNK_LIMIT) {
    const colName = collectionsToWipe[colIndex];
    const remainingBudget = CHUNK_LIMIT - chunkDeleted;

    const querySnap = await adminDb
      .collection(`users/${uid}/${colName}`)
      .limit(remainingBudget)
      .get();

    if (querySnap.empty) {
      colIndex++;
      continue;
    }

    const batch = adminDb.batch();
    querySnap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
    chunkDeleted += querySnap.size;

    if (querySnap.size < remainingBudget) {
      colIndex++;
    }
  }

  const isFinished = colIndex >= collectionsToWipe.length;
  const totalDeleted = (resetData.deletedCount || 0) + chunkDeleted;

  await resetRef.update({
    currentCollectionIndex: colIndex,
    deletedCount: totalDeleted,
    lastChunkProcessedAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    chunkDeleted,
    totalDeleted,
    currentCollectionIndex: colIndex,
    isFinished,
    status: isFinished ? 'verifying' : 'in_progress',
  };
});

// 4. Verify and Finalize Reset
export const verifyAndFinalizeReset = onCall({ region: 'asia-northeast1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const resetRef = adminDb.doc(`users/${uid}/meta/reset`);
  const resetSnap = await resetRef.get();
  if (!resetSnap.exists) {
    throw new HttpsError('failed-precondition', 'No reset document found');
  }

  const resetData = resetSnap.data()!;
  const collectionsToCheck = [...SUPPORTED_COLLECTIONS, 'cloudBackup', 'tombstones'];
  let totalRemaining = 0;

  for (const colName of collectionsToCheck) {
    const countSnap = await adminDb.collection(`users/${uid}/${colName}`).count().get();
    totalRemaining += countSnap.data().count;
  }

  if (totalRemaining > 0) {
    return {
      success: false,
      status: 'in_progress',
      remainingDocuments: totalRemaining,
      message: 'Documents still remaining; execute additional reset chunks',
    };
  }

  // Clear cloudBackup/latest explicitly if it was a standalone document
  try {
    await adminDb.doc(`users/${uid}/cloudBackup/latest`).delete();
  } catch {
    // Ignore if not present
  }

  // Finalize reset
  await resetRef.update({
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    verifiedZeroRemaining: true,
  });

  const syncRef = adminDb.doc(`users/${uid}/meta/sync`);
  await syncRef.update({
    activeResetId: null,
  });

  return {
    success: true,
    status: 'completed',
    newGeneration: resetData.targetGeneration,
    totalDeleted: resetData.deletedCount,
  };
});
