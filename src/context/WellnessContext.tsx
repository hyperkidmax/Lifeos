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
  importDataJson: (json: string) => boolean;

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
        const nextState = { ...prev, isDemoMode: false };
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

  const importDataJson = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (parsed && parsed.goals && parsed.profile) {
        setData(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import error', e);
      return false;
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
