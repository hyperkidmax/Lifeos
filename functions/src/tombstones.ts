import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, SUPPORTED_COLLECTIONS, SupportedCollection } from './config';

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
    throw new HttpsError('invalid-argument', 'Invalid record ID');
  }
  if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
    throw new HttpsError('invalid-argument', 'Record ID must match alphanumeric, underscore, or hyphen');
  }
  return id;
}

export function getTombstoneDocId(collection: string, id: string): string {
  return `${collection}__${sanitizeRecordId(id)}`;
}

// 1. Single record deletion callable function
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

  // Read current sync generation
  const syncRef = adminDb.doc(`users/${uid}/meta/sync`);
  const syncSnap = await syncRef.get();
  const currentGen = syncSnap.exists ? (syncSnap.data()?.currentGeneration || 1) : 1;

  // Check if reset is in progress
  const resetRef = adminDb.doc(`users/${uid}/meta/reset`);
  const resetSnap = await resetRef.get();
  if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
    throw new HttpsError('failed-precondition', 'Global reset is currently in progress; writes and deletions are paused');
  }

  const tombstoneRef = adminDb.doc(`users/${uid}/tombstones/${tombstoneDocId}`);
  const recordRef = adminDb.doc(`users/${uid}/${collection}/${cleanId}`);

  // Atomic batch commit: create immutable tombstone and delete entity doc
  const batch = adminDb.batch();
  batch.set(
    tombstoneRef,
    {
      id: cleanId,
      collection,
      deletedAt: FieldValue.serverTimestamp(),
      deletedByUid: uid,
      generation: currentGen,
      tombstoneVersion: 1,
    },
    { merge: true }
  );
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
export const batchRecordTombstones = onCall({ region: 'asia-northeast1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { items } = request.data as BatchTombstonesRequest;
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, registeredCount: 0 };
  }

  if (items.length > 400) {
    throw new HttpsError('invalid-argument', 'Batch size exceeds maximum limit of 400');
  }

  const syncRef = adminDb.doc(`users/${uid}/meta/sync`);
  const syncSnap = await syncRef.get();
  const currentGen = syncSnap.exists ? (syncSnap.data()?.currentGeneration || 1) : 1;

  const resetRef = adminDb.doc(`users/${uid}/meta/reset`);
  const resetSnap = await resetRef.get();
  if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
    throw new HttpsError('failed-precondition', 'Global reset in progress');
  }

  const batch = adminDb.batch();
  let registeredCount = 0;

  for (const item of items) {
    if (!item.collection || !item.id) continue;
    if (!SUPPORTED_COLLECTIONS.includes(item.collection as SupportedCollection)) continue;

    const cleanId = sanitizeRecordId(item.id);
    const tombstoneDocId = getTombstoneDocId(item.collection, cleanId);
    const tombstoneRef = adminDb.doc(`users/${uid}/tombstones/${tombstoneDocId}`);
    const recordRef = adminDb.doc(`users/${uid}/${item.collection}/${cleanId}`);

    batch.set(
      tombstoneRef,
      {
        id: cleanId,
        collection: item.collection,
        deletedAt: FieldValue.serverTimestamp(),
        deletedByUid: uid,
        generation: currentGen,
        tombstoneVersion: 1,
      },
      { merge: true }
    );
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
