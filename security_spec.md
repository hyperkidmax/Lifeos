# Security Specification & Test Protocol

## 1. Data Invariants & Access Control Matrix
- **User Scoping**: Every user record must be stored under `/users/{userId}` or subcollections where `{userId}` strictly matches `request.auth.uid`.
- **Identity Invariant**: No user can read, list, create, modify, or delete another user's personal health, nutrition, workout, hydration, or journal data.
- **Path Variable Validation**: All `{userId}` and child `{id}` path variables must satisfy `isValidId(id)` (alphanumeric with `-` and `_`, max 128 chars).
- **Temporal & Immutability Integrity**: `userId` field inside records must match the authenticated user and cannot be mutated after creation.
- **Array Size Guarding**: Array fields (tags, readings, completedDates) are capped at strict maximum sizes (<= 50 items).

## 2. The "Dirty Dozen" Vulnerability Payloads

1. **Payload 1: Identity Spoofing (Write to another user's profile)**
   - Target: `/users/victim_user_999`
   - Payload: `{ name: "Attacker", email: "attacker@test.com" }`
   - Expected Result: `PERMISSION_DENIED` (auth.uid mismatch).

2. **Payload 2: Cross-User Subcollection Read**
   - Target: `/users/victim_user_999/waterLogs/log_123`
   - Expected Result: `PERMISSION_DENIED`.

3. **Payload 3: Unauthenticated Access**
   - Target: `/users/any_user_123`
   - Auth: `null`
   - Expected Result: `PERMISSION_DENIED`.

4. **Payload 4: Path Variable Injection / ID Poisoning**
   - Target: `/users/valid_uid/waterLogs/junk%20..%20payload`
   - Expected Result: `PERMISSION_DENIED` (fails `isValidId`).

5. **Payload 5: Oversized ID Attack**
   - Target: `/users/valid_uid/mealLogs/{200_character_string}`
   - Expected Result: `PERMISSION_DENIED` (exceeds 128 char limit).

6. **Payload 6: Cross-Tenant Journal List Scraping**
   - Query: `collectionGroup('journalEntries')`
   - Expected Result: `PERMISSION_DENIED` (catch-all default deny).

7. **Payload 7: Mutating Immutable User ID**
   - Target: `/users/{uid}/waterLogs/log_1`
   - Update Payload: `{ userId: "different_uid" }`
   - Expected Result: `PERMISSION_DENIED`.

8. **Payload 8: Unbounded Array DOS Injection**
   - Target: `/users/{uid}/journalEntries/entry_1`
   - Payload: `{ tags: [array_with_500_strings] }`
   - Expected Result: `PERMISSION_DENIED` (tags length exceeds 30).

9. **Payload 9: Negative Number / Malformed Number Field**
   - Target: `/users/{uid}/waterLogs/log_1`
   - Payload: `{ amountMl: -500 }`
   - Expected Result: `PERMISSION_DENIED` (amountMl must be positive <= 10000).

10. **Payload 10: Excessive String Length Attack**
    - Target: `/users/{uid}/journalEntries/entry_1`
    - Payload: `{ reflection: "a".repeat(50000) }`
    - Expected Result: `PERMISSION_DENIED` (reflection length must be <= 10000).

11. **Payload 11: Shadow Field Injection**
    - Target: `/users/{uid}/waterLogs/log_1`
    - Payload: `{ amountMl: 250, date: "2026-10-29", isAdmin: true }`
    - Expected Result: `PERMISSION_DENIED` (fails key allowlist check).

12. **Payload 12: Catch-All Root Document Write**
    - Target: `/randomRootCollection/malicious_doc`
    - Expected Result: `PERMISSION_DENIED` (global catch-all deny).
