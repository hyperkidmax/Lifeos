import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  LifeOSData,
  StepLog,
  SleepLog,
  HeartRateLog,
  WaterLog,
  MealLog,
  FoodItem,
  WorkoutLog,
  Habit,
  DailyPriority,
  JournalEntry,
  BodyMeasurementLog,
  UserProfile,
  Goals,
} from '../types/wellness';
import { EMPTY_INITIAL_STATE, getDemoData, isDemoRecord, filterOutDemoRecords } from '../utils/mockData';
import { getTodayDateString } from '../utils/dateUtils';

import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle as firebaseSignIn,
  signOutFromFirebase as firebaseSignOut,
  syncAndMergeWithCloud,
  saveAllUserRecordsToFirestore,
} from '../services/firebase';

const STORAGE_KEY = 'lifeos_wellness_data_v1';

export type ActiveTab = 'home' | 'health' | 'nutrition' | 'fitness' | 'myday' | 'progress' | 'settings';

export interface SyncToast {
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

interface WellnessContextType {
  data: LifeOSData;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isToday: boolean;

  // Firebase Authentication & Cloud Sync
  currentUser: User | null;
  isAuthLoading: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  syncError: string | null;
  lastSyncedAt: number | null;
  syncToast: SyncToast | null;
  clearSyncToast: () => void;
  isMigrating: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
  migrateLocalData: () => Promise<{
    addedToCloud: number;
    addedToLocal: number;
    totalUploaded: number;
    totalRecords: number;
  } | null>;
  
  // Quick Add Modal state
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  quickAddDefaultTab?: 'water' | 'meal' | 'workout' | 'health' | 'priority';
  openQuickAdd: (tab?: 'water' | 'meal' | 'workout' | 'health' | 'priority') => void;

  // Active workout timer
  activeWorkoutDuration: number;
  isWorkoutTimerRunning: boolean;
  startWorkoutTimer: () => void;
  pauseWorkoutTimer: () => void;
  resetWorkoutTimer: () => void;

  // Health Metrics
  logSteps: (count: number, distanceKm?: number, activeMinutes?: number, notes?: string) => void;
  logSleep: (totalMinutes: number, deep?: number, rem?: number, light?: number, awake?: number, qualityScore?: number, notes?: string) => void;
  logHeartRate: (restingBpm?: number, avgBpm?: number, currentBpm?: number, notes?: string) => void;
  
  // Hydration
  logWater: (amountMl: number) => void;
  removeWaterLog: (id: string) => void;
  clearTodayWater: () => void;

  // Nutrition
  logMeal: (meal: Omit<MealLog, 'id' | 'timestamp'>) => void;
  deleteMeal: (id: string) => void;
  saveFoodTemplate: (food: Omit<FoodItem, 'id'>) => void;
  deleteFoodTemplate: (id: string) => void;

  // Fitness
  logWorkout: (workout: Omit<WorkoutLog, 'id' | 'timestamp'>) => void;
  deleteWorkout: (id: string) => void;

  // Habits
  toggleHabit: (habitId: string, date?: string) => void;
  createHabit: (habit: Omit<Habit, 'id' | 'streak' | 'bestStreak' | 'completedDates'>) => void;
  deleteHabit: (id: string) => void;

  // Priorities
  addPriority: (text: string) => void;
  togglePriority: (id: string) => void;
  deletePriority: (id: string) => void;

  // Journal
  saveJournalEntry: (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => boolean;
  deleteJournalEntry: (id: string) => void;

  // Body progress
  logBodyMeasurement: (log: Omit<BodyMeasurementLog, 'id' | 'timestamp'>) => void;
  deleteBodyMeasurement: (id: string) => void;

  // Settings & Profile & Mode
  isDemoMode: boolean;
  hasDemoRecords: boolean;
  setOperatingMode: (mode: 'real' | 'demo') => void;
  clearDemoDataOnly: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateGoals: (goals: Partial<Goals>) => void;
  loadDemoData: () => void;
  clearAllData: () => void;
  exportDataJson: () => string;
  importDataJson: (
    json: string,
    options?: { mode?: 'merge' | 'replace'; confirmedReplace?: boolean }
  ) => { success: boolean; message: string; importedCount?: number; replaced?: boolean };

  // Computed metrics for selected date
  todaySteps: StepLog | undefined;
  todaySleep: SleepLog | undefined;
  todayHeartRate: HeartRateLog | undefined;
  todayWaterTotal: number;
  todayWaterLogs: WaterLog[];
  todayMeals: MealLog[];
  todayCaloriesConsumed: number;
  todayProteinConsumed: number;
  todayCarbsConsumed: number;
  todayFatConsumed: number;
  todayWorkouts: WorkoutLog[];
  todayActiveCaloriesBurned: number;
  todayHabitsStatus: { habit: Habit; isCompleted: boolean }[];
  todayPriorities: DailyPriority[];
  todayJournal: JournalEntry | undefined;
  latestWeight: BodyMeasurementLog | undefined;
}

const WellnessContext = createContext<WellnessContextType | null>(null);

export const WellnessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<LifeOSData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.version) {
          // Normalize source tag on legacy records if missing, but NEVER delete or mutate personal data
          const normalizeLogs = <T extends { id?: string; source?: any }>(logs: T[] | undefined): T[] => {
            if (!Array.isArray(logs)) return [];
            return logs.map((item) => {
              if (item.source === 'demo' || item.source === 'manual' || item.source === 'sensor' || item.source === 'health_connect') {
                return item;
              }
              // If source is missing, check if it matches known demo signatures from initial test dataset
              if (isDemoRecord(item)) {
                return { ...item, source: 'demo' };
              }
              // If not confirmed as demo, strictly preserve as manual personal data
              return { ...item, source: 'manual' };
            });
          };

          return {
            ...parsed,
            stepLogs: normalizeLogs(parsed.stepLogs),
            sleepLogs: normalizeLogs(parsed.sleepLogs),
            heartRateLogs: normalizeLogs(parsed.heartRateLogs),
            waterLogs: normalizeLogs(parsed.waterLogs),
            mealLogs: normalizeLogs(parsed.mealLogs),
            workoutLogs: normalizeLogs(parsed.workoutLogs),
            habits: normalizeLogs(parsed.habits),
            dailyPriorities: normalizeLogs(parsed.dailyPriorities),
            journalEntries: normalizeLogs(parsed.journalEntries),
            bodyLogs: normalizeLogs(parsed.bodyLogs),
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored LifeOS data, defaulting to clean real mode', e);
    }
    // IMPORTANT: Default to clean Real Mode with empty logs. Never automatically load demo data!
    return EMPTY_INITIAL_STATE;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDefaultTab, setQuickAddDefaultTab] = useState<'water' | 'meal' | 'workout' | 'health' | 'priority' | undefined>('water');

