# Firebase Emulator Integration Testing Guide for LifeOS

This document outlines the setup, architecture, and step-by-step procedure for executing isolated Firebase Emulator integration testing for LifeOS.

---

## 1. Emulator Architecture & Port Configuration

LifeOS is configured in `firebase.json` to bind to the local loopback (`127.0.0.1`):
- **Firebase Auth Emulator**: `127.0.0.1:9099`
- **Cloud Firestore Emulator**: `127.0.0.1:8080` (Database ID: `ai-studio-lifeospersonalwe-b862082e-4804-4384-8505-6fe6d79e3ac4`)
- **Cloud Functions Emulator**: `127.0.0.1:5001` (Region: `asia-northeast1`)
- **Emulator UI**: Disabled (`"ui": { "enabled": false }`)

---

## 2. Accidental Production Connection Prevention

Production safety is enforced at the SDK initialization level:
1. **Explicit Gate**: `src/services/firebase.ts` connects to emulators **only** when explicitly instructed via:
   - Environment variable: `VITE_USE_FIREBASE_EMULATOR=true`
   - Test global flag: `window.__USE_FIREBASE_EMULATOR__ = true`
   - Process environment: `USE_FIREBASE_EMULATOR=true`
2. **Default-to-Production Safety**: Without one of these explicit flags, all standard application builds and dev servers connect only to the designated Firebase cloud endpoints configured in `firebase-applet-config.json`.
3. **No Localhost in Bundles**: Production Vite bundles do not contain active emulator URLs.

---

## 3. Prerequisites for Running Live Emulators

The Firebase CLI requires the **Java Runtime Environment (JRE 11+)** to execute the local Firestore and Storage emulators:
- Verify Java installation:
  ```bash
  java -version
  ```
- If Java is not installed (e.g. standard Node-only container):
  - On Debian/Ubuntu: `apt-get update && apt-get install -y default-jre`
  - On macOS: `brew install openjdk`

---

## 4. Starting the Firebase Emulators

To start the isolated local emulator suite:
```bash
firebase emulators:start --only auth,firestore,functions
```

Expected startup logs:
```
✔  emulators: Starting emulators: auth, firestore, functions
✔  auth: Auth Emulator logging to auth-debug.log
✔  auth: Auth Emulator running at 127.0.0.1:9099
✔  firestore: Firestore Emulator logging to firestore-debug.log
✔  firestore: Firestore Emulator running at 127.0.0.1:8080
✔  functions: Functions Emulator logging to functions-debug.log
✔  functions: Functions Emulator running at 127.0.0.1:5001
```

---

## 5. Running the Test Suites

### A. Pure Unit & Invariant Test Suite (No Emulator Daemon Required)
Runs all 74 deterministic conflict, generation, provenance, and isolation tests:
```bash
npm test
# Equivalent to: npx tsx src/test/dataIntegrity.test.ts
```

### B. Firestore Rules Unit Tests (Requires Running Firestore Emulator)
Tests all security rules using `@firebase/rules-unit-testing`:
```bash
npm run test:rules
# Equivalent to: npx tsx src/test/firestore.rules.test.ts
```
What it verifies:
1. Unauthenticated reads and writes are denied.
2. Cross-user reads and writes are denied.
3. Valid authenticated user operations are allowed.
4. Document IDs >128 characters or containing illegal characters are rejected.
5. Invalid schemas (negative numbers, malformed dates) are rejected.
6. Direct client document deletes are rejected.
7. Generation mismatch on create is rejected.
8. Old-generation record updates are rejected.
9. Writes are strictly blocked while global reset is `in_progress`.
10. Writes to `/tombstones` are rejected for normal clients.
11. Writes to `/meta/sync` and `/meta/reset` are rejected for normal clients.

### C. Cloud Functions Integration Tests (Requires Running Functions & Firestore Emulators)
Tests callable Cloud Functions against the local runtime:
```bash
npm run test:emulator
# Equivalent to: npx tsx src/test/functions.emulator.test.ts
```

### D. Clear Emulator State
Wipes all documents from the test emulator database between runs:
```bash
npm run test:emulator:clean
```

---

## 6. How to Confirm No Production Service is Contacted

1. **Host Verification**: Inspect network requests in the terminal or test output; all calls target `127.0.0.1:8080`, `127.0.0.1:9099`, or `127.0.0.1:5001`.
2. **Project ID Isolation**: The rules test suite initializes with an isolated dummy project ID (`lifeos-rules-test-project`), ensuring Cloud Firestore production projects cannot match or accept requests.
3. **No Auth Tokens**: The test harness uses synthetic emulator auth tokens generated locally via `@firebase/rules-unit-testing`, which Google production endpoints reject immediately with `401 Unauthorized`.
