"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESET_COLLECTIONS = exports.SUPPORTED_COLLECTIONS = exports.adminDb = exports.FIRESTORE_DATABASE_ID = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// Named database ID specifically provisioned for LifeOS in project gen-lang-client-0635319389
exports.FIRESTORE_DATABASE_ID = 'ai-studio-lifeospersonalwe-b862082e-4804-4384-8505-6fe6d79e3ac4';
const adminApp = (0, app_1.getApps)().length === 0 ? (0, app_1.initializeApp)() : (0, app_1.getApps)()[0];
// CRITICAL: Initialize Admin Firestore targeting the explicit named database
exports.adminDb = (0, firestore_1.getFirestore)(adminApp, exports.FIRESTORE_DATABASE_ID);
exports.SUPPORTED_COLLECTIONS = [
    'mealLogs',
    'waterLogs',
    'workoutLogs',
    'journalEntries',
    'bodyLogs',
    'habits',
    'dailyPriorities',
    'stepLogs',
    'sleepLogs',
    'heartRateLogs',
    'savedFoods',
];
exports.RESET_COLLECTIONS = [
    ...exports.SUPPORTED_COLLECTIONS,
    'goals',
    'cloudBackup',
];
//# sourceMappingURL=config.js.map