# Firebase Emulator Integration Testing Guide for LifeOS

This document details the complete configuration, isolation architecture, and execution procedures for the LifeOS Firebase Emulator test harness.

---

## 1. Unified Isolated Test Environment Configuration

All emulator test suites (Auth, Firestore Security Rules, and Cloud Functions) are strictly bound to a single, isolated test project and named database:

- **Isolated Test Project ID**: `demo-lifeos-test`
  *(The `demo-` prefix instructs Firebase SDKs and emulators to never contact Google Cloud or verify billing)*
- **Firestore Named Database**: `ai-studio-lifeospersonalwe-b862082e-4804-4384-8505-6fe6d79e3ac4`
- **Functions Region**: `asia-northeast1`
- **Local Loopback Ports** (configured in `firebase.json`):
  - **Firebase Auth Emulator**: `127.0.0.1:9099`
  - **Cloud Firestore Emulator**: `127.0.0.1:8080`
  - **Cloud Functions Emulator**: `127.0.0.1:5001`
  - **Emulator UI**: Disabled (`"enabled": false`)

---

## 2. Accidental Production Contact Prevention

Production safety is enforced across multiple layers:
1. **Isolated Dummy Project**: All test runs use `demo-lifeos-test`. If any request leaves the local machine, Google Cloud production rejects `demo-*` project requests immediately.
2. **Explicit Client Connection Gate**: In `src/services/firebase.ts`, the frontend SDK connects to local emulators only when explicitly enabled via:
   - `VITE_USE_FIREBASE_EMULATOR=true`
   - `window.__USE_FIREBASE_EMULATOR__ = true`
   - `process.env.USE_FIREBASE_EMULATOR=true`
   Standard production builds never connect to loopback ports.
3. **Synthetic Auth**: Emulator tests use synthetic test accounts created via the local Auth Emulator REST API. No real credentials or Google OAuth tokens are ever used.

---

## 3. Starting the Emulators

### Prerequisites
The Firebase CLI requires the **Java Runtime Environment (JRE 11+)** to run the local Firestore and Storage emulators.
- Check Java:
  ```bash
  java -version
  ```
- Install if missing (Debian/Ubuntu):
  ```bash
  apt-get update && apt-get install -y default-jre
  ```

### Start Command
```bash
firebase emulators:start --only auth,firestore,functions
```

Expected startup logs:
```
✔  emulators: Starting emulators: auth, firestore, functions
✔  auth: Auth Emulator running at 127.0.0.1:9099
✔  firestore: Firestore Emulator running at 127.0.0.1:8080
✔  functions: Functions Emulator running at 127.0.0.1:5001
```

---

## 4. Test Suites and Execution Commands

### Suite 1: Pure Data-Integrity & Conflict-Resolution Suite (74 Tests)
Does not require an active emulator daemon. Verifies deterministic synchronization, tombstone retention, and generation arithmetic:
```bash
npm test
# Equivalent to: npx tsx src/test/dataIntegrity.test.ts
```

### Suite 2: Executable Firestore Security Rules Tests (11 Tests)
Requires the Firestore Emulator to be running at `127.0.0.1:8080`:
```bash
npm run test:rules
# Equivalent to: npx tsx src/test/firestore.rules.test.ts
```
**Tests Verified**:
1. Unauthenticated reads and writes are denied.
2. Cross-user reads and writes are denied.
3. Valid authenticated user operations are allowed.
4. Invalid document IDs (>128 chars / illegal regex) rejected.
5. Invalid data schemas (negative values, malformed dates) rejected.
6. Direct client document deletes rejected.
7. Generation mismatch on create rejected.
8. Old-generation record updates rejected.
9. Writes strictly blocked while global reset is in progress.
10. Writes to `/tombstones` rejected for normal clients.
11. Writes to `/meta/sync` and `/meta/reset` rejected for normal clients.

### Suite 3: Executable Cloud Functions Integration Tests (11 Tests)
Requires Functions, Firestore, and Auth Emulators to be running:
```bash
npm run test:emulator
# Equivalent to: npx tsx src/test/functions.emulator.test.ts
```
**Tests Verified**:
1. Unauthenticated callable requests rejected.
2. Single deletion creates tombstone and deletes record atomically.
3. Repeated deletion preserves original tombstone metadata.
4. Batch deletion handles duplicate and invalid items correctly.
5. Concurrent deletion preserves tombstone immutability.
6. Reset prevents conflicting writes and deletions.
7. Simultaneous reset requests are rejected.
8. Reset resumes after interruption.
9. Stale lease tokens cannot commit checkpoints.
10. Finalization rejects incorrect reset ID/generation and active leases.
11. One user cannot affect another user's data (account isolation).

### Database Cleanup Command
Wipes all documents from the test database (`ai-studio-lifeospersonalwe-b862082e-4804-4384-8505-6fe6d79e3ac4` under `demo-lifeos-test`):
```bash
npm run test:emulator:clean
```

---

## 5. Strict Exit Code Semantics

Both `test:rules` and `test:emulator` adhere to strict CI/CD exit behavior:
- **Emulator Unavailable**: Exits with code `1`. Reports 0 executed, 0 passed, 0 failed, 11 skipped.
- **Assertion Failure**: Exits with code `1`.
- **All Passed**: Exits with code `0`.
- **No False Greens**: A skipped test due to an unreachable daemon will **never** exit with code `0` or claim success.
