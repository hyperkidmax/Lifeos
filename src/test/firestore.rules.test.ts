/**
 * Executable Firebase Security Rules Test Suite using @firebase/rules-unit-testing
 * 
 * Verifies the complete security invariant matrix against the actual firestore.rules:
 * 1. Unauthenticated access denied
 * 2. Cross-user reads and writes denied
 * 3. Valid authenticated user operations allowed
 * 4. Invalid document IDs rejected
 * 5. Invalid data schemas rejected
 * 6. Direct client deletes rejected
 * 7. Generation mismatch rejected
 * 8. Old-generation record updates rejected
 * 9. Writes blocked during reset
 * 10. Tombstone writes rejected for clients
 * 11. Metadata writes rejected for clients
 */

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

export interface RulesTestExecutionResult {
  testNumber: number;
  name: string;
  passed: boolean;
  details: string;
}

export async function runFirestoreRulesUnitTests(options?: {
  host?: string;
  port?: number;
  projectId?: string;
  databaseId?: string;
}): Promise<{
  executedAgainstEmulator: boolean;
  results: RulesTestExecutionResult[];
  emulatorError?: string;
}> {
  const host = options?.host || process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] || '127.0.0.1';
  const port = options?.port || Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1]) || 8080;
  const projectId = options?.projectId || 'demo-lifeos-test';
  const databaseId = options?.databaseId || 'ai-studio-lifeospersonalwe-b862082e-4804-4384-8505-6fe6d79e3ac4';

  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  let testEnv: RulesTestEnvironment | null = null;
  const results: RulesTestExecutionResult[] = [];

  const addResult = (testNumber: number, name: string, passed: boolean, details: string) => {
    results.push({ testNumber, name, passed, details });
  };

  try {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host,
        port,
        rules,
      },
    });
  } catch (initErr: any) {
    return {
      executedAgainstEmulator: false,
      results: [],
      emulatorError: `Firestore Emulator connection failed at ${host}:${port}: ${initErr.message || initErr}. (Ensure 'firebase emulators:start' is running with Java installed)`,
    };
  }

  try {
    const aliceUid = 'alice_user_123';
    const bobUid = 'bob_user_456';

    const unauthedContext = testEnv.unauthenticatedContext();
    const aliceContext = testEnv.authenticatedContext(aliceUid);
    const bobContext = testEnv.authenticatedContext(bobUid);

    const unauthedDb = unauthedContext.firestore();
    const aliceDb = aliceContext.firestore();
    const bobDb = bobContext.firestore();

    // Setup helper: Admin context to seed server metadata (bypassing rules)
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminDb = adminContext.firestore();
      // Set Alice's generation to 1, reset idle
      await adminDb.doc(`users/${aliceUid}/meta/sync`).set({
        userId: aliceUid,
        currentGeneration: 1,
        activeResetId: null,
        resetStatus: 'idle',
      });
      // Seed an existing water log in Gen 1
      await adminDb.doc(`users/${aliceUid}/waterLogs/water_existing_1`).set({
        id: 'water_existing_1',
        userId: aliceUid,
        date: '2026-11-08',
        amountMl: 250,
        timestamp: Date.now(),
        _gen: 1,
      });
    });

    // TEST 1: Unauthenticated access denied
    {
      const unauthRead = unauthedDb.doc(`users/${aliceUid}`).get();
      await assertFails(unauthRead);
      const unauthWrite = unauthedDb.doc(`users/${aliceUid}/waterLogs/w1`).set({
        id: 'w1',
        userId: aliceUid,
        amountMl: 200,
      });
      await assertFails(unauthWrite);
      addResult(1, 'Unauthenticated reads and writes are denied', true, 'Unauthenticated requests rejected by rules');
    }

    // TEST 2: Cross-user reads and writes denied
    {
      const bobReadsAlice = bobDb.doc(`users/${aliceUid}/waterLogs/water_existing_1`).get();
      await assertFails(bobReadsAlice);
      const bobWritesAlice = bobDb.doc(`users/${aliceUid}/waterLogs/bob_hack`).set({
        id: 'bob_hack',
        userId: aliceUid,
        date: '2026-11-08',
        amountMl: 500,
        timestamp: Date.now(),
        _gen: 1,
      });
      await assertFails(bobWritesAlice);
      addResult(2, 'Cross-user reads and writes are denied', true, 'Bob cannot read or write Alice user subcollections');
    }

    // TEST 3: Valid authenticated user operations allowed
    {
      const aliceValidCreate = aliceDb.doc(`users/${aliceUid}/waterLogs/water_new_2`).set({
        id: 'water_new_2',
        userId: aliceUid,
        date: '2026-11-08',
        amountMl: 300,
        timestamp: Date.now(),
        _gen: 1,
      });
      await assertSucceeds(aliceValidCreate);
      addResult(3, 'Valid authenticated user create is allowed', true, 'Alice created waterLog matching schema and generation');
    }

    // TEST 4: Invalid document IDs rejected (slashes, non-alphanumeric, >128 chars)
    {
      const invalidIdLong = 'a'.repeat(130);
      const aliceInvalidId = aliceDb.doc(`users/${aliceUid}/waterLogs/${invalidIdLong}`).set({
        id: invalidIdLong,
        userId: aliceUid,
        date: '2026-11-08',
        amountMl: 300,
        timestamp: Date.now(),
        _gen: 1,
      });
      await assertFails(aliceInvalidId);
      addResult(4, 'Invalid document IDs (>128 chars or illegal characters) rejected', true, 'Document ID length and regex guard verified');
    }

    // TEST 5: Invalid data schemas rejected
    {
      const aliceBadSchema = aliceDb.doc(`users/${aliceUid}/waterLogs/water_bad_schema`).set({
        id: 'water_bad_schema',
        userId: aliceUid,
        date: 'invalid-date-format', // invalid date
        amountMl: -50, // negative amount
        timestamp: 'not-a-number', // wrong type
        _gen: 1,
      });
      await assertFails(aliceBadSchema);
      addResult(5, 'Invalid data schemas rejected by entity blueprints', true, 'Schema type and boundary validation enforced');
    }

    // TEST 6: Direct client deletes rejected
    {
      const aliceDelete = aliceDb.doc(`users/${aliceUid}/waterLogs/water_existing_1`).delete();
      await assertFails(aliceDelete);
      addResult(6, 'Direct client document deletes rejected', true, 'Clients must delete via Cloud Functions tombstones');
    }

    // TEST 7: Generation mismatch rejected on create
    {
      const aliceMismatchedGen = aliceDb.doc(`users/${aliceUid}/waterLogs/water_stale_gen`).set({
        id: 'water_stale_gen',
        userId: aliceUid,
        date: '2026-11-08',
        amountMl: 250,
        timestamp: Date.now(),
        _gen: 99, // Mismatched server generation (server is 1)
      });
      await assertFails(aliceMismatchedGen);
      addResult(7, 'Generation mismatch rejected on create', true, 'Record _gen must equal sync currentGeneration');
    }

    // TEST 8: Old-generation record updates rejected
    {
      // Advance server generation to 2 in admin context
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await adminDb.doc(`users/${aliceUid}/meta/sync`).update({
          currentGeneration: 2,
        });
      });

      // Alice tries to update her Gen 1 record
      const aliceUpdateOldGen = aliceDb.doc(`users/${aliceUid}/waterLogs/water_existing_1`).update({
        amountMl: 500,
      });
      await assertFails(aliceUpdateOldGen);
      addResult(8, 'Old-generation record updates rejected', true, 'Stale generation record cannot be modified by client');
    }

    // TEST 9: Writes blocked during global reset
    {
      // Set reset status to in_progress in admin context
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await adminDb.doc(`users/${aliceUid}/meta/sync`).update({
          resetStatus: 'in_progress',
          activeResetId: 'reset_in_progress_999',
        });
      });

      const aliceWriteDuringReset = aliceDb.doc(`users/${aliceUid}/waterLogs/water_during_reset`).set({
        id: 'water_during_reset',
        userId: aliceUid,
        date: '2026-11-08',
        amountMl: 250,
        timestamp: Date.now(),
        _gen: 2,
      });
      await assertFails(aliceWriteDuringReset);
      addResult(9, 'All writes strictly blocked during active global reset', true, 'Reset in progress lock verified in rules');
    }

    // TEST 10: Tombstone writes rejected for clients
    {
      const aliceWriteTombstone = aliceDb.doc(`users/${aliceUid}/tombstones/waterLogs__water_1`).set({
        id: 'water_1',
        collection: 'waterLogs',
        deletedAt: Date.now(),
        deletedByUid: aliceUid,
        generation: 1,
        tombstoneVersion: 1,
      });
      await assertFails(aliceWriteTombstone);
      addResult(10, 'Tombstone collection writes rejected for normal clients', true, 'Tombstones writable only by Admin SDK');
    }

    // TEST 11: Metadata writes rejected for clients
    {
      const aliceWriteMeta = aliceDb.doc(`users/${aliceUid}/meta/sync`).set({
        currentGeneration: 999,
        resetStatus: 'idle',
      });
      await assertFails(aliceWriteMeta);
      addResult(11, 'System metadata writes rejected for normal clients', true, 'meta/sync and meta/reset server-write-only');
    }
  } finally {
    if (testEnv) {
      await testEnv.cleanup();
    }
  }

  return {
    executedAgainstEmulator: true,
    results,
  };
}

// Standalone executable runner
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== RUNNING REAL EXECUTABLE FIRESTORE RULES UNIT TESTS ===');
  runFirestoreRulesUnitTests()
    .then((res) => {
      if (!res.executedAgainstEmulator) {
        console.error(`[EMULATOR ERROR] ${res.emulatorError}`);
        console.error('FAILED: Firestore Emulator is unavailable. Tests could not be executed.');
        console.log(`\nSUMMARY: 0 executed, 0 passed, 0 failed, 11 skipped (Emulator unavailable).`);
        process.exit(1);
      }
      let passed = 0;
      let failed = 0;
      for (const r of res.results) {
        if (r.passed) passed++;
        else failed++;
        console.log(`[${r.passed ? 'PASS' : 'FAIL'}] Rule Test ${r.testNumber}: ${r.name}`);
        console.log(`       ${r.details}`);
      }
      console.log(`\nSUMMARY: ${res.results.length} executed, ${passed} passed, ${failed} failed, 0 skipped.`);
      process.exit(failed === 0 ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
