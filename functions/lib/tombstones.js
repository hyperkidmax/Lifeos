"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchRecordTombstones = exports.deleteRecord = void 0;
exports.sanitizeRecordId = sanitizeRecordId;
exports.getTombstoneDocId = getTombstoneDocId;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_js_1 = require("./config.js");
function sanitizeRecordId(id) {
    if (!id || typeof id !== 'string' || id.length > 128) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid record ID: must be non-empty string <= 128 chars');
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
        throw new https_1.HttpsError('invalid-argument', 'Record ID must match alphanumeric, underscore, or hyphen');
    }
    return id;
}
function getTombstoneDocId(collection, id) {
    return `${collection}__${sanitizeRecordId(id)}`;
}
// 1. Single record deletion callable function: Transaction-safe, immutable, idempotent
exports.deleteRecord = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to delete records');
    }
    const { collection, id } = request.data;
    if (!collection || !id) {
        throw new https_1.HttpsError('invalid-argument', 'Missing collection or id parameter');
    }
    if (!config_js_1.SUPPORTED_COLLECTIONS.includes(collection)) {
        throw new https_1.HttpsError('invalid-argument', `Unsupported collection: ${collection}`);
    }
    const cleanId = sanitizeRecordId(id);
    const tombstoneDocId = getTombstoneDocId(collection, cleanId);
    const syncRef = config_js_1.adminDb.doc(`users/${uid}/meta/sync`);
    const resetRef = config_js_1.adminDb.doc(`users/${uid}/meta/reset`);
    const tombstoneRef = config_js_1.adminDb.doc(`users/${uid}/tombstones/${tombstoneDocId}`);
    const recordRef = config_js_1.adminDb.doc(`users/${uid}/${collection}/${cleanId}`);
    const txResult = await config_js_1.adminDb.runTransaction(async (tx) => {
        // 1. Check if global reset is currently active
        const resetSnap = await tx.get(resetRef);
        if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
            throw new https_1.HttpsError('failed-precondition', 'Global reset is currently in progress; writes and deletions are paused');
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
            deletedAt: firestore_1.FieldValue.serverTimestamp(),
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
exports.batchRecordTombstones = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { items } = request.data;
    if (!Array.isArray(items) || items.length === 0) {
        return { success: true, registeredCount: 0, alreadyExistedCount: 0, failedItems: [] };
    }
    // Enforce safe ceiling of 250 items per RPC call
    if (items.length > 250) {
        throw new https_1.HttpsError('invalid-argument', 'Batch size exceeds maximum limit of 250 items');
    }
    const syncRef = config_js_1.adminDb.doc(`users/${uid}/meta/sync`);
    const resetRef = config_js_1.adminDb.doc(`users/${uid}/meta/reset`);
    const validated = [];
    // Process validated items in atomic, transactional chunks of up to 100 items (200 ops per transaction <= 500 limit).
    // CRITICAL CONCURRENCY FIX: Read reset status and server sync generation INSIDE EACH TRANSACTION.
    // This guarantees that if a global reset starts while a batch is in flight, the transaction immediately
    // detects reset status === 'in_progress', aborts tombstone creation, and prevents stale generation writes.
    // NOTE: Pre-allocate results array by input index to preserve strict input ordering across all items.
    const results = new Array(items.length);
    // Fill in already-failed items
    for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        if (!item || typeof item !== 'object') {
            results[idx] = {
                collection: item?.collection || 'unknown',
                id: item?.id || 'unknown',
                status: 'failed',
                error: 'Item is not an object',
            };
        }
        else if (!item.collection || !config_js_1.SUPPORTED_COLLECTIONS.includes(item.collection)) {
            results[idx] = {
                collection: item.collection || 'unknown',
                id: item.id || 'unknown',
                status: 'failed',
                error: `Unsupported collection: ${item.collection}`,
            };
        }
        else {
            try {
                const cleanId = sanitizeRecordId(item.id);
                const tombstoneDocId = getTombstoneDocId(item.collection, cleanId);
                validated.push({
                    inputIndex: idx,
                    rawCollection: item.collection,
                    rawId: item.id,
                    cleanId,
                    collection: item.collection,
                    tombstoneDocId,
                });
            }
            catch (e) {
                results[idx] = {
                    collection: item.collection,
                    id: item.id,
                    status: 'failed',
                    error: e.message || 'Invalid record ID',
                };
            }
        }
    }
    let registeredCount = 0;
    let alreadyExistedCount = 0;
    let finalObservedGen = 1;
    const CHUNK_SIZE = 100;
    for (let i = 0; i < validated.length; i += CHUNK_SIZE) {
        const chunk = validated.slice(i, i + CHUNK_SIZE);
        try {
            const chunkResults = await config_js_1.adminDb.runTransaction(async (tx) => {
                // 1. Transactionally read reset status
                const resetSnap = await tx.get(resetRef);
                if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
                    throw new https_1.HttpsError('failed-precondition', 'Global reset is in progress; writes and deletions are paused');
                }
                // 2. Transactionally read authoritative current generation
                const syncSnap = await tx.get(syncRef);
                const currentGen = syncSnap.exists ? (syncSnap.data()?.currentGeneration || 1) : 1;
                finalObservedGen = currentGen;
                // 3. Transactionally inspect existing tombstones
                const tombstoneRefs = chunk.map((v) => config_js_1.adminDb.doc(`users/${uid}/tombstones/${v.tombstoneDocId}`));
                const tombstoneSnaps = await tx.getAll(...tombstoneRefs);
                const subResults = [];
                chunk.forEach((v, idx) => {
                    const snap = tombstoneSnaps[idx];
                    const tombstoneRef = tombstoneRefs[idx];
                    const recordRef = config_js_1.adminDb.doc(`users/${uid}/${v.collection}/${v.cleanId}`);
                    if (snap.exists) {
                        // Existing tombstone found: NEVER overwrite original deletion metadata!
                        // Ensure record document is deleted (idempotent purge)
                        tx.delete(recordRef);
                        subResults.push({
                            inputIndex: v.inputIndex,
                            res: {
                                collection: v.rawCollection,
                                id: v.rawId,
                                status: 'already_existed',
                            },
                        });
                    }
                    else {
                        // Create brand new immutable tombstone with transactionally locked currentGen
                        tx.set(tombstoneRef, {
                            id: v.cleanId,
                            collection: v.collection,
                            deletedAt: firestore_1.FieldValue.serverTimestamp(),
                            deletedByUid: uid,
                            generation: currentGen,
                            tombstoneVersion: 1,
                        });
                        tx.delete(recordRef);
                        subResults.push({
                            inputIndex: v.inputIndex,
                            res: {
                                collection: v.rawCollection,
                                id: v.rawId,
                                status: 'registered',
                            },
                        });
                    }
                });
                return subResults;
            });
            for (const itemResult of chunkResults) {
                results[itemResult.inputIndex] = itemResult.res;
                if (itemResult.res.status === 'registered')
                    registeredCount++;
                else if (itemResult.res.status === 'already_existed')
                    alreadyExistedCount++;
            }
        }
        catch (chunkError) {
            // If reset is in progress or transaction failed, mark every item in this chunk as failed for client retry
            for (const v of chunk) {
                results[v.inputIndex] = {
                    collection: v.rawCollection,
                    id: v.rawId,
                    status: 'failed',
                    error: chunkError.message || String(chunkError),
                };
            }
        }
    }
    const failedCount = results.filter((r) => r.status === 'failed').length;
    return {
        success: failedCount === 0,
        registeredCount,
        alreadyExistedCount,
        failedCount,
        results,
        generation: finalObservedGen,
    };
});
//# sourceMappingURL=tombstones.js.map