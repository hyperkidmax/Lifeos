export type MetricSource = 'manual' | 'demo' | 'sensor_disconnected' | 'health_connect';

export interface StepLog {
  id: string;
  date: string; // YYYY-MM-DD
  count: number;
  distanceKm: number;
  activeMinutes: number;
  caloriesBurned: number;
  timestamp: number;
  source: MetricSource;
  notes?: string;
}

export interface SleepStageBreakdown {
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
}

export interface SleepLog {
  id: string;
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  stages?: SleepStageBreakdown;
  qualityScore?: number; // 0 - 100
  bedTime?: string; // HH:mm
  wakeTime?: string; // HH:mm
  timestamp: number;
  source: MetricSource;
  notes?: string;
}

export interface HeartRateReading {
  time: string; // HH:mm
  bpm: number;
}

export interface HeartRateLog {
  id: string;
  date: string; // YYYY-MM-DD
  restingBpm?: number;
  avgBpm?: number;
  minBpm?: number;
  maxBpm?: number;
  readings: HeartRateReading[];
  timestamp: number;
  source: MetricSource;
  notes?: string;
}

export interface WaterLog {
  id: string;
  date: string; // YYYY-MM-DD
  amountMl: number;
  timestamp: number;
  source?: MetricSource;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  isSavedTemplate?: boolean;
}

export interface MealLog {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  serving: string;
  timestamp: number;
  source?: MetricSource;
}

export interface WorkoutSet {
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationSec?: number;
  completed: boolean;
  rpe?: number; // Rate of perceived exertion 1-10
}

export interface WorkoutExercise {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  sets: WorkoutSet[];
}

export interface WorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: string;
  durationMinutes: number;
  caloriesBurned?: number;
  exercises: WorkoutExercise[];
  notes?: string;
  timestamp: number;
  source?: MetricSource;
}

export interface Habit {
  id: string;
  title: string;
  category: 'mind' | 'body' | 'sleep' | 'recovery' | 'productivity';
  targetDaysPerWeek: number;
  streak: number;
  bestStreak: number;
  completedDates: string[]; // ['YYYY-MM-DD']
  icon: string;
  color?: string;
  source?: MetricSource;
}

export interface DailyPriority {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  completed: boolean;
  order: number;
  source?: MetricSource;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: 1 | 2 | 3 | 4 | 5; // 1: Very Low, 2: Low, 3: Neutral, 4: Good, 5: Peak
  energy: 1 | 2 | 3 | 4 | 5;
  reflection: string;
  gratitude?: string;
  tags: string[];
  timestamp: number;
  source?: MetricSource;
}

export interface BodyMeasurementLog {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  bodyFatPct?: number;
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  hipsCm?: number;
  notes?: string;
  timestamp: number;
  source?: MetricSource;
}

export interface UserProfile {
  name: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  weightUnit: 'kg' | 'lbs';
  waterUnit: 'ml' | 'oz';
  distanceUnit: 'km' | 'mi';
  accentColor: 'cyan' | 'emerald' | 'violet' | 'amber';
}

export interface Goals {
  dailySteps: number;
  dailyActiveCalories: number;
  dailyWaterMl: number;
  dailyCalories: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatG: number;
  dailySleepMinutes: number;
  targetWeightKg?: number;
}

export interface LifeOSData {
  version: number;
  isDemoMode: boolean;
  profile: UserProfile;
  goals: Goals;
  stepLogs: StepLog[];
  sleepLogs: SleepLog[];
  heartRateLogs: HeartRateLog[];
  waterLogs: WaterLog[];
  mealLogs: MealLog[];
  savedFoods: FoodItem[];
  workoutLogs: WorkoutLog[];
  habits: Habit[];
  dailyPriorities: DailyPriority[];
  journalEntries: JournalEntry[];
  bodyLogs: BodyMeasurementLog[];
}