  // Active workout timer
  const [activeWorkoutDuration, setActiveWorkoutDuration] = useState(0);
  const [isWorkoutTimerRunning, setIsWorkoutTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isWorkoutTimerRunning) {
      interval = setInterval(() => {
        setActiveWorkoutDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutTimerRunning]);

  const startWorkoutTimer = () => setIsWorkoutTimerRunning(true);
  const pauseWorkoutTimer = () => setIsWorkoutTimerRunning(false);
  const resetWorkoutTimer = () => {
    setIsWorkoutTimerRunning(false);
    setActiveWorkoutDuration(0);
  };

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
  }, [data]);

  // Keep a mutable ref to current data so async sync callbacks always see the latest records
  const dataRef = useRef<LifeOSData>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Firebase Auth & Cloud Sync States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('offline');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncToast, setSyncToast] = useState<SyncToast | null>(null);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);

  const clearSyncToast = () => setSyncToast(null);

  // Connectivity listener
  useEffect(() => {
    const handleOnline = () => {
      if (currentUser) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        if (!navigator.onLine) {
          setSyncStatus('offline');
          return;
        }
        setSyncStatus('syncing');
        setSyncError(null);
        try {
          const result = await syncAndMergeWithCloud(user.uid, dataRef.current);
          setData(result.mergedData);
          setLastSyncedAt(result.lastSyncedAt);
          setSyncStatus('synced');
        } catch (err: any) {
          console.error('Initial cloud sync error:', err);
          const msg = err?.message || 'Sync failed';
          setSyncStatus('error');
          setSyncError(msg);
        }
      } else {
        setSyncStatus('offline');
        setSyncError(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Background debounced cloud sync when data updates
  useEffect(() => {
    if (!currentUser || !navigator.onLine) return;
    const timer = setTimeout(async () => {
      try {
        setSyncStatus('syncing');
        const res = await saveAllUserRecordsToFirestore(currentUser.uid, dataRef.current);
        setLastSyncedAt(res.lastSyncedAt);
        setSyncStatus('synced');
        setSyncError(null);
      } catch (err: any) {
        console.warn('Background auto-backup failed:', err);
        const msg = err?.message || 'Cloud backup failed';
        setSyncStatus('error');
        setSyncError(msg);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [data, currentUser]);

  // Manual Cloud Sync Function
  const syncWithCloud = async () => {
    if (!currentUser) {
      const msg = 'Please sign in with Google in Settings to enable cloud sync.';
      setSyncToast({ message: msg, type: 'error', timestamp: Date.now() });
      throw new Error(msg);
    }
    if (!navigator.onLine) {
      setSyncStatus('offline');
      const msg = 'Device is offline. Reconnect to internet to sync.';
      setSyncToast({ message: msg, type: 'error', timestamp: Date.now() });
      throw new Error(msg);
    }

    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const result = await syncAndMergeWithCloud(currentUser.uid, dataRef.current);
      setData(result.mergedData);
      setLastSyncedAt(result.lastSyncedAt);
      setSyncStatus('synced');
      setSyncToast({
        message: `Synced ${result.totalUploaded} records to Firestore (/users/${currentUser.uid.slice(0, 8)}.../mealLogs).`,
        type: 'success',
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error('Manual sync failed:', err);
      const msg = err?.message || 'Sync failed';
      setSyncStatus('error');
      setSyncError(msg);
      setSyncToast({
        message: `Firestore Sync Error: ${msg}`,
        type: 'error',
        timestamp: Date.now(),
      });
      throw err;
    }
  };

  // Safe Migration: uploads local records to signed-in user's account without duplicates
  const migrateLocalData = async () => {
    if (!currentUser) {
      const msg = 'Please sign in with Google before migrating local records.';
      setSyncToast({ message: msg, type: 'error', timestamp: Date.now() });
      throw new Error(msg);
    }
    setIsMigrating(true);
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const result = await syncAndMergeWithCloud(currentUser.uid, dataRef.current);
      setData(result.mergedData);
      setLastSyncedAt(result.lastSyncedAt);
      setSyncStatus('synced');
      setSyncToast({
        message: `Migration complete! Wrote ${result.totalUploaded} records to Firestore.`,
        type: 'success',
        timestamp: Date.now(),
      });
      return {
        addedToCloud: result.addedToCloudCount,
        addedToLocal: result.addedToLocalCount,
        totalUploaded: result.totalUploaded,
        totalRecords: result.totalRecords,
      };
    } catch (err: any) {
      console.error('Migration failed:', err);
      const msg = err?.message || 'Migration failed';
      setSyncStatus('error');
      setSyncError(msg);
      setSyncToast({
        message: `Migration Error: ${msg}`,
        type: 'error',
        timestamp: Date.now(),
      });
      throw err;
    } finally {
      setIsMigrating(false);
    }
  };

  const signInWithGoogle = async () => {
    setSyncError(null);
    try {
      await firebaseSignIn();
    } catch (err: any) {
      setSyncError(err?.message || 'Google sign-in was cancelled or failed.');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut();
      setCurrentUser(null);
      setSyncStatus('offline');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const isToday = selectedDate === getTodayDateString();

  const openQuickAdd = (tab?: 'water' | 'meal' | 'workout' | 'health' | 'priority') => {
    setQuickAddDefaultTab(tab || 'water');
    setQuickAddOpen(true);
  };

  // Computed data for selectedDate - in Real Mode (!data.isDemoMode), strictly exclude any demo records
  const todaySteps = useMemo(() => {
    const list = data.isDemoMode ? data.stepLogs : data.stepLogs.filter((s) => !isDemoRecord(s));
    return list.find((s) => s.date === selectedDate);
  }, [data.isDemoMode, data.stepLogs, selectedDate]);

  const todaySleep = useMemo(() => {
    const list = data.isDemoMode ? data.sleepLogs : data.sleepLogs.filter((s) => !isDemoRecord(s));
    return list.find((s) => s.date === selectedDate);
  }, [data.isDemoMode, data.sleepLogs, selectedDate]);

  const todayHeartRate = useMemo(() => {
    const list = data.isDemoMode ? data.heartRateLogs : data.heartRateLogs.filter((h) => !isDemoRecord(h));
    return list.find((h) => h.date === selectedDate);
  }, [data.isDemoMode, data.heartRateLogs, selectedDate]);

  const todayWaterLogs = useMemo(() => {
    const list = data.isDemoMode ? data.waterLogs : data.waterLogs.filter((w) => !isDemoRecord(w));
    return list.filter((w) => w.date === selectedDate);
  }, [data.isDemoMode, data.waterLogs, selectedDate]);

  const todayWaterTotal = useMemo(() => {
    return todayWaterLogs.reduce((acc, curr) => acc + curr.amountMl, 0);
  }, [todayWaterLogs]);

  const todayMeals = useMemo(() => {
    const list = data.isDemoMode ? data.mealLogs : data.mealLogs.filter((m) => !isDemoRecord(m));
    return list.filter((m) => m.date === selectedDate);
  }, [data.isDemoMode, data.mealLogs, selectedDate]);

  const todayCaloriesConsumed = useMemo(() => {
    return todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
  }, [todayMeals]);

  const todayProteinConsumed = useMemo(() => {
    return Math.round(todayMeals.reduce((acc, m) => acc + (m.protein || 0), 0));
  }, [todayMeals]);

  const todayCarbsConsumed = useMemo(() => {
    return Math.round(todayMeals.reduce((acc, m) => acc + (m.carbs || 0), 0));
  }, [todayMeals]);

  const todayFatConsumed = useMemo(() => {
    return Math.round(todayMeals.reduce((acc, m) => acc + (m.fats || 0), 0));
  }, [todayMeals]);

  const todayWorkouts = useMemo(() => {
    const list = data.isDemoMode ? data.workoutLogs : data.workoutLogs.filter((w) => !isDemoRecord(w));
    return list.filter((w) => w.date === selectedDate);
  }, [data.isDemoMode, data.workoutLogs, selectedDate]);

  const todayActiveCaloriesBurned = useMemo(() => {
    const fromWorkouts = todayWorkouts.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);
    const fromSteps = todaySteps?.caloriesBurned || 0;
    return fromWorkouts + fromSteps;
  }, [todayWorkouts, todaySteps]);

  const todayHabitsStatus = useMemo(() => {
    const list = data.isDemoMode ? data.habits : data.habits.filter((h) => !isDemoRecord(h));
    return list.map((h) => ({
      habit: h,
      isCompleted: h.completedDates.includes(selectedDate),
    }));
  }, [data.isDemoMode, data.habits, selectedDate]);

  const todayPriorities = useMemo(() => {
    const list = data.isDemoMode ? data.dailyPriorities : data.dailyPriorities.filter((p) => !isDemoRecord(p));
    return list
      .filter((p) => p.date === selectedDate)
      .sort((a, b) => a.order - b.order);
  }, [data.isDemoMode, data.dailyPriorities, selectedDate]);

  const todayJournal = useMemo(() => {
    const list = data.isDemoMode ? data.journalEntries : data.journalEntries.filter((j) => !isDemoRecord(j));
    return list.find((j) => j.date === selectedDate);
  }, [data.isDemoMode, data.journalEntries, selectedDate]);

  const latestWeight = useMemo(() => {
    const list = data.isDemoMode ? data.bodyLogs : data.bodyLogs.filter((b) => !isDemoRecord(b));
    if (list.length === 0) return undefined;
    return [...list].sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [data.isDemoMode, data.bodyLogs]);

  // Actions
  const logSteps = (count: number, distanceKm?: number, activeMinutes?: number, notes?: string) => {
    const calcDist = distanceKm ?? parseFloat((count * 0.00078).toFixed(2));
    const calcActive = activeMinutes ?? Math.round(count / 110);
    const calcKcal = Math.round(count * 0.045);

    setData((prev) => {
      const existingIdx = prev.stepLogs.findIndex((s) => s.date === selectedDate);
      const newLog: StepLog = {
        id: existingIdx >= 0 ? prev.stepLogs[existingIdx].id : 'step-' + Date.now(),
        date: selectedDate,
        count,
        distanceKm: calcDist,
        activeMinutes: calcActive,
        caloriesBurned: calcKcal,
        timestamp: Date.now(),
        source: 'manual',
        notes,
      };

      const updated = [...prev.stepLogs];
      if (existingIdx >= 0) {
        updated[existingIdx] = newLog;
      } else {
        updated.push(newLog);
      }
      return { ...prev, stepLogs: updated };
    });
  };

  const logSleep = (
    totalMinutes: number,
    deep = Math.round(totalMinutes * 0.2),
    rem = Math.round(totalMinutes * 0.22),
    light = Math.round(totalMinutes * 0.5),
    awake = Math.max(0, totalMinutes - (deep + rem + light)),
    qualityScore = 80,
    notes?: string
  ) => {
    setData((prev) => {
      const existingIdx = prev.sleepLogs.findIndex((s) => s.date === selectedDate);
      const newLog: SleepLog = {
        id: existingIdx >= 0 ? prev.sleepLogs[existingIdx].id : 'sleep-' + Date.now(),
        date: selectedDate,
        totalMinutes,
        stages: {
          deepMinutes: deep,
          remMinutes: rem,
          lightMinutes: light,
          awakeMinutes: awake,
        },
        qualityScore,
        timestamp: Date.now(),
        source: 'manual',
        notes,
      };

      const updated = [...prev.sleepLogs];
      if (existingIdx >= 0) {
        updated[existingIdx] = newLog;
      } else {
        updated.push(newLog);
      }
      return { ...prev, sleepLogs: updated };
    });
  };

  const logHeartRate = (restingBpm?: number, avgBpm?: number, currentBpm?: number, notes?: string) => {
    setData((prev) => {
      const existingIdx = prev.heartRateLogs.findIndex((h) => h.date === selectedDate);
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const currentReadings = existingIdx >= 0 ? prev.heartRateLogs[existingIdx].readings : [];
      const newReadings = currentBpm ? [...currentReadings, { time: nowTime, bpm: currentBpm }] : currentReadings;

      const newLog: HeartRateLog = {
        id: existingIdx >= 0 ? prev.heartRateLogs[existingIdx].id : 'hr-' + Date.now(),
        date: selectedDate,
        restingBpm: restingBpm ?? (existingIdx >= 0 ? prev.heartRateLogs[existingIdx].restingBpm : 60),
        avgBpm: avgBpm ?? (currentBpm || (existingIdx >= 0 ? prev.heartRateLogs[existingIdx].avgBpm : 68)),
        minBpm: 52,
        maxBpm: currentBpm ? Math.max(currentBpm, 140) : 130,
        readings: newReadings,
        timestamp: Date.now(),
        source: 'manual',
        notes,
      };

      const updated = [...prev.heartRateLogs];
      if (existingIdx >= 0) {
        updated[existingIdx] = newLog;
      } else {
        updated.push(newLog);
      }
      return { ...prev, heartRateLogs: updated };
    });
  };

  const logWater = (amountMl: number) => {
    const newEntry: WaterLog = {
      id: 'water-' + Date.now(),
      date: selectedDate,
      amountMl,
      timestamp: Date.now(),
      source: 'manual',
    };
    setData((prev) => ({
      ...prev,
      waterLogs: [...prev.waterLogs, newEntry],
    }));
  };

  const removeWaterLog = (id: string) => {
    setData((prev) => ({
      ...prev,
      waterLogs: prev.waterLogs.filter((w) => w.id !== id),
    }));
  };

  const clearTodayWater = () => {
    setData((prev) => ({
      ...prev,
      waterLogs: prev.waterLogs.filter((w) => w.date !== selectedDate),
    }));
  };

  const logMeal = (meal: Omit<MealLog, 'id' | 'timestamp'>) => {
    const newEntry: MealLog = {
      ...meal,
      id: 'meal-' + Date.now(),
      timestamp: Date.now(),
      source: 'manual',
    };
    setData((prev) => ({
      ...prev,
      mealLogs: [...prev.mealLogs, newEntry],
    }));
  };

  const deleteMeal = (id: string) => {
    setData((prev) => ({
      ...prev,
      mealLogs: prev.mealLogs.filter((m) => m.id !== id),
    }));
  };

  const saveFoodTemplate = (food: Omit<FoodItem, 'id'>) => {
    const newFood: FoodItem = {
      ...food,
      id: 'food-' + Date.now(),
      isSavedTemplate: true,
    };
    setData((prev) => ({
      ...prev,
      savedFoods: [newFood, ...prev.savedFoods],
    }));
  };

  const deleteFoodTemplate = (id: string) => {
    setData((prev) => ({
      ...prev,
      savedFoods: prev.savedFoods.filter((f) => f.id !== id),
    }));
  };

  const logWorkout = (workout: Omit<WorkoutLog, 'id' | 'timestamp'>) => {
    const newEntry: WorkoutLog = {
      ...workout,
      id: 'wo-' + Date.now(),
      timestamp: Date.now(),
      source: 'manual',
    };
    setData((prev) => ({
      ...prev,
      workoutLogs: [newEntry, ...prev.workoutLogs],
    }));
  };

  const deleteWorkout = (id: string) => {
    setData((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.filter((w) => w.id !== id),
    }));
  };

  const toggleHabit = (habitId: string, date = selectedDate) => {
    setData((prev) => {
      const updatedHabits = prev.habits.map((habit) => {
        if (habit.id !== habitId) return habit;
        const exists = habit.completedDates.includes(date);
        let newDates: string[];
        if (exists) {
          newDates = habit.completedDates.filter((d) => d !== date);
        } else {
          newDates = [...habit.completedDates, date];
        }

        // Calculate streak
        const newStreak = exists ? Math.max(0, habit.streak - 1) : habit.streak + 1;
        const newBest = Math.max(habit.bestStreak, newStreak);

        return {
          ...habit,
          completedDates: newDates,
          streak: newStreak,
          bestStreak: newBest,
        };
      });
      return { ...prev, habits: updatedHabits };
    });
  };

  const createHabit = (habit: Omit<Habit, 'id' | 'streak' | 'bestStreak' | 'completedDates'>) => {
    const newHabit: Habit = {
      ...habit,
      id: 'habit-' + Date.now(),
      streak: 0,
      bestStreak: 0,
      completedDates: [],
      source: 'manual',
    };
    setData((prev) => ({
      ...prev,
      habits: [...prev.habits, newHabit],
    }));
  };

  const deleteHabit = (id: string) => {
    setData((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== id),
    }));
  };

  const addPriority = (text: string) => {
    if (!text.trim()) return;
    const newPriority: DailyPriority = {
      id: 'prio-' + Date.now(),
      date: selectedDate,
      text: text.trim(),
      completed: false,
      order: todayPriorities.length + 1,
      source: 'manual',
    };
    setData((prev) => ({
      ...prev,
      dailyPriorities: [...prev.dailyPriorities, newPriority],
    }));
  };

  const togglePriority = (id: string) => {
    setData((prev) => ({
      ...prev,
      dailyPriorities: prev.dailyPriorities.map((p) =>
        p.id === id ? { ...p, completed: !p.completed } : p
      ),
    }));
  };

  const deletePriority = (id: string) => {
    setData((prev) => ({
      ...prev,
      dailyPriorities: prev.dailyPriorities.filter((p) => p.id !== id),
    }));
  };

  const saveJournalEntry = (entry: Omit<JournalEntry, 'id' | 'timestamp'>): boolean => {
    try {
      if (!entry.date) {
        throw new Error('Missing date for journal entry');
      }
      setData((prev) => {
        const existingIdx = prev.journalEntries.findIndex((j) => j.date === entry.date);
        const newEntry: JournalEntry = {
          ...entry,
          id: existingIdx >= 0 ? prev.journalEntries[existingIdx].id : 'j-' + Date.now(),
          timestamp: Date.now(),
          source: 'manual',
        };
        const updated = [...prev.journalEntries];
        if (existingIdx >= 0) {
          updated[existingIdx] = newEntry;
        } else {
          updated.unshift(newEntry);
        }
        const nextState = { ...prev, journalEntries: updated };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        } catch (e) {
          console.error('Failed to sync journal entry to local storage', e);
        }
        return nextState;
      });
      return true;
    } catch (err) {
      console.error('Error saving journal entry', err);
      return false;
    }
  };

  const deleteJournalEntry = (id: string) => {
    setData((prev) => {
      const nextState = {
        ...prev,
        journalEntries: prev.journalEntries.filter((j) => j.id !== id),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {
        console.error('Failed to sync journal deletion to local storage', e);
      }
      return nextState;
    });
  };

  const logBodyMeasurement = (log: Omit<BodyMeasurementLog, 'id' | 'timestamp'>) => {
    const newLog: BodyMeasurementLog = {
      ...log,
      id: 'body-' + Date.now(),
      timestamp: Date.now(),
      source: 'manual',
    };
    setData((prev) => ({
      ...prev,
      bodyLogs: [newLog, ...prev.bodyLogs],
    }));
  };

  const deleteBodyMeasurement = (id: string) => {
    setData((prev) => ({
      ...prev,
      bodyLogs: prev.bodyLogs.filter((b) => b.id !== id),
    }));
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setData((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...profile },
    }));
  };

  const updateGoals = (goals: Partial<Goals>) => {
    setData((prev) => ({
      ...prev,
      goals: { ...prev.goals, ...goals },
    }));
  };

  const hasDemoRecords = useMemo(() => {
    return (
      data.stepLogs.some(isDemoRecord) ||
      data.sleepLogs.some(isDemoRecord) ||
      data.heartRateLogs.some(isDemoRecord) ||
      data.waterLogs.some(isDemoRecord) ||
      data.mealLogs.some(isDemoRecord) ||
      data.workoutLogs.some(isDemoRecord) ||
      data.habits.some(isDemoRecord) ||
      data.dailyPriorities.some(isDemoRecord) ||
      data.journalEntries.some(isDemoRecord) ||
      data.bodyLogs.some(isDemoRecord)
    );
  }, [data]);

  const clearDemoDataOnly = () => {
    setData((prev) => {
      const nextState: LifeOSData = filterOutDemoRecords(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {
        console.error('Failed to sync cleared demo data to local storage', e);
      }
      return nextState;
    });
  };

  const loadDemoData = () => {
    const demo = getDemoData();
    setData((prev) => {
      // Preserve any real manual records; clean out existing demo records first
      const realSteps = prev.stepLogs.filter((s) => !isDemoRecord(s));
      const realSleep = prev.sleepLogs.filter((s) => !isDemoRecord(s));
      const realHeartRate = prev.heartRateLogs.filter((h) => !isDemoRecord(h));
      const realWater = prev.waterLogs.filter((w) => !isDemoRecord(w));
      const realMeals = prev.mealLogs.filter((m) => !isDemoRecord(m));
      const realWorkouts = prev.workoutLogs.filter((w) => !isDemoRecord(w));
      const realHabits = prev.habits.filter((h) => !isDemoRecord(h));
      const realPriorities = prev.dailyPriorities.filter((p) => !isDemoRecord(p));
      const realJournal = prev.journalEntries.filter((j) => !isDemoRecord(j));
      const realBody = prev.bodyLogs.filter((b) => !isDemoRecord(b));

      const nextState: LifeOSData = {
        ...prev,
        isDemoMode: true,
        stepLogs: [...realSteps, ...demo.stepLogs],
        sleepLogs: [...realSleep, ...demo.sleepLogs],
        heartRateLogs: [...realHeartRate, ...demo.heartRateLogs],
        waterLogs: [...realWater, ...demo.waterLogs],
        mealLogs: [...realMeals, ...demo.mealLogs],
        workoutLogs: [...realWorkouts, ...demo.workoutLogs],
        habits: [...realHabits, ...demo.habits],
        dailyPriorities: [...realPriorities, ...demo.dailyPriorities],
        journalEntries: [...realJournal, ...demo.journalEntries],
        bodyLogs: [...realBody, ...demo.bodyLogs],
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {
        console.error('Failed to sync demo data to storage', e);
      }
      return nextState;
    });
  };

  const setOperatingMode = (mode: 'real' | 'demo') => {
    if (mode === 'real') {
      setData((prev) => {
        // Purge synthetic demo records from active local state while strictly preserving
        // all genuine manual, sensor, imported, and legacy personal records.
        const nextState = filterOutDemoRecords(prev);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        } catch (e) {
          console.error('Failed to sync operating mode', e);
        }
        return nextState;
      });
    } else {
      loadDemoData();
    }
  };

  const clearAllData = () => {
    setData({
      ...EMPTY_INITIAL_STATE,
      isDemoMode: false,
    });
  };

  const exportDataJson = () => {
    return JSON.stringify(data, null, 2);
  };

  // REPAIR 2: Safe JSON Backup and Restore
  // Validates structure and schema version, creates local snapshot before restoring,
  // preserves genuine records, filters demo data, assigns 'import' provenance only when needed,
  // and supports safe non-destructive merging by default.
  const importDataJson = (
    json: string,
    options: { mode?: 'merge' | 'replace'; confirmedReplace?: boolean } = {}
  ): { success: boolean; message: string; importedCount?: number; replaced?: boolean } => {
    const mode = options.mode || 'merge';

    try {
      if (!json || typeof json !== 'string' || !json.trim()) {
        return { success: false, message: 'Import failed: Empty or blank JSON payload provided.' };
      }

      // 1. Validate JSON syntax
      let parsed: any;
      try {
        parsed = JSON.parse(json);
      } catch (err: any) {
        return { success: false, message: `JSON syntax error: ${err.message || 'Invalid JSON format'}` };
      }

      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'Import failed: Root JSON payload must be an object.' };
      }

      // 2. Validate schema and required root objects
      if (!parsed.profile || typeof parsed.profile !== 'object') {
        return { success: false, message: 'Import failed: Missing required "profile" configuration in backup.' };
      }
      if (!parsed.goals || typeof parsed.goals !== 'object') {
        return { success: false, message: 'Import failed: Missing required "goals" configuration in backup.' };
      }

      // Check version compatibility (support version 1 and future backward-compatible integers)
      if (parsed.version !== undefined && (typeof parsed.version !== 'number' || parsed.version < 1)) {
        return { success: false, message: `Import failed: Unsupported schema version (${parsed.version}). Expected >= 1.` };
      }

      // 3. Create recoverable snapshot of current local storage data before any modification
      try {
        const currentBackup = localStorage.getItem(STORAGE_KEY);
        if (currentBackup) {
          localStorage.setItem(`${STORAGE_KEY}_pre_restore_snapshot`, currentBackup);
        }
      } catch (snapshotErr) {
        console.warn('Could not write pre-restore snapshot to localStorage:', snapshotErr);
      }

      // 4. Sanitize and normalize incoming logs:
      // - Filter out any positively confirmed demo records
      // - Preserve genuine historical provenance ('manual', 'sensor', 'health_connect', 'sensor_disconnected')
      // - Stamp 'import' only if the incoming record is genuine and has no existing provenance
      const sanitizeImportList = <T extends { id: string; source?: any }>(
        list: T[] | undefined
      ): T[] => {
        if (!Array.isArray(list)) return [];
        const clean: T[] = [];
        for (const item of list) {
          if (!item || typeof item !== 'object' || !item.id) continue;
          if (isDemoRecord(item)) continue; // Never import synthetic demo records into user data

          // Preserve existing valid provenance, or assign 'import' if unassigned
          let source = item.source;
          if (!source || (source !== 'manual' && source !== 'sensor' && source !== 'health_connect' && source !== 'sensor_disconnected' && source !== 'import')) {
            source = 'import';
          }

          clean.push({
            ...item,
            source,
          });
        }
        return clean;
      };

      const importedSteps = sanitizeImportList<StepLog>(parsed.stepLogs);
      const importedSleep = sanitizeImportList<SleepLog>(parsed.sleepLogs);
      const importedHr = sanitizeImportList<HeartRateLog>(parsed.heartRateLogs);
      const importedWater = sanitizeImportList<WaterLog>(parsed.waterLogs);
      const importedMeals = sanitizeImportList<MealLog>(parsed.mealLogs);
      const importedWorkouts = sanitizeImportList<WorkoutLog>(parsed.workoutLogs);
      const importedHabits = sanitizeImportList<Habit>(parsed.habits);
      const importedPriorities = sanitizeImportList<DailyPriority>(parsed.dailyPriorities);
      const importedJournal = sanitizeImportList<JournalEntry>(parsed.journalEntries);
      const importedBodyLogs = sanitizeImportList<BodyMeasurementLog>(parsed.bodyLogs);
      const importedSavedFoods: FoodItem[] = Array.isArray(parsed.savedFoods)
        ? parsed.savedFoods.filter((f: any) => f && f.id && !isDemoRecord(f))
        : [];

      const totalImportableLogs =
        importedSteps.length +
        importedSleep.length +
        importedHr.length +
        importedWater.length +
        importedMeals.length +
        importedWorkouts.length +
        importedHabits.length +
        importedPriorities.length +
        importedJournal.length +
        importedBodyLogs.length;

      // 5. Apply Restore: Either Replace (requires explicit confirmation) or Safe Merge (default)
      if (mode === 'replace') {
        if (!options.confirmedReplace) {
          return {
            success: false,
            message: 'Complete replacement requires explicit user confirmation to prevent accidental data loss.',
          };
        }

        const nextState: LifeOSData = {
          version: parsed.version || 1,
          isDemoMode: false,
          profile: {
            ...EMPTY_INITIAL_STATE.profile,
            ...data.profile,
            ...parsed.profile,
          },
          goals: {
            ...EMPTY_INITIAL_STATE.goals,
            ...data.goals,
            ...parsed.goals,
          },
          stepLogs: importedSteps,
          sleepLogs: importedSleep,
          heartRateLogs: importedHr,
          waterLogs: importedWater,
          mealLogs: importedMeals,
          savedFoods: importedSavedFoods.length > 0 ? importedSavedFoods : data.savedFoods,
          workoutLogs: importedWorkouts,
          habits: importedHabits,
          dailyPriorities: importedPriorities,
          journalEntries: importedJournal,
          bodyLogs: importedBodyLogs,
        };

        setData(nextState);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        } catch (e) {
          console.error('Failed to sync replaced backup to local storage', e);
        }

        return {
          success: true,
          message: `Successfully restored backup. Loaded ${totalImportableLogs} genuine records in Replace mode.`,
          importedCount: totalImportableLogs,
          replaced: true,
        };
      }

      // Default: Non-destructive Merge Operation
      // Uses deterministic ID merging so existing local records are preserved without duplication
      const mergeList = <T extends { id: string; timestamp?: number; updatedAt?: number }>(
        current: T[],
        incoming: T[]
      ): T[] => {
        const map = new Map<string, T>();
        // Add existing current records first
        for (const item of current) {
          if (item && item.id) map.set(item.id, item);
        }
        // Merge incoming records: prefer newer edit if timestamp available, else preserve existing
        for (const item of incoming) {
          if (!item || !item.id) continue;
          const existing = map.get(item.id);
          if (!existing) {
            map.set(item.id, item);
          } else {
            const inTime = item.updatedAt || item.timestamp || 0;
            const exTime = existing.updatedAt || existing.timestamp || 0;
            if (inTime > exTime) {
              map.set(item.id, item);
            }
          }
        }
        return Array.from(map.values());
      };

      const mergedState: LifeOSData = {
        version: Math.max(data.version || 1, parsed.version || 1),
        isDemoMode: false, // Imported user data operates in real mode
        profile: {
          ...data.profile,
          ...parsed.profile,
        },
        goals: {
          ...data.goals,
          ...parsed.goals,
        },
        stepLogs: mergeList<StepLog>(data.stepLogs, importedSteps),
        sleepLogs: mergeList<SleepLog>(data.sleepLogs, importedSleep),
        heartRateLogs: mergeList<HeartRateLog>(data.heartRateLogs, importedHr),
        waterLogs: mergeList<WaterLog>(data.waterLogs, importedWater),
        mealLogs: mergeList<MealLog>(data.mealLogs, importedMeals),
        savedFoods: mergeList<FoodItem>(data.savedFoods, importedSavedFoods),
        workoutLogs: mergeList<WorkoutLog>(data.workoutLogs, importedWorkouts),
        habits: mergeList<Habit>(data.habits, importedHabits),
        dailyPriorities: mergeList<DailyPriority>(data.dailyPriorities, importedPriorities),
        journalEntries: mergeList<JournalEntry>(data.journalEntries, importedJournal),
        bodyLogs: mergeList<BodyMeasurementLog>(data.bodyLogs, importedBodyLogs),
      };

      setData(mergedState);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedState));
      } catch (e) {
        console.error('Failed to sync merged backup to local storage', e);
      }

      return {
        success: true,
        message: `Successfully merged backup! Synchronized ${totalImportableLogs} genuine records without losing existing local entries.`,
        importedCount: totalImportableLogs,
        replaced: false,
      };
    } catch (e: any) {
      console.error('Safe import encountered an error:', e);
      return { success: false, message: `Restore failed: ${e?.message || 'Unexpected parsing error'}. Local data was preserved unchanged.` };
    }
  };

  return (
    <WellnessContext.Provider
      value={{
        data,
        activeTab,
        setActiveTab,
        selectedDate,
        setSelectedDate,
        isToday,
        quickAddOpen,
        setQuickAddOpen,
        quickAddDefaultTab,
        openQuickAdd,
        activeWorkoutDuration,
        isWorkoutTimerRunning,
        startWorkoutTimer,
        pauseWorkoutTimer,
        resetWorkoutTimer,
        logSteps,
        logSleep,
        logHeartRate,
        logWater,
        removeWaterLog,
        clearTodayWater,
        logMeal,
        deleteMeal,
        saveFoodTemplate,
        deleteFoodTemplate,
        logWorkout,
        deleteWorkout,
        toggleHabit,
        createHabit,
        deleteHabit,
        addPriority,
        togglePriority,
        deletePriority,
        saveJournalEntry,
        deleteJournalEntry,
        logBodyMeasurement,
        deleteBodyMeasurement,
        currentUser,
        isAuthLoading,
        syncStatus,
        syncError,
        lastSyncedAt,
        syncToast,
        clearSyncToast,
        isMigrating,
        signInWithGoogle,
        signOut,
        syncWithCloud,
        migrateLocalData,
        isDemoMode: data.isDemoMode,
        hasDemoRecords,
        setOperatingMode,
        clearDemoDataOnly,
        updateProfile,
        updateGoals,
        loadDemoData,
        clearAllData,
        exportDataJson,
        importDataJson,
        todaySteps,
        todaySleep,
        todayHeartRate,
        todayWaterTotal,
        todayWaterLogs,
        todayMeals,
        todayCaloriesConsumed,
        todayProteinConsumed,
        todayCarbsConsumed,
        todayFatConsumed,
        todayWorkouts,
        todayActiveCaloriesBurned,
        todayHabitsStatus,
        todayPriorities,
        todayJournal,
        latestWeight,
      }}
    >
      {children}
    </WellnessContext.Provider>
  );
};

export function useWellness() {
  const ctx = useContext(WellnessContext);
  if (!ctx) throw new Error('useWellness must be used within WellnessProvider');
  return ctx;
}
