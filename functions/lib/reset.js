"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAndFinalizeReset = exports.executeResetChunk = exports.startGlobalReset = exports.getSyncGeneration = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_js_1 = require("./config.js");
// 1. Get current generation or initialize baseline Generation 1
exports.getSyncGeneration = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const syncRef = config_js_1.adminDb.doc(`users/${uid}/meta/sync`);
    const syncSnap = await syncRef.get();
    if (!syncSnap.exists) {
        const initialMeta = {
            userId: uid,
            currentGeneration: 1,
            generationEstablishedAt: firestore_1.FieldValue.serverTimestamp(),
            activeResetId: null,
            resetStatus: 'idle',
            minimumValidTimestamp: 0,
        };
        await syncRef.set(initialMeta);
        return {
            currentGeneration: 1,
            activeResetId: null,
            resetStatus: 'idle',
        };
    }
    const data = syncSnap.data();
    const resetSnap = await config_js_1.adminDb.doc(`users/${uid}/meta/reset`).get();
    const resetData = resetSnap.exists ? resetSnap.data() : null;
    return {
        currentGeneration: data.currentGeneration || 1,
        activeResetId: data.activeResetId || null,
        resetStatus: resetData?.status || 'idle',
    };
});
// 2. Start Global Reset (Increments Generation, locks writes, initializes checkpoint)
exports.startGlobalReset = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const resetId = 'reset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const syncRef = config_js_1.adminDb.doc(`users/${uid}/meta/sync`);
    const resetRef = config_js_1.adminDb.doc(`users/${uid}/meta/reset`);
    // Transactionally advance generation and lock client writes
    const newGeneration = await config_js_1.adminDb.runTransaction(async (tx) => {
        const syncDoc = await tx.get(syncRef);
        const currentGen = syncDoc.exists ? (syncDoc.data()?.currentGeneration || 1) : 1;
        const nextGen = currentGen + 1;
        tx.set(syncRef, {
            userId: uid,
            currentGeneration: nextGen,
            generationEstablishedAt: firestore_1.FieldValue.serverTimestamp(),
            activeResetId: resetId,
            resetStatus: 'in_progress',
            minimumValidTimestamp: Date.now(),
        }, { merge: true });
        tx.set(resetRef, {
            userId: uid,
            resetId,
            status: 'in_progress',
            startedAt: firestore_1.FieldValue.serverTimestamp(),
            completedAt: null,
            targetGeneration: nextGen,
            currentCollectionIndex: 0,
            deletedCount: 0,
            leaseUntil: 0,
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
// 3. Execute Reset Chunk: Transactional lease locking, checkpointing, preserving tombstones
exports.executeResetChunk = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const resetRef = config_js_1.adminDb.doc(`users/${uid}/meta/reset`);
    // Transactionally acquire a 30-second execution lease to prevent race conditions from concurrent chunk requests
    const now = Date.now();
    let resetData;
    try {
        resetData = await config_js_1.adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(resetRef);
            if (!snap.exists || snap.data()?.status !== 'in_progress') {
                throw new https_1.HttpsError('failed-precondition', 'No active reset in progress');
            }
            const d = snap.data();
            if (d.leaseUntil && d.leaseUntil > now) {
                throw new https_1.HttpsError('failed-precondition', 'Another reset chunk is currently executing; please retry shortly');
            }
            tx.update(resetRef, {
                leaseUntil: now + 30000,
                lastLeaseAcquiredAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return d;
        });
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('internal', err.message || 'Failed to acquire reset lock');
    }
    // Collections to wipe includes all log collections, goals, and cloudBackup.
    // CRITICAL: tombstones are strictly EXCLUDED so permanent protection against stale devices remains active.
    const collectionsToWipe = config_js_1.RESET_COLLECTIONS;
    let colIndex = resetData.currentCollectionIndex || 0;
    let chunkDeleted = 0;
    const CHUNK_LIMIT = 400;
    try {
        while (colIndex < collectionsToWipe.length && chunkDeleted < CHUNK_LIMIT) {
            const colName = collectionsToWipe[colIndex];
            const remainingBudget = CHUNK_LIMIT - chunkDeleted;
            const querySnap = await config_js_1.adminDb
                .collection(`users/${uid}/${colName}`)
                .limit(remainingBudget)
                .get();
            if (querySnap.empty) {
                // Also wipe standalone cloudBackup/latest document if inspecting cloudBackup
                if (colName === 'cloudBackup') {
                    try {
                        await config_js_1.adminDb.doc(`users/${uid}/cloudBackup/latest`).delete();
                    }
                    catch {
                        // Ignore if missing
                    }
                }
                colIndex++;
                continue;
            }
            const batch = config_js_1.adminDb.batch();
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
        // Release lease and commit new checkpoint
        await resetRef.update({
            currentCollectionIndex: colIndex,
            deletedCount: totalDeleted,
            leaseUntil: 0,
            lastChunkProcessedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            chunkDeleted,
            totalDeleted,
            currentCollectionIndex: colIndex,
            isFinished,
            status: isFinished ? 'verifying' : 'in_progress',
        };
    }
    catch (err) {
        // Release lease on error so subsequent attempts are not blocked
        await resetRef.update({ leaseUntil: 0 }).catch(() => { });
        throw new https_1.HttpsError('internal', err.message || 'Reset chunk processing failed');
    }
});
// 4. Verify and Finalize Reset: Must verify all target collections are empty before completion
exports.verifyAndFinalizeReset = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const resetRef = config_js_1.adminDb.doc(`users/${uid}/meta/reset`);
    const resetSnap = await resetRef.get();
    if (!resetSnap.exists) {
        throw new https_1.HttpsError('failed-precondition', 'No reset document found');
    }
    const resetData = resetSnap.data();
    const collectionsToCheck = config_js_1.RESET_COLLECTIONS;
    let totalRemaining = 0;
    for (const colName of collectionsToCheck) {
        const countSnap = await config_js_1.adminDb.collection(`users/${uid}/${colName}`).count().get();
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
    // Clear standalone cloudBackup/latest document explicitly
    try {
        await config_js_1.adminDb.doc(`users/${uid}/cloudBackup/latest`).delete();
    }
    catch {
        // Ignore if not present
    }
    // Finalize reset
    await resetRef.update({
        status: 'completed',
        completedAt: firestore_1.FieldValue.serverTimestamp(),
        verifiedZeroRemaining: true,
        leaseUntil: 0,
    });
    const syncRef = config_js_1.adminDb.doc(`users/${uid}/meta/sync`);
    await syncRef.update({
        activeResetId: null,
        resetStatus: 'idle',
    });
    return {
        success: true,
        status: 'completed',
        newGeneration: resetData.targetGeneration,
        totalDeleted: resetData.deletedCount,
    };
});
//# sourceMappingURL=reset.js.map