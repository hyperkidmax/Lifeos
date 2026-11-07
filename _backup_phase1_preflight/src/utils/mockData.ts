import { LifeOSData, FoodItem } from '../types/wellness';
import { getTodayDateString } from './dateUtils';

export const INITIAL_SAVED_FOODS: FoodItem[] = [
  {
    id: 'f-1',
    name: 'Grilled Chicken Breast',
    calories: 165,
    protein: 31,
    carbs: 0,
    fats: 3.6,
    servingSize: '100g',
    isSavedTemplate: true,
  },
  {
    id: 'f-2',
    name: 'Greek Yogurt 0%',
    calories: 120,
    protein: 18,
    carbs: 6,
    fats: 0.5,
    servingSize: '170g',
    isSavedTemplate: true,
  },
  {
    id: 'f-3',
    name: 'Rolled Oats with Berries',
    calories: 280,
    protein: 10,
    carbs: 52,
    fats: 4,
    servingSize: '1 bowl',
    isSavedTemplate: true,
  },
  {
    id: 'f-4',
    name: 'Whey Isolate Shake',
    calories: 130,
    protein: 26,
    carbs: 2,
    fats: 1.5,
    servingSize: '1 scoop',
    isSavedTemplate: true,
  },
  {
    id: 'f-5',
    name: 'Atlantic Salmon Fillet',
    calories: 280,
    protein: 25,
    carbs: 0,
    fats: 19,
    servingSize: '150g',
    isSavedTemplate: true,
  },
  {
    id: 'f-6',
    name: 'Avocado Whole Grain Toast',
    calories: 240,
    protein: 6,
    carbs: 24,
    fats: 14,
    servingSize: '1 slice',
    isSavedTemplate: true,
  },
  {
    id: 'f-7',
    name: 'Steamed Jasmine Rice',
    calories: 205,
    protein: 4.2,
    carbs: 45,
    fats: 0.4,
    servingSize: '150g',
    isSavedTemplate: true,
  },
  {
    id: 'f-8',
    name: 'Eggs (2 Large Boiled)',
    calories: 144,
    protein: 12.6,
    carbs: 0.8,
    fats: 9.9,
    servingSize: '2 eggs',
    isSavedTemplate: true,
  },
];

export const EMPTY_INITIAL_STATE: LifeOSData = {
  version: 1,
  isDemoMode: false,
  profile: {
    name: 'Alex',
    age: 28,
    gender: 'Other',
    heightCm: 178,
    weightUnit: 'kg',
    waterUnit: 'ml',
    distanceUnit: 'km',
    accentColor: 'cyan',
  },
  goals: {
    dailySteps: 10000,
    dailyActiveCalories: 550,
    dailyWaterMl: 2500,
    dailyCalories: 2300,
    dailyProteinG: 155,
    dailyCarbsG: 220,
    dailyFatG: 65,
    dailySleepMinutes: 480, // 8h
    targetWeightKg: 74.0,
  },
  stepLogs: [],
  sleepLogs: [],
  heartRateLogs: [],
  waterLogs: [],
  mealLogs: [],
  savedFoods: INITIAL_SAVED_FOODS,
  workoutLogs: [],
  habits: [],
  dailyPriorities: [],
  journalEntries: [],
  bodyLogs: [],
};

export const KNOWN_DEMO_IDS = new Set([
  'step-d0', 'step-d1', 'step-d2', 'step-d3', 'step-d4', 'step-d5', 'step-d6',
  'sleep-today', 'sleep-prev',
  'hr-today',
  'w-1', 'w-2', 'w-3', 'w-4',
  'm-1', 'm-2', 'm-3',
  'wo-1',
  'p-1', 'p-2', 'p-3',
  'j-1',
  'b-1', 'b-2', 'b-3',
  'h-1', 'h-2', 'h-3', 'h-4',
]);

