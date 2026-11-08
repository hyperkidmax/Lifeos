import React, { useState, useEffect } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { MealType, FoodItem } from '../../types/wellness';
import { FoodSearchModal } from '../nutrition/FoodSearchModal';
import { X, Droplet, Utensils, Dumbbell, Activity, CheckSquare, Plus, Check, Search } from 'lucide-react';

export const QuickAddModal: React.FC = () => {
  const {
    quickAddOpen,
    setQuickAddOpen,
    quickAddDefaultTab,
    logWater,
    logMeal,
    logWorkout,
    logSteps,
    logSleep,
    logHeartRate,
    addPriority,
    data,
    todaySteps,
    todaySleep,
    todayHeartRate,
  } = useWellness();

  const [activeTab, setActiveTab] = useState<'water' | 'meal' | 'workout' | 'health' | 'priority'>('water');

  useEffect(() => {
    if (quickAddDefaultTab) {
      setActiveTab(quickAddDefaultTab);
    }
  }, [quickAddDefaultTab, quickAddOpen]);

  // Water state
  const [customWater, setCustomWater] = useState('');

  // Meal state
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [serving, setServing] = useState('1 serving');
  const [foodSearchOpen, setFoodSearchOpen] = useState(false);

  // Workout state
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutCategory, setWorkoutCategory] = useState('Strength');
  const [workoutDuration, setWorkoutDuration] = useState('45');
  const [workoutCalories, setWorkoutCalories] = useState('320');
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Health metric state
  const [healthMetricType, setHealthMetricType] = useState<'steps' | 'sleep' | 'heartRate'>('steps');
  const [metricValue, setMetricValue] = useState('');
  const [secondaryValue, setSecondaryValue] = useState('');

  // Priority state
  const [priorityText, setPriorityText] = useState('');

  // Success flash toast
  const [justLogged, setJustLogged] = useState(false);

  const triggerSuccess = () => {
    setJustLogged(true);
    setTimeout(() => {
      setJustLogged(false);
      setQuickAddOpen(false);
    }, 400);
  };

  if (!quickAddOpen) return null;

  const handleQuickWater = (ml: number) => {
    logWater(ml);
    triggerSuccess();
  };

  const handleCustomWaterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customWater, 10);
    if (!isNaN(val) && val > 0) {
      logWater(val);
      setCustomWater('');
      triggerSuccess();
    }
  };

  const handleMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    logMeal({
      date: data.stepLogs[0]?.date || new Date().toISOString().split('T')[0],
      mealType,
      name: mealName.trim(),
      calories: parseInt(calories, 10) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fats: parseFloat(fats) || 0,
      serving: serving.trim() || '1 serving',
    });
    setMealName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    triggerSuccess();
  };

  const handleSelectSavedFood = (food: FoodItem) => {
    setMealName(food.name);
    setCalories(String(food.calories));
    setProtein(String(food.protein));
    setCarbs(String(food.carbs));
    setFats(String(food.fats));
    setServing(food.servingSize);
  };

  const handleWorkoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutTitle.trim()) return;
    logWorkout({
      date: new Date().toISOString().split('T')[0],
      title: workoutTitle.trim(),
      category: workoutCategory,
      durationMinutes: parseInt(workoutDuration, 10) || 30,
      caloriesBurned: parseInt(workoutCalories, 10) || 200,
      exercises: [],
      notes: workoutNotes.trim() || undefined,
    });
    setWorkoutTitle('');
    triggerSuccess();
  };

  const handleHealthMetricSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(metricValue);
    if (isNaN(val) || val <= 0) return;

    if (healthMetricType === 'steps') {
      logSteps(Math.round(val));
    } else if (healthMetricType === 'sleep') {
      // Input is in hours (e.g. 7.5), convert to minutes
      logSleep(Math.round(val * 60));
    } else if (healthMetricType === 'heartRate') {
      logHeartRate(Math.round(val), Math.round(val), Math.round(val));
    }
    setMetricValue('');
    triggerSuccess();
  };

  const handlePrioritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priorityText.trim()) return;
    addPriority(priorityText.trim());
    setPriorityText('');
    triggerSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#111115] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Quick Log</span>
            <span className="text-xs text-neutral-400">· Manual Record</span>
          </div>
          <button
            onClick={() => setQuickAddOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#0c0c0f] border-b border-white/[0.06] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('water')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'water'
                ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            Water
          </button>

          <button
            onClick={() => setActiveTab('meal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'meal'
                ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Meal
          </button>

          <button
            onClick={() => setActiveTab('workout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'workout'
                ? 'bg-[#FF725C]/20 text-[#FF725C] border border-[#FF725C]/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Workout
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'health'
                ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Health
          </button>

          <button
            onClick={() => setActiveTab('priority')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'priority'
                ? 'bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Priority
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto">
          {justLogged && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Recorded to local database!
            </div>
          )}

          {/* TAB 1: WATER */}
          {activeTab === 'water' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">Quick-tap to log water intake for today:</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleQuickWater(250)}
                  className="py-3 px-2 rounded-xl bg-[#18181f] border border-white/[0.08] hover:border-[#38BDF8]/60 hover:bg-[#38BDF8]/10 text-center transition-all cursor-pointer group"
                >
                  <span className="text-xl block mb-1">🥤</span>
                  <span className="text-sm font-semibold text-white group-hover:text-[#38BDF8] block font-mono-num">
                    +250 ml
                  </span>
                  <span className="text-[10px] text-neutral-400">Glass</span>
                </button>

                <button
                  onClick={() => handleQuickWater(500)}
                  className="py-3 px-2 rounded-xl bg-[#18181f] border border-white/[0.08] hover:border-[#38BDF8]/60 hover:bg-[#38BDF8]/10 text-center transition-all cursor-pointer group"
                >
                  <span className="text-xl block mb-1">💧</span>
                  <span className="text-sm font-semibold text-white group-hover:text-[#38BDF8] block font-mono-num">
                    +500 ml
                  </span>
                  <span className="text-[10px] text-neutral-400">Standard Bottle</span>
                </button>

                <button
                  onClick={() => handleQuickWater(750)}
                  className="py-3 px-2 rounded-xl bg-[#18181f] border border-white/[0.08] hover:border-[#38BDF8]/60 hover:bg-[#38BDF8]/10 text-center transition-all cursor-pointer group"
                >
                  <span className="text-xl block mb-1">🍶</span>
                  <span className="text-sm font-semibold text-white group-hover:text-[#38BDF8] block font-mono-num">
                    +750 ml
                  </span>
                  <span className="text-[10px] text-neutral-400">Large Tumbler</span>
                </button>
              </div>

              <form onSubmit={handleCustomWaterSubmit} className="pt-2">
                <label className="text-xs text-neutral-400 block mb-1.5">Or enter custom amount (ml):</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    step="10"
                    placeholder="e.g. 330"
                    value={customWater}
                    onChange={(e) => setCustomWater(e.target.value)}
                    className="flex-1 bg-[#18181f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#38BDF8]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#38BDF8] text-black font-semibold text-xs hover:bg-[#38BDF8]/90 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: MEAL */}
          {activeTab === 'meal' && (
            <div className="space-y-4">
              {/* Search Food Database Launcher Button */}
              <button
                type="button"
                onClick={() => setFoodSearchOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Search className="w-3.5 h-3.5" />
                Search Food Database (Kerala &amp; Packaged Foods)
              </button>

              {/* Quick Select from Saved Foods */}
              {data.savedFoods.length > 0 && (
                <div>
                  <label className="text-[11px] text-neutral-400 uppercase tracking-wider block mb-1.5 font-medium">
                    1-Tap From Saved Foods:
                  </label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {data.savedFoods.slice(0, 6).map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => handleSelectSavedFood(food)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#18181f] border border-white/[0.08] hover:border-[#00E5FF]/40 text-left whitespace-nowrap text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <span className="font-medium">{food.name}</span>
                        <span className="text-[10px] text-neutral-400 block font-mono-num">
                          {food.calories} kcal · {food.protein}g P
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleMealSubmit} className="space-y-3">
                <div className="grid grid-cols-4 gap-1.5 bg-[#0e0e12] p-1 rounded-xl border border-white/[0.06]">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMealType(t)}
                      className={`py-1.5 text-xs capitalize rounded-lg transition-all cursor-pointer ${
                        mealType === t
                          ? 'bg-[#1e1e26] text-[#00E5FF] font-semibold border border-[#00E5FF]/30'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Food / Meal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Salmon Poke Bowl"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Calories</label>
                    <input
                      type="number"
                      placeholder="kcal"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-2.5 py-2 text-sm text-white font-mono-num focus:outline-none focus:border-[#00E5FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-cyan-400 block mb-1">Protein (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="g"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-2.5 py-2 text-sm text-white font-mono-num focus:outline-none focus:border-[#00E5FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-amber-400 block mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="g"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-2.5 py-2 text-sm text-white font-mono-num focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-rose-400 block mb-1">Fats (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="g"
                      value={fats}
                      onChange={(e) => setFats(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-2.5 py-2 text-sm text-white font-mono-num focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Serving Size</label>
                  <input
                    type="text"
                    placeholder="1 bowl (350g)"
                    value={serving}
                    onChange={(e) => setServing(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#00E5FF] text-black font-semibold text-xs cyan-glow hover:bg-[#00E5FF]/90 transition-all cursor-pointer mt-2"
                >
                  Save Meal Log
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: WORKOUT */}
          {activeTab === 'workout' && (
            <form onSubmit={handleWorkoutSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Workout Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upper Body Push & Abs"
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF725C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Category</label>
                  <select
                    value={workoutCategory}
                    onChange={(e) => setWorkoutCategory(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Strength">Strength / Hypertrophy</option>
                    <option value="Cardio">Cardio / Running</option>
                    <option value="HIIT">HIIT / Conditioning</option>
                    <option value="Mobility">Mobility & Stretching</option>
                    <option value="Sports">Sports / Swimming</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={workoutDuration}
                    onChange={(e) => setWorkoutDuration(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white font-mono-num focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Estimated Active Calories (kcal)</label>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={workoutCalories}
                  onChange={(e) => setWorkoutCalories(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white font-mono-num focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Notes / RPE (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Great energy, pushed heavy bench"
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FF725C] text-black font-semibold text-xs hover:bg-[#FF725C]/90 transition-all cursor-pointer mt-2"
              >
                Log Workout Session
              </button>
            </form>
          )}

          {/* TAB 4: HEALTH METRICS */}
          {activeTab === 'health' && (
            <form onSubmit={handleHealthMetricSubmit} className="space-y-4">
              <div className="flex gap-2">
                {[
                  { id: 'steps', label: 'Steps', unit: 'steps' },
                  { id: 'sleep', label: 'Sleep', unit: 'hours' },
                  { id: 'heartRate', label: 'Heart Rate', unit: 'bpm' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setHealthMetricType(m.id as any);
                      setMetricValue('');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      healthMetricType === m.id
                        ? 'bg-[#34D399]/20 text-[#34D399] border-[#34D399]/40'
                        : 'bg-[#18181f] text-neutral-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {healthMetricType === 'steps' && (
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Step Count for Today {todaySteps && `(Current: ${todaySteps.count.toLocaleString()})`}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    placeholder="e.g. 8500"
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-base text-white font-mono-num focus:outline-none focus:border-[#34D399]"
                    required
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Distance and active minutes will be calculated automatically.
                  </p>
                </div>
              )}

              {healthMetricType === 'sleep' && (
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Total Sleep Duration (in hours) {todaySleep && `(Current: ${(todaySleep.totalMinutes / 60).toFixed(1)}h)`}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    placeholder="e.g. 7.5"
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-base text-white font-mono-num focus:outline-none focus:border-[#34D399]"
                    required
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Deep, REM, and light sleep stages are modeled using standard circadian ratios.
                  </p>
                </div>
              )}

              {healthMetricType === 'heartRate' && (
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Heart Rate / Resting BPM {todayHeartRate?.restingBpm && `(Current resting: ${todayHeartRate.restingBpm} bpm)`}
                  </label>
                  <input
                    type="number"
                    min="35"
                    max="220"
                    placeholder="e.g. 58"
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-base text-white font-mono-num focus:outline-none focus:border-[#34D399]"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#34D399] text-black font-semibold text-xs hover:bg-[#34D399]/90 transition-all cursor-pointer"
              >
                Save Health Measurement
              </button>
            </form>
          )}

          {/* TAB 5: PRIORITY */}
          {activeTab === 'priority' && (
            <form onSubmit={handlePrioritySubmit} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Top Daily Priority</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete 5km tempo run & 8h sleep"
                  value={priorityText}
                  onChange={(e) => setPriorityText(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#A855F7] text-white font-semibold text-xs hover:bg-[#A855F7]/90 transition-all cursor-pointer"
              >
                Add Daily Priority
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Embedded Food Search Database Modal */}
      <FoodSearchModal
        isOpen={foodSearchOpen}
        onClose={() => {
          setFoodSearchOpen(false);
          setQuickAddOpen(false);
        }}
        initialMealType={mealType}
      />
    </div>
  );
};
