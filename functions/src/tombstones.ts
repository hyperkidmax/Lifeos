import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, SUPPORTED_COLLECTIONS, SupportedCollection } from './config.js';

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

export interface BatchTombstoneItemResult {
  collection: string;
  id: string;
  status: 'registered' | 'already_existed' | 'failed';
  error?: string;
}

export function sanitizeRecordId(id: string): string {
  if (!id || typeof id !== 'string' || id.length > 128) {
    throw new HttpsError('invalid-argument', 'Invalid record ID: must be non-empty string <= 128 chars');
  }
  if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
    throw new HttpsError('invalid-argument', 'Record ID must match alphanumeric, underscore, or hyphen');
  }
  return id;
}

export function getTombstoneDocId(collection: string, id: string): string {
  return `${collection}__${sanitizeRecordId(id)}`;
}

// 1. Single record deletion callable function: Transaction-safe, immutable, idempotent
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

  const syncRef = adminDb.doc(`users/${uid}/meta/sync`);
  const resetRef = adminDb.doc(`users/${uid}/meta/reset`);
  const tombstoneRef = adminDb.doc(`users/${uid}/tombstones/${tombstoneDocId}`);
  const recordRef = adminDb.doc(`users/${uid}/${collection}/${cleanId}`);

  const txResult = await adminDb.runTransaction(async (tx) => {
    // 1. Check if global reset is currently active
    const resetSnap = await tx.get(resetRef);
    if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
      throw new HttpsError(
        'failed-precondition',
        'Global reset is currently in progress; writes and deletions are paused'
      );
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
      deletedAt: FieldValue.serverTimestamp(),
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
export const batchRecordTombstones = onCall({ region: 'asia-northeast1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { items } = request.data as BatchTombstonesRequest;
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, registeredCount: 0, alreadyExistedCount: 0, failedItems: [] };
  }

  // Enforce safe ceiling of 250 items per RPC call
  if (items.length > 250) {
    throw new HttpsError('invalid-argument', 'Batch size exceeds maximum limit of 250 items');
  }

  const syncRef = adminDb.doc(`users/${uid}/meta/sync`);
  const resetRef = adminDb.doc(`users/${uid}/meta/reset`);

  const [syncSnap, resetSnap] = await Promise.all([syncRef.get(), resetRef.get()]);
  if (resetSnap.exists && resetSnap.data()?.status === 'in_progress') {
    throw new HttpsError('failed-precondition', 'Global reset is in progress');
  }

  const currentGen = syncSnap.exists ? (syncSnap.data()?.currentGeneration || 1) : 1;

  // Validate items up-front while tracking per-item status
  const results: BatchTombstoneItemResult[] = [];

  interface ValidatedItem {
    rawCollection: string;
    rawId: string;
    cleanId: string;
    collection: SupportedCollection;
    tombstoneDocId: string;
  }

  const validated: ValidatedItem[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      results.push({
        collection: (item as any)?.collection || 'unknown',
        id: (item as any)?.id || 'unknown',
        status: 'failed',
        error: 'Item is not an object',
      });
      continue;
    }
    if (!item.collection || !SUPPORTED_COLLECTIONS.includes(item.collection as SupportedCollection)) {
      results.push({
        collection: item.collection || 'unknown',
        id: item.id || 'unknown',
        status: 'failed',
        error: `Unsupported collection: ${item.collection}`,
      });
      continue;
    }
    try {
      const cleanId = sanitizeRecordId(item.id);
      const tombstoneDocId = getTombstoneDocId(item.collection, cleanId);
      validated.push({
        rawCollection: item.collection,
        rawId: item.id,
        cleanId,
        collection: item.collection as SupportedCollection,
        tombstoneDocId,
      });
    } catch (e: any) {
      results.push({
        collection: item.collection,
        id: item.id,
        status: 'failed',
        error: e.message || 'Invalid record ID',
      });
    }
  }

  let registeredCount = 0;
  let alreadyExistedCount = 0;

  // Process validated items in atomic, transactional chunks of up to 100 items (200 ops per transaction <= 500 limit).
  // Using runTransaction with tx.getAll guarantees optimistic concurrency control:
  // If a concurrent worker is registering the same tombstone doc, the transaction serializes cleanly
  // and the second worker observes exists=true, leaving existing metadata completely immutable.
  const CHUNK_SIZE = 100;
  for (let i = 0; i < validated.length; i += CHUNK_SIZE) {
    const chunk = validated.slice(i, i + CHUNK_SIZE);
    try {
      const chunkResults = await adminDb.runTransaction(async (tx) => {
        const tombstoneRefs = chunk.map((v) => adminDb.doc(`users/${uid}/tombstones/${v.tombstoneDocId}`));
        const tombstoneSnaps = await tx.getAll(...tombstoneRefs);

        const subResults: BatchTombstoneItemResult[] = [];

        chunk.forEach((v, idx) => {
          const snap = tombstoneSnaps[idx];
          const tombstoneRef = tombstoneRefs[idx];
          const recordRef = adminDb.doc(`users/${uid}/${v.collection}/${v.cleanId}`);

          if (snap.exists) {
            // Existing tombstone found: NEVER overwrite original deletion metadata!
            // Ensure record document is deleted (idempotent purge)
            tx.delete(recordRef);
            subResults.push({
              collection: v.rawCollection,
              id: v.rawId,
              status: 'already_existed',
            });
          } else {
            // Create brand new immutable tombstone
            tx.set(tombstoneRef, {
              id: v.cleanId,
              collection: v.collection,
              deletedAt: FieldValue.serverTimestamp(),
              deletedByUid: uid,
              generation: currentGen,
              tombstoneVersion: 1,
            });
            tx.delete(recordRef);
            subResults.push({
              collection: v.rawCollection,
              id: v.rawId,
              status: 'registered',
            });
          }
        });

        return subResults;
      });

      for (const res of chunkResults) {
        results.push(res);
        if (res.status === 'registered') registeredCount++;
        else if (res.status === 'already_existed') alreadyExistedCount++;
      }
    } catch (chunkError: any) {
      // If transaction fails after retries, mark every item in this chunk as failed for client retry
      for (const v of chunk) {
        results.push({
          collection: v.rawCollection,
          id: v.rawId,
          status: 'failed',
          error: chunkError.message || String(chunkError),
        });
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
    generation: currentGen,
  };
});