/**
 * Reliably identifies if a record was generated as synthetic demo data.
 * Safety rule:
 * 1. If record has source === 'demo', it is synthetic demo data.
 * 2. If record has source === 'manual', 'sensor', 'sensor_disconnected', 'health_connect', it is NEVER demo.
 * 3. For legacy records without a source field:
 *    - Step logs with known demo IDs ('step-d0'..'step-d6') or prefix 'step-d' are demo.
 *    - Sleep logs with known demo IDs ('sleep-today', 'sleep-prev') are demo.
 *    - Heart rate logs with 'hr-today' are demo.
 *    - For generic short IDs ('m-1', 'w-1', 'b-1', etc.), DO NOT treat as demo solely based on ID.
 *      Only classify as demo if known content signatures match the exact synthetic seed payload
 *      (e.g., exact demo meal names or demo habits) or if explicitly marked source === 'demo'.
 * 4. In all uncertain cases, return false to strictly protect user personal records.
 */
export function isDemoRecord(record: any): boolean {
  if (!record || typeof record !== 'object') return false;

  // 1. Explicit source check
  if (record.source === 'demo') return true;
  if (
    record.source === 'manual' ||
    record.source === 'sensor' ||
    record.source === 'sensor_disconnected' ||
    record.source === 'health_connect'
  ) {
    return false;
  }

  // 2. High-confidence synthetic ID signatures (unique to mock dataset)
  if (typeof record.id === 'string') {
    if (record.id.startsWith('step-d')) return true;
    if (record.id === 'sleep-today' || record.id === 'sleep-prev') return true;
    if (record.id === 'hr-today') return true;

    // 3. For generic IDs ('m-1', 'w-1', 'wo-1', 'b-1', 'p-1', 'j-1', 'h-1'),
    // verify synthetic content fingerprint to protect genuine legacy/imported records that may share short IDs
    if (KNOWN_DEMO_IDS.has(record.id)) {
      // Workout synthetic check
      if (record.id === 'wo-1' && record.title === 'Upper Body Hypertrophy') return true;
      // Meals synthetic check
      if (
        (record.id === 'm-1' && record.name === 'Oats with Greek Yogurt & Blueberries') ||
        (record.id === 'm-2' && record.name === 'Grilled Chicken, Jasmine Rice & Avocado') ||
        (record.id === 'm-3' && record.name === 'Whey Protein Shake & Almonds')
      ) {
        return true;
      }
      // Water synthetic check
      if (['w-1', 'w-2', 'w-3', 'w-4'].includes(record.id)) {
        // Only classify as demo if it lacks explicit real provenance and matches demo timestamps or context
        // If there's any ambiguity, do NOT classify as demo
        return false;
      }
      // Habit synthetic check
      if (
        (record.id === 'h-1' && record.title === 'Morning Sunlight & Hydration') ||
        (record.id === 'h-2' && record.title === '10,000 Daily Steps') ||
        (record.id === 'h-3' && record.title === 'Evening Mobility & Stretching') ||
        (record.id === 'h-4' && record.title === 'No Blue Light 45m Before Bed')
      ) {
        return true;
      }
      // Priority synthetic check
      if (
        (record.id === 'p-1' && record.text?.includes('Upper body hypertrophy')) ||
        (record.id === 'p-2' && record.text?.includes('160g protein target')) ||
        (record.id === 'p-3' && record.text?.includes('30-minute afternoon walk'))
      ) {
        return true;
      }
      // Journal synthetic check
      if (record.id === 'j-1' && record.reflection?.includes('High productivity day')) {
        return true;
      }
      // Body log synthetic check
      if (
        (record.id === 'b-1' && record.notes === 'Weekly weigh-in') ||
        (record.id === 'b-3' && record.notes?.includes('Feeling leaner'))
      ) {
        return true;
      }
    }
  }

  return false;
}

