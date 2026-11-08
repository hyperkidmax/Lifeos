"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAndFinalizeReset = exports.executeResetChunk = exports.startGlobalReset = exports.getSyncGeneration = void 0;
exports.commitResetCheckpointTx = commitResetCheckpointTx;
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
    // Transactionally advance generation and lock client writes only if no reset is currently in_progress
    const txResult = await config_js_1.adminDb.runTransaction(async (tx) => {
        const resetDoc = await tx.get(resetRef);
        if (resetDoc.exists && resetDoc.data()?.status === 'in_progress') {
            const activeData = resetDoc.data();
            throw new https_1.HttpsError('failed-precondition', `A global reset is already in progress (resetId: ${activeData.resetId || 'unknown'}). Overlapping resets are rejected to preserve resumability.`);
        }
        const syncDoc = await tx.get(syncRef);
        if (syncDoc.exists && syncDoc.data()?.resetStatus === 'in_progress') {
            throw new https_1.HttpsError('failed-precondition', 'A global reset is already active according to sync metadata. Overlapping resets are rejected.');
        }
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
            leaseToken: 0,
        });
        return { nextGen, resetId };
    });
    return {
        success: true,
        resetId: txResult.resetId,
        newGeneration: txResult.nextGen,
        status: 'in_progress',
    };
});
// Helper: Testable transactional checkpoint commit with lease fencing token verification.
// Verifies that a worker's leaseToken is still valid and unexpired before modifying checkpoint or reset metadata.
async function commitResetCheckpointTx(db, uid, assignedLeaseToken, colIndex, totalDeleted) {
    const resetRef = db.doc(`users/${uid}/meta/reset`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(resetRef);
        if (!snap.exists) {
            throw new https_1.HttpsError('aborted', 'Reset state document was deleted');
        }
        const cur = snap.data();
        if (cur.leaseToken !== assignedLeaseToken) {
            throw new https_1.HttpsError('aborted', `Reset lease fencing token mismatch (held: ${assignedLeaseToken}, current: ${cur.leaseToken}); another worker took over`);
        }
        if (cur.leaseUntil < Date.now()) {
            throw new https_1.HttpsError('deadline-exceeded', 'Reset execution lease expired before checkpoint could be committed');
        }
        tx.update(resetRef, {
            currentCollectionIndex: colIndex,
            deletedCount: totalDeleted,
            leaseUntil: 0,
            lastChunkProcessedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
}
// 3. Execute Reset Chunk: Transactional lease locking, fencing token validation, checkpointing, preserving tombstones
exports.executeResetChunk = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const resetRef = config_js_1.adminDb.doc(`users/${uid}/meta/reset`);
    // Transactionally acquire a 30-second execution lease with a monotonically increasing leaseToken (fencing token)
    const now = Date.now();
    let resetData;
    let assignedLeaseToken = 0;
    try {
        const acquireResult = await config_js_1.adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(resetRef);
            if (!snap.exists || snap.data()?.status !== 'in_progress') {
                throw new https_1.HttpsError('failed-precondition', 'No active reset in progress');
            }
            const d = snap.data();
            if (d.leaseUntil && d.leaseUntil > now) {
                throw new https_1.HttpsError('failed-precondition', 'Another reset chunk is currently executing; please retry shortly');
            }
            const nextToken = (d.leaseToken || 0) + 1;
            tx.update(resetRef, {
                leaseUntil: now + 30000,
                leaseToken: nextToken,
                lastLeaseAcquiredAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return { data: d, token: nextToken };
        });
        resetData = acquireResult.data;
        assignedLeaseToken = acquireResult.token;
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
        // Fencing token verification: Transactionally verify this worker still holds the valid leaseToken
        // before committing checkpoint and releasing the lease
        await commitResetCheckpointTx(config_js_1.adminDb, uid, assignedLeaseToken, colIndex, totalDeleted);
        return {
            success: true,
            chunkDeleted,
            totalDeleted,
            currentCollectionIndex: colIndex,
            isFinished,
            leaseToken: assignedLeaseToken,
            status: isFinished ? 'verifying' : 'in_progress',
        };
    }
    catch (err) {
        // Release lease on error only if our assigned leaseToken is still active
        try {
            await config_js_1.adminDb.runTransaction(async (tx) => {
                const snap = await tx.get(resetRef);
                if (snap.exists && snap.data()?.leaseToken === assignedLeaseToken) {
                    tx.update(resetRef, { leaseUntil: 0 });
                }
            });
        }
        catch {
            // Ignore cleanup error
        }
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('internal', err.message || 'Reset chunk processing failed');
    }
});
exports.verifyAndFinalizeReset = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { expectedResetId, expectedGeneration } = (request.data || {});
    // Enforce that expectedResetId and expectedGeneration are MANDATORY parameters
    if (!expectedResetId || typeof expectedResetId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Missing or invalid expectedResetId: client must provide the authoritative active reset ID');
    }
    if (typeof expectedGeneration !== 'number' || !Number.isInteger(expectedGeneration) || expectedGeneration < 1) {
        throw new https_1.HttpsError('invalid-argument', 'Missing or invalid expectedGeneration: client must provide the authoritative target generation');
    }
    const resetRef = config_js_1.adminDb.doc(`users/${uid}/meta/reset`);
    const syncRef = config_js_1.adminDb.doc(`users/${uid}/meta/sync`);
    // Step A: Pre-check collection emptiness across all target reset collections
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
    // Clear standalone cloudBackup/latest document explicitly if present
    try {
        await config_js_1.adminDb.doc(`users/${uid}/cloudBackup/latest`).delete();
    }
    catch {
        // Ignore if not present
    }
    // Step B: Transactionally verify and finalize reset metadata atomically with sync metadata
    const finalResult = await config_js_1.adminDb.runTransaction(async (tx) => {
        const resetSnap = await tx.get(resetRef);
        if (!resetSnap.exists) {
            throw new https_1.HttpsError('failed-precondition', 'No reset document found');
        }
        const resetData = resetSnap.data();
        // 1. Verify reset status is strictly "in_progress"
        if (resetData.status !== 'in_progress') {
            throw new https_1.HttpsError('failed-precondition', `Reset document is in state "${resetData.status}", not "in_progress"`);
        }
        // 2. Verify expected reset ID matches the active reset document
        if (resetData.resetId !== expectedResetId) {
            throw new https_1.HttpsError('aborted', `Reset ID mismatch (expected: ${expectedResetId}, active: ${resetData.resetId})`);
        }
        // 3. Verify target generation matches the active reset document
        if (resetData.targetGeneration !== expectedGeneration) {
            throw new https_1.HttpsError('aborted', `Reset generation mismatch (expected: ${expectedGeneration}, active: ${resetData.targetGeneration})`);
        }
        // 4. Verify no execution lease is currently active (worker chunk running)
        const now = Date.now();
        if (resetData.leaseUntil && resetData.leaseUntil > now) {
            throw new https_1.HttpsError('failed-precondition', 'Cannot finalize reset while an execution chunk lease is still active');
        }
        // 5. Verify sync metadata still points to this exact reset
        const syncSnap = await tx.get(syncRef);
        if (!syncSnap.exists) {
            throw new https_1.HttpsError('failed-precondition', 'Sync metadata document does not exist');
        }
        const syncData = syncSnap.data();
        if (syncData.activeResetId !== resetData.resetId) {
            throw new https_1.HttpsError('aborted', `Sync metadata points to a different reset (sync: ${syncData.activeResetId}, reset: ${resetData.resetId})`);
        }
        if (syncData.resetStatus !== 'in_progress') {
            throw new https_1.HttpsError('aborted', `Sync metadata resetStatus is "${syncData.resetStatus}", expected "in_progress"`);
        }
        // 6. Atomically finalize reset document and clear sync reset status
        tx.update(resetRef, {
            status: 'completed',
            completedAt: firestore_1.FieldValue.serverTimestamp(),
            verifiedZeroRemaining: true,
            leaseUntil: 0,
        });
        tx.update(syncRef, {
            activeResetId: null,
            resetStatus: 'idle',
            generationEstablishedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return {
            targetGeneration: resetData.targetGeneration,
            totalDeleted: resetData.deletedCount || 0,
            resetId: resetData.resetId,
        };
    });
    return {
        success: true,
        status: 'completed',
        resetId: finalResult.resetId,
        newGeneration: finalResult.targetGeneration,
        totalDeleted: finalResult.totalDeleted,
    };
});
//# sourceMappingURL=reset.js.map