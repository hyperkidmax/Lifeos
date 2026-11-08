"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchRecordTombstones = exports.deleteRecord = void 0;
exports.sanitizeRecordId = sanitizeRecordId;
exports.getTombstoneDocId = getTombstoneDocId;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("./config");
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
    if (!config_1.SUPPORTED_COLLECTIONS.includes(collection)) {
        throw new https_1.HttpsError('invalid-argument', `Unsupported collection: ${collection}`);
    }
    const cleanId = sanitizeRecordId(id);
    const tombstoneDocId = getTombstoneDocId(collection, cleanId);
    const syncRef = config_1.adminDb.doc(`users/${uid}/meta/sync`);
    const resetRef = config_1.adminDb.doc(`users/${uid}/meta/reset`);
    const tombstoneRef = config_1.adminDb.doc(`users/${uid}/tombstones/${tombstoneDocId}`);
    const recordRef = config_1.adminDb.doc(`users/${uid}/${collection}/${cleanId}`);
    const txResult = await config_1.adminDb.runTransaction(async (tx) => {
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
    const syncRef = config_1.adminDb.doc(`users/${uid}/meta/sync`);
    const resetRef = config_1.adminDb.doc(`users/${uid}/meta/reset`);
    const [syncSnap, resetSnap] = await Promise.all([syncRef.get(), resetRef.get()]);
    if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
        throw new https_1.HttpsError('failed-precondition', 'Global reset is in progress');
    }
    const currentGen = syncSnap.exists ? (syncSnap.data()?.currentGeneration || 1) : 1;
    const validated = [];
    const failedItems = [];
    for (const item of items) {
        if (!item || typeof item !== 'object') {
            failedItems.push({ item, reason: 'Item is not an object' });
            continue;
        }
        if (!item.collection || !config_1.SUPPORTED_COLLECTIONS.includes(item.collection)) {
            failedItems.push({ item, reason: `Unsupported collection: ${item.collection}` });
            continue;
        }
        try {
            const cleanId = sanitizeRecordId(item.id);
            const tombstoneDocId = getTombstoneDocId(item.collection, cleanId);
            validated.push({
                cleanId,
                collection: item.collection,
                tombstoneDocId,
            });
        }
        catch (e) {
            failedItems.push({ item, reason: e.message || 'Invalid record ID' });
        }
    }
    let registeredCount = 0;
    let alreadyExistedCount = 0;
    // Chunk validated items into batches of 200 items (max 400 writes, staying under 500-write limit)
    const CHUNK_SIZE = 200;
    for (let i = 0; i < validated.length; i += CHUNK_SIZE) {
        const chunk = validated.slice(i, i + CHUNK_SIZE);
        const tombstoneRefs = chunk.map((v) => config_1.adminDb.doc(`users/${uid}/tombstones/${v.tombstoneDocId}`));
        // Efficiently inspect existing tombstones in one roundtrip
        const snaps = await config_1.adminDb.getAll(...tombstoneRefs);
        const existingSet = new Set();
        snaps.forEach((s) => {
            if (s.exists) {
                existingSet.add(s.id);
            }
        });
        const batch = config_1.adminDb.batch();
        for (const v of chunk) {
            const tombstoneRef = config_1.adminDb.doc(`users/${uid}/tombstones/${v.tombstoneDocId}`);
            const recordRef = config_1.adminDb.doc(`users/${uid}/${v.collection}/${v.cleanId}`);
            if (existingSet.has(v.tombstoneDocId)) {
                // Never overwrite existing tombstone metadata; only ensure record document is purged
                batch.delete(recordRef);
                alreadyExistedCount++;
            }
            else {
                batch.set(tombstoneRef, {
                    id: v.cleanId,
                    collection: v.collection,
                    deletedAt: firestore_1.FieldValue.serverTimestamp(),
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
//# sourceMappingURL=tombstones.js.map