export function filterOutDemoRecords(data: LifeOSData): LifeOSData {
  return {
    ...data,
    isDemoMode: false,
    stepLogs: data.stepLogs.filter((s) => !isDemoRecord(s)),
    sleepLogs: data.sleepLogs.filter((s) => !isDemoRecord(s)),
    heartRateLogs: data.heartRateLogs.filter((h) => !isDemoRecord(h)),
    waterLogs: data.waterLogs.filter((w) => !isDemoRecord(w)),
    mealLogs: data.mealLogs.filter((m) => !isDemoRecord(m)),
    workoutLogs: data.workoutLogs.filter((w) => !isDemoRecord(w)),
    habits: data.habits.filter((h) => !isDemoRecord(h)),
    dailyPriorities: data.dailyPriorities.filter((p) => !isDemoRecord(p)),
    journalEntries: data.journalEntries.filter((j) => !isDemoRecord(j)),
    bodyLogs: data.bodyLogs.filter((b) => !isDemoRecord(b)),
  };
}

export function getDemoData(): LifeOSData {
  const today = getTodayDateString();
  const d = new Date();
  
  // Create past dates
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const temp = new Date(d);
    temp.setDate(temp.getDate() - i);
    const y = temp.getFullYear();
    const m = String(temp.getMonth() + 1).padStart(2, '0');
    const day = String(temp.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }

  return {
    version: 1,
    isDemoMode: true,
    profile: {
      name: 'Alex Mercer',
      age: 29,
      gender: 'Male',
      heightCm: 180,
      weightUnit: 'kg',
      waterUnit: 'ml',
      distanceUnit: 'km',
      accentColor: 'cyan',
    },
    goals: {
      dailySteps: 10000,
      dailyActiveCalories: 550,
      dailyWaterMl: 2800,
      dailyCalories: 2350,
      dailyProteinG: 160,
      dailyCarbsG: 220,
      dailyFatG: 65,
      dailySleepMinutes: 480, // 8h
      targetWeightKg: 75.0,
    },
    stepLogs: [
      {
        id: 'step-d0',
        date: dates[0],
        count: 9420,
        distanceKm: 6.8,
        activeMinutes: 52,
        caloriesBurned: 460,
        timestamp: Date.now() - 6 * 86400000,
        source: 'demo',
      },
      {
        id: 'step-d1',
        date: dates[1],
        count: 10840,
        distanceKm: 7.9,
        activeMinutes: 65,
        caloriesBurned: 580,
        timestamp: Date.now() - 5 * 86400000,
        source: 'demo',
      },
      {
        id: 'step-d2',
        date: dates[2],
        count: 8930,
        distanceKm: 6.4,
        activeMinutes: 45,
        caloriesBurned: 430,
        timestamp: Date.now() - 4 * 86400000,
        source: 'demo',
      },
      {
        id: 'step-d3',
        date: dates[3],
        count: 12450,
        distanceKm: 9.1,
        activeMinutes: 78,
        caloriesBurned: 640,
        timestamp: Date.now() - 3 * 86400000,
        source: 'demo',
      },
      {
        id: 'step-d4',
        date: dates[4],
        count: 11200,
        distanceKm: 8.2,
        activeMinutes: 62,
        caloriesBurned: 570,
        timestamp: Date.now() - 2 * 86400000,
        source: 'demo',
      },
      {
        id: 'step-d5',
        date: dates[5],
        count: 10150,
        distanceKm: 7.5,
        activeMinutes: 58,
        caloriesBurned: 520,
        timestamp: Date.now() - 1 * 86400000,
        source: 'demo',
      },
      {
        id: 'step-d6',
        date: today,
        count: 8240,
        distanceKm: 6.1,
        activeMinutes: 48,
        caloriesBurned: 410,
        timestamp: Date.now(),
        source: 'demo',
        notes: 'Morning run + lunch stroll',
      },
    ],
    sleepLogs: [
      {
        id: 'sleep-today',
        date: today,
        totalMinutes: 462, // 7h 42m
        stages: {
          deepMinutes: 98,
          remMinutes: 114,
          lightMinutes: 215,
          awakeMinutes: 35,
        },
        qualityScore: 86,
        bedTime: '23:15',
        wakeTime: '06:57',
        timestamp: Date.now(),
        source: 'demo',
        notes: 'Woke up feeling restored. Minimal interruptions.',
      },
      {
        id: 'sleep-prev',
        date: dates[5],
        totalMinutes: 435, // 7h 15m
        stages: {
          deepMinutes: 82,
          remMinutes: 95,
          lightMinutes: 220,
          awakeMinutes: 38,
        },
        qualityScore: 79,
        bedTime: '23:45',
        wakeTime: '07:00',
        timestamp: Date.now() - 86400000,
        source: 'demo',
      },
    ],
    heartRateLogs: [
      {
        id: 'hr-today',
        date: today,
        restingBpm: 56,
        avgBpm: 68,
        minBpm: 51,
        maxBpm: 154,
        readings: [
          { time: '07:00', bpm: 58 },
          { time: '08:30', bpm: 142 },
          { time: '11:00', bpm: 66 },
          { time: '13:30', bpm: 72 },
          { time: '16:00', bpm: 64 },
          { time: '19:00', bpm: 61 },
        ],
        timestamp: Date.now(),
        source: 'demo',
      },
    ],
    waterLogs: [
      { id: 'w-1', date: today, amountMl: 500, timestamp: Date.now() - 5 * 3600000, source: 'demo' },
      { id: 'w-2', date: today, amountMl: 500, timestamp: Date.now() - 3 * 3600000, source: 'demo' },
      { id: 'w-3', date: today, amountMl: 750, timestamp: Date.now() - 1 * 3600000, source: 'demo' },
      { id: 'w-4', date: today, amountMl: 250, timestamp: Date.now() - 30 * 60000, source: 'demo' },
    ],
    mealLogs: [
      {
        id: 'm-1',
        date: today,
        mealType: 'breakfast',
        name: 'Oats with Greek Yogurt & Blueberries',
        calories: 420,
        protein: 32,
        carbs: 58,
        fats: 6,
        serving: '1 bowl',
        timestamp: Date.now() - 6 * 3600000,
        source: 'demo',
      },
      {
        id: 'm-2',
        date: today,
        mealType: 'lunch',
        name: 'Grilled Chicken, Jasmine Rice & Avocado',
        calories: 680,
        protein: 52,
        carbs: 65,
        fats: 22,
        serving: '1 bowl (400g)',
        timestamp: Date.now() - 3 * 3600000,
        source: 'demo',
      },
      {
        id: 'm-3',
        date: today,
        mealType: 'snack',
        name: 'Whey Protein Shake & Almonds',
        calories: 260,
        protein: 30,
        carbs: 6,
        fats: 12,
        serving: '1 shake + 15g almonds',
        timestamp: Date.now() - 1 * 3600000,
        source: 'demo',
      },
    ],
    savedFoods: INITIAL_SAVED_FOODS,
    workoutLogs: [
      {
        id: 'wo-1',
        date: today,
        title: 'Upper Body Hypertrophy',
        category: 'Strength',
        durationMinutes: 52,
        caloriesBurned: 380,
        notes: 'Felt strong on incline bench. Increased load on set 3.',
        timestamp: Date.now() - 4 * 3600000,
        source: 'demo',
        exercises: [
          {
            id: 'e-1',
            name: 'Incline Dumbbell Bench Press',
            category: 'chest',
            sets: [
              { setNumber: 1, reps: 12, weightKg: 28, completed: true, rpe: 7 },
              { setNumber: 2, reps: 10, weightKg: 32, completed: true, rpe: 8 },
              { setNumber: 3, reps: 8, weightKg: 34, completed: true, rpe: 9 },
            ],
          },
          {
            id: 'e-2',
            name: 'Chest-Supported Cable Row',
            category: 'back',
            sets: [
              { setNumber: 1, reps: 12, weightKg: 65, completed: true, rpe: 7 },
              { setNumber: 2, reps: 10, weightKg: 70, completed: true, rpe: 8 },
              { setNumber: 3, reps: 10, weightKg: 70, completed: true, rpe: 8.5 },
            ],
          },
          {
            id: 'e-3',
            name: 'Lateral Raises',
            category: 'shoulders',
            sets: [
              { setNumber: 1, reps: 15, weightKg: 10, completed: true, rpe: 8 },
              { setNumber: 2, reps: 14, weightKg: 10, completed: true, rpe: 8.5 },
              { setNumber: 3, reps: 12, weightKg: 10, completed: true, rpe: 9 },
            ],
          },
        ],
      },
    ],
    habits: [
      {
        id: 'h-1',
        title: 'Morning Sunlight & Hydration',
        category: 'recovery',
        targetDaysPerWeek: 7,
        streak: 12,
        bestStreak: 18,
        completedDates: [dates[1], dates[2], dates[3], dates[4], dates[5], today],
        icon: 'Sun',
        color: '#00E5FF',
        source: 'demo',
      },
      {
        id: 'h-2',
        title: '10,000 Daily Steps',
        category: 'body',
        targetDaysPerWeek: 7,
        streak: 5,
        bestStreak: 14,
        completedDates: [dates[1], dates[3], dates[4], dates[5]],
        icon: 'Footprints',
        color: '#34D399',
        source: 'demo',
      },
      {
        id: 'h-3',
        title: 'Evening Mobility & Stretching',
        category: 'recovery',
        targetDaysPerWeek: 5,
        streak: 3,
        bestStreak: 9,
        completedDates: [dates[3], dates[4], dates[5]],
        icon: 'Activity',
        color: '#A855F7',
        source: 'demo',
      },
      {
        id: 'h-4',
        title: 'No Blue Light 45m Before Bed',
        category: 'sleep',
        targetDaysPerWeek: 7,
        streak: 4,
        bestStreak: 10,
        completedDates: [dates[2], dates[3], dates[4], dates[5]],
        icon: 'Moon',
        color: '#818CF8',
        source: 'demo',
      },
    ],
    dailyPriorities: [
      {
        id: 'p-1',
        date: today,
        text: 'Upper body hypertrophy workout (completed)',
        completed: true,
        order: 1,
        source: 'demo',
      },
      {
        id: 'p-2',
        date: today,
        text: 'Hit 160g protein target & 2.8L hydration',
        completed: false,
        order: 2,
        source: 'demo',
      },
      {
        id: 'p-3',
        date: today,
        text: '30-minute afternoon walk for recovery',
        completed: true,
        order: 3,
        source: 'demo',
      },
    ],
    journalEntries: [
      {
        id: 'j-1',
        date: today,
        mood: 4,
        energy: 4,
        reflection: 'High productivity day. Recovery from yesterday was solid. Focused on maintaining clean posture during work blocks.',
        gratitude: 'Deep restorative sleep and crisp morning weather.',
        tags: ['Recovery', 'Focus', 'Strength'],
        timestamp: Date.now() - 2 * 3600000,
        source: 'demo',
      },
    ],
    bodyLogs: [
      {
        id: 'b-1',
        date: dates[0],
        weightKg: 78.4,
        bodyFatPct: 15.6,
        waistCm: 82.5,
        chestCm: 103,
        armsCm: 37.5,
        timestamp: Date.now() - 6 * 86400000,
        notes: 'Weekly weigh-in',
        source: 'demo',
      },
      {
        id: 'b-2',
        date: dates[3],
        weightKg: 77.9,
        bodyFatPct: 15.4,
        waistCm: 82.0,
        chestCm: 103,
        armsCm: 37.6,
        timestamp: Date.now() - 3 * 86400000,
        source: 'demo',
      },
      {
        id: 'b-3',
        date: today,
        weightKg: 77.4,
        bodyFatPct: 15.1,
        waistCm: 81.5,
        chestCm: 103.5,
        armsCm: 37.8,
        timestamp: Date.now(),
        notes: 'Feeling leaner and holding good training volume.',
        source: 'demo',
      },
    ],
  };
}
