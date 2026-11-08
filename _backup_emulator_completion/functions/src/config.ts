import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Named database ID specifically provisioned for LifeOS in project gen-lang-client-0635319389
export const FIRESTORE_DATABASE_ID = 'ai-studio-lifeospersonalwe-b862082e-4804-4384-8505-6fe6d79e3ac4';

const adminApp = getApps().length === 0 ? initializeApp() : getApps()[0];

// CRITICAL: Initialize Admin Firestore targeting the explicit named database
export const adminDb = getFirestore(adminApp, FIRESTORE_DATABASE_ID);

export const SUPPORTED_COLLECTIONS = [
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
] as const;

export type SupportedCollection = (typeof SUPPORTED_COLLECTIONS)[number];

export const RESET_COLLECTIONS = [
  ...SUPPORTED_COLLECTIONS,
  'goals',
  'cloudBackup',
] as const;

