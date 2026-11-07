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
        throw new https_1.HttpsError('invalid-argument', 'Invalid record ID');
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
        throw new https_1.HttpsError('invalid-argument', 'Record ID must match alphanumeric, underscore, or hyphen');
    }
    return id;
}
function getTombstoneDocId(collection, id) {
    return `${collection}__${sanitizeRecordId(id)}`;
}
// 1. Single record deletion callable function
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
    // Read current sync generation
    const syncRef = config_1.adminDb.doc(`users/${uid}/meta/sync`);
    const syncSnap = await syncRef.get();
    const currentGen = syncSnap.exists ? (syncSnap.data()?.currentGeneration || 1) : 1;
    // Check if reset is in progress
    const resetRef = config_1.adminDb.doc(`users/${uid}/meta/reset`);
    const resetSnap = await resetRef.get();
    if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
        throw new https_1.HttpsError('failed-precondition', 'Global reset is currently in progress; writes and deletions are paused');
    }
    const tombstoneRef = config_1.adminDb.doc(`users/${uid}/tombstones/${tombstoneDocId}`);
    const recordRef = config_1.adminDb.doc(`users/${uid}/${collection}/${cleanId}`);
    // Atomic batch commit: create immutable tombstone and delete entity doc
    const batch = config_1.adminDb.batch();
    batch.set(tombstoneRef, {
        id: cleanId,
        collection,
        deletedAt: firestore_1.FieldValue.serverTimestamp(),
        deletedByUid: uid,
        generation: currentGen,
        tombstoneVersion: 1,
    }, { merge: true });
    batch.delete(recordRef);
    await batch.commit();
    return {
        success: true,
        tombstoneId: tombstoneDocId,
        generation: currentGen,
        collection,
        id: cleanId,
    };
});
// 2. Batch tombstones registration (for offline synchronization queue)
exports.batchRecordTombstones = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { items } = request.data;
    if (!Array.isArray(items) || items.length === 0) {
        return { success: true, registeredCount: 0 };
    }
    if (items.length > 400) {
        throw new https_1.HttpsError('invalid-argument', 'Batch size exceeds maximum limit of 400');
    }
    const syncRef = config_1.adminDb.doc(`users/${uid}/meta/sync`);
    const syncSnap = await syncRef.get();
    const currentGen = syncSnap.exists ? (syncSnap.data()?.currentGeneration || 1) : 1;
    const resetRef = config_1.adminDb.doc(`users/${uid}/meta/reset`);
    const resetSnap = await resetRef.get();
    if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
        throw new https_1.HttpsError('failed-precondition', 'Global reset in progress');
    }
    const batch = config_1.adminDb.batch();
    let registeredCount = 0;
    for (const item of items) {
        if (!item.collection || !item.id)
            continue;
        if (!config_1.SUPPORTED_COLLECTIONS.includes(item.collection))
            continue;
        const cleanId = sanitizeRecordId(item.id);
        const tombstoneDocId = getTombstoneDocId(item.collection, cleanId);
        const tombstoneRef = config_1.adminDb.doc(`users/${uid}/tombstones/${tombstoneDocId}`);
        const recordRef = config_1.adminDb.doc(`users/${uid}/${item.collection}/${cleanId}`);
        batch.set(tombstoneRef, {
            id: cleanId,
            collection: item.collection,
            deletedAt: firestore_1.FieldValue.serverTimestamp(),
            deletedByUid: uid,
            generation: currentGen,
            tombstoneVersion: 1,
        }, { merge: true });
        batch.delete(recordRef);
        registeredCount++;
    }
    await batch.commit();
    return {
        success: true,
        registeredCount,
        generation: currentGen,
    };
});
//# sourceMappingURL=tombstones.js.map