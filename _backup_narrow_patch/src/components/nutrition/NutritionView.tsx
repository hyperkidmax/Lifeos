import React, { useState, useMemo } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { isDemoRecord } from '../../utils/mockData';
import { getLast7Days, formatDisplayDate, getTodayDateString } from '../../utils/dateUtils';
import { MealType, FoodItem } from '../../types/wellness';
import { FoodSearchModal } from './FoodSearchModal';
import {
  Utensils,
  Plus,
  Trash2,
  Droplet,
  BookmarkPlus,
  Sparkles,
  ChevronRight,
  PieChart,
  Clock,
  Check,
  CalendarDays,
  History,
  Calendar,
  ArrowLeft,
  Search,
} from 'lucide-react';

export const NutritionView: React.FC = () => {
  const {
    data,
    isDemoMode,
    selectedDate,
    setSelectedDate,
    isToday,
    todayMeals,
    todayCaloriesConsumed,
    todayProteinConsumed,
    todayCarbsConsumed,
    todayFatConsumed,
    todayWaterTotal,
    todayWaterLogs,
    logWater,
    removeWaterLog,
    clearTodayWater,
    logMeal,
    deleteMeal,
    saveFoodTemplate,
    deleteFoodTemplate,
  } = useWellness();

  const goals = data.goals;

  const activeWaterLogs = useMemo(() => {
    return isDemoMode
      ? data.waterLogs
      : data.waterLogs.filter((w) => !isDemoRecord(w));
  }, [isDemoMode, data.waterLogs]);

  const last7Days = getLast7Days();
  const todayStr = getTodayDateString();

  const waterLogsByDate = useMemo(() => {
    const groups: { [date: string]: typeof activeWaterLogs } = {};
    activeWaterLogs.forEach((w) => {
      if (!groups[w.date]) groups[w.date] = [];
      groups[w.date].push(w);
    });
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((dateKey) => {
      const logs = [...groups[dateKey]].sort((a, b) => b.timestamp - a.timestamp);
      const totalMl = logs.reduce((sum, item) => sum + item.amountMl, 0);
      return {
        date: dateKey,
        logs,
        totalMl,
      };
    });
  }, [activeWaterLogs]);

  // Active sub-tab: 'meals' | 'hydration' | 'savedFoods'
  const [activeTab, setActiveTab] = useState<'meals' | 'hydration' | 'savedFoods'>('meals');

  // Modal: Add Meal
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [serving, setServing] = useState('1 serving');

  // Modal: Save Food Template
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCal, setTemplateCal] = useState('');
  const [templateP, setTemplateP] = useState('');
  const [templateC, setTemplateC] = useState('');
  const [templateF, setTemplateF] = useState('');
  const [templateServing, setTemplateServing] = useState('100g');

  // Custom water input
  const [customWater, setCustomWater] = useState('');

  const handleCreateMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    logMeal({
      date: selectedDate,
      mealType,
      name: name.trim(),
      calories: parseInt(calories, 10) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fats: parseFloat(fats) || 0,
      serving: serving.trim() || '1 serving',
    });
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setMealModalOpen(false);
  };

  const handleSaveFoodTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    saveFoodTemplate({
      name: templateName.trim(),
      calories: parseInt(templateCal, 10) || 0,
      protein: parseFloat(templateP) || 0,
      carbs: parseFloat(templateC) || 0,
      fats: parseFloat(templateF) || 0,
      servingSize: templateServing.trim() || '1 serving',
    });
    setTemplateName('');
    setTemplateCal('');
    setTemplateP('');
    setTemplateC('');
    setTemplateF('');
    setFoodModalOpen(false);
  };

  const handleOneTapLogSavedFood = (food: FoodItem, targetType: MealType = 'lunch') => {
    logMeal({
      date: selectedDate,
      mealType: targetType,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      serving: food.servingSize,
    });
  };

  const handleCustomWater = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customWater, 10);
    if (!isNaN(val) && val > 0) {
      logWater(val);
      setCustomWater('');
    }
  };

  // Macro calculation percentages
  const totalMacroGrams = todayProteinConsumed + todayCarbsConsumed + todayFatConsumed || 1;
  const pPct = Math.round((todayProteinConsumed / totalMacroGrams) * 100);
  const cPct = Math.round((todayCarbsConsumed / totalMacroGrams) * 100);
  const fPct = Math.round((todayFatConsumed / totalMacroGrams) * 100);

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="space-y-6 pb-28 pt-2">
      {/* Top Banner & Macro Split Card */}
      <div className="bg-[#121217] border border-white/[0.08] rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono-num uppercase tracking-wider text-[#00E5FF] font-semibold">
              Metabolic Fuel & Hydration
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              Nutrition & Macro Targets
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Real-time caloric balance, macronutrient breakdown, and fluid saturation.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#181820] p-1 rounded-2xl border border-white/[0.06]">
            <button
              onClick={() => setActiveTab('meals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'meals'
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Meals Log
            </button>
            <button
              onClick={() => setActiveTab('hydration')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'hydration'
                  ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Hydration ({todayWaterTotal} ml)
            </button>
            <button
              onClick={() => setActiveTab('savedFoods')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'savedFoods'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Saved Foods ({data.savedFoods.length})
            </button>
          </div>
        </div>

        {/* Macro Gauge Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Calories</span>
            <span className="text-2xl font-bold font-mono-num text-white mt-1 block">
              {todayCaloriesConsumed}
            </span>
            <div className="w-full bg-white/[0.06] rounded-full h-1 mt-2 overflow-hidden">
              <div
                style={{ width: `${Math.min((todayCaloriesConsumed / goals.dailyCalories) * 100, 100)}%` }}
                className="bg-amber-400 h-full rounded-full"
              />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono-num mt-1 block">
              Goal: {goals.dailyCalories} kcal ({Math.max(0, goals.dailyCalories - todayCaloriesConsumed)} left)
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#00E5FF] uppercase tracking-wider font-semibold">Protein</span>
              <span className="text-[10px] text-neutral-500 font-mono-num">{pPct}%</span>
            </div>
            <span className="text-2xl font-bold font-mono-num text-[#00E5FF] mt-1 block">
              {todayProteinConsumed}g
            </span>
            <div className="w-full bg-white/[0.06] rounded-full h-1 mt-2 overflow-hidden">
              <div
                style={{ width: `${Math.min((todayProteinConsumed / goals.dailyProteinG) * 100, 100)}%` }}
                className="bg-[#00E5FF] h-full rounded-full cyan-glow-subtle"
              />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono-num mt-1 block">
              Target: {goals.dailyProteinG}g ({Math.max(0, goals.dailyProteinG - todayProteinConsumed)}g left)
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-300 uppercase tracking-wider font-semibold">Carbs</span>
              <span className="text-[10px] text-neutral-500 font-mono-num">{cPct}%</span>
            </div>
            <span className="text-2xl font-bold font-mono-num text-amber-300 mt-1 block">
              {todayCarbsConsumed}g
            </span>
            <div className="w-full bg-white/[0.06] rounded-full h-1 mt-2 overflow-hidden">
              <div
                style={{ width: `${Math.min((todayCarbsConsumed / goals.dailyCarbsG) * 100, 100)}%` }}
                className="bg-amber-300 h-full rounded-full"
              />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono-num mt-1 block">
              Target: {goals.dailyCarbsG}g
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">Fats</span>
              <span className="text-[10px] text-neutral-500 font-mono-num">{fPct}%</span>
            </div>
            <span className="text-2xl font-bold font-mono-num text-rose-400 mt-1 block">
              {todayFatConsumed}g
            </span>
            <div className="w-full bg-white/[0.06] rounded-full h-1 mt-2 overflow-hidden">
              <div
                style={{ width: `${Math.min((todayFatConsumed / goals.dailyFatG) * 100, 100)}%` }}
                className="bg-rose-400 h-full rounded-full"
              />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono-num mt-1 block">
              Target: {goals.dailyFatG}g
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: MEALS BY CATEGORY */}
      {activeTab === 'meals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Daily Meals Log</h2>
            <button
              onClick={() => setMealModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#00E5FF] text-black font-semibold text-xs cyan-glow hover:bg-[#00E5FF]/90 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              Search &amp; Log Food
            </button>
          </div>

          {/* Quick Saved Foods Strip for Fast 1-Tap Re-logging */}
          {data.savedFoods.length > 0 && (
            <div className="bg-[#131317] border border-white/[0.06] rounded-2xl p-3">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block mb-2">
                1-Tap Quick Add Saved Foods
              </span>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {data.savedFoods.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleOneTapLogSavedFood(f)}
                    className="px-3 py-2 rounded-xl bg-[#181820] hover:bg-[#1f1f2a] border border-white/[0.06] hover:border-[#00E5FF]/40 text-left shrink-0 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-white block">{f.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono-num block">
                      {f.calories} kcal · {f.protein}g P · {f.servingSize}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Meal Categories Grid */}
          <div className="grid grid-cols-1 gap-3.5">
            {mealTypes.map((type) => {
              const meals = todayMeals.filter((m) => m.mealType === type);
              const totalKcal = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
              const totalP = Math.round(meals.reduce((acc, m) => acc + (m.protein || 0), 0));

              return (
                <div
                  key={type}
                  className="bg-[#131317] border border-white/[0.08] rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-semibold text-sm text-white">{type}</span>
                      <span className="text-xs text-neutral-400 font-mono-num">
                        ({meals.length} item{meals.length === 1 ? '' : 's'})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono-num text-white">{totalKcal} kcal</span>
                        <span className="text-[10px] text-[#00E5FF] font-mono-num ml-1.5">{totalP}g P</span>
                      </div>
                      <button
                        onClick={() => {
                          setMealType(type);
                          setMealModalOpen(true);
                        }}
                        className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title={`Add food to ${type}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Meals list */}
                  {meals.length > 0 ? (
                    <div className="divide-y divide-white/[0.04] mt-2">
                      {meals.map((meal) => (
                        <div key={meal.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-neutral-200 block">{meal.name}</span>
                              {isDemoRecord(meal) && (
                                <span className="text-[9px] uppercase font-mono-num px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  Demo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono-num mt-0.5">
                              <span>{meal.serving}</span>
                              <span>·</span>
                              <span className="text-[#00E5FF]">{meal.protein}g P</span>
                              <span>·</span>
                              <span className="text-amber-300">{meal.carbs}g C</span>
                              <span>·</span>
                              <span className="text-rose-400">{meal.fats}g F</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold font-mono-num text-white">
                              {meal.calories} kcal
                            </span>
                            <button
                              onClick={() => deleteMeal(meal.id)}
                              className="p-1 text-neutral-600 hover:text-rose-400 rounded transition-colors cursor-pointer"
                              title="Delete food entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-600 italic py-3 text-center">
                      No foods logged for {type} yet
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: HYDRATION DEEP DIVE */}
      {activeTab === 'hydration' && (
        <div className="space-y-4">
          {/* Past Date Notice Banner */}
          {!isToday && (
            <div className="bg-sky-950/40 border border-sky-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-neutral-200">
                  Viewing past records for <strong className="text-sky-300">{formatDisplayDate(selectedDate)}</strong> ({todayWaterTotal} ml logged)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-semibold transition-colors shrink-0 cursor-pointer"
              >
                Return to Today
              </button>
            </div>
          )}

          {/* Last 7 Days Hydration Grid with 1-Tap Day Switching */}
          <div className="bg-[#131317] border border-white/[0.08] rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-xs font-semibold text-white">Hydration Across Last 7 Days</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono-num">
                Tap any day to view or edit
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {last7Days.map((dStr) => {
                const isCur = dStr === selectedDate;
                const isCurToday = dStr === todayStr;
                const dayLogs = activeWaterLogs.filter((w) => w.date === dStr);
                const dayTotal = dayLogs.reduce((acc, curr) => acc + curr.amountMl, 0);
                const hit = dayTotal >= goals.dailyWaterMl;
                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => setSelectedDate(dStr)}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-between min-h-[72px] ${
                      isCur
                        ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white shadow-[0_0_12px_rgba(56,189,248,0.25)] ring-1 ring-[#38BDF8]'
                        : dayTotal > 0
                        ? 'bg-[#181820] border-white/[0.1] text-neutral-300 hover:border-white/30'
                        : 'bg-[#141418] border-white/[0.04] text-neutral-500 hover:text-neutral-300'
                    }`}
                    title={`Switch to ${formatDisplayDate(dStr)} (${dayTotal} ml)`}
                  >
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] uppercase font-mono-num ${isCurToday ? 'text-[#00E5FF] font-bold' : ''}`}>
                        {isCurToday ? 'Today' : formatDisplayDate(dStr).split(' ')[0]}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-mono-num">
                        {dStr.split('-')[2]}
                      </span>
                    </div>

                    <div className="w-full bg-white/[0.08] rounded-full h-1 my-1 overflow-hidden">
                      <div
                        style={{ width: `${Math.min((dayTotal / goals.dailyWaterMl) * 100, 100)}%` }}
                        className={`h-full rounded-full ${hit ? 'bg-emerald-400' : 'bg-[#38BDF8]'}`}
                      />
                    </div>

                    <span className={`text-[10px] font-bold font-mono-num ${dayTotal > 0 ? 'text-[#38BDF8]' : 'text-neutral-600'}`}>
                      {dayTotal > 0 ? `${dayTotal >= 1000 ? `${(dayTotal / 1000).toFixed(1)}L` : `${dayTotal}m`}` : '0m'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Selected Day Dial & Logging */}
          <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm text-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-mono-num">
                {isToday ? 'Today' : formatDisplayDate(selectedDate)}
              </span>
              <span className="text-[11px] font-mono-num text-[#38BDF8]">
                Target: {goals.dailyWaterMl} ml
              </span>
            </div>

            <div className="w-16 h-16 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] mx-auto mb-3">
              <Droplet className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white font-mono-num">
              {todayWaterTotal} <span className="text-xs text-neutral-400 font-normal">/ {goals.dailyWaterMl} ml</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {todayWaterTotal >= goals.dailyWaterMl
                ? `Hydration goal achieved for ${isToday ? 'today' : formatDisplayDate(selectedDate)}! 💧`
                : `${goals.dailyWaterMl - todayWaterTotal} ml needed to reach baseline`}
            </p>

            <div className="w-full max-w-md mx-auto bg-white/[0.06] rounded-full h-3 mt-4 overflow-hidden">
              <div
                style={{ width: `${Math.min((todayWaterTotal / goals.dailyWaterMl) * 100, 100)}%` }}
                className="bg-[#38BDF8] h-full rounded-full transition-all duration-700"
              />
            </div>

            {/* Quick add buttons */}
            <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto mt-5">
              <button
                type="button"
                onClick={() => logWater(250)}
                className="py-2.5 px-2 rounded-xl bg-[#181820] hover:bg-[#38BDF8]/20 border border-white/[0.08] hover:border-[#38BDF8]/40 text-center transition-all cursor-pointer"
              >
                <span className="text-sm font-semibold text-white block font-mono-num">+250 ml</span>
                <span className="text-[10px] text-neutral-400">Cup</span>
              </button>
              <button
                type="button"
                onClick={() => logWater(500)}
                className="py-2.5 px-2 rounded-xl bg-[#181820] hover:bg-[#38BDF8]/20 border border-white/[0.08] hover:border-[#38BDF8]/40 text-center transition-all cursor-pointer"
              >
                <span className="text-sm font-semibold text-white block font-mono-num">+500 ml</span>
                <span className="text-[10px] text-neutral-400">Bottle</span>
              </button>
              <button
                type="button"
                onClick={() => logWater(750)}
                className="py-2.5 px-2 rounded-xl bg-[#181820] hover:bg-[#38BDF8]/20 border border-white/[0.08] hover:border-[#38BDF8]/40 text-center transition-all cursor-pointer"
              >
                <span className="text-sm font-semibold text-white block font-mono-num">+750 ml</span>
                <span className="text-[10px] text-neutral-400">Tumbler</span>
              </button>
            </div>

            {/* Custom amount form */}
            <form onSubmit={handleCustomWater} className="max-w-xs mx-auto flex gap-2 mt-4">
              <input
                type="number"
                placeholder="Custom ml..."
                value={customWater}
                onChange={(e) => setCustomWater(e.target.value)}
                className="flex-1 bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#38BDF8] text-black font-semibold text-xs rounded-xl cursor-pointer"
              >
                Log
              </button>
            </form>
          </div>

          {/* Selected Day's Water History Logs */}
          <div className="bg-[#131317] border border-white/[0.08] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                {isToday ? "Today's" : formatDisplayDate(selectedDate)} Water Log History ({todayWaterLogs.length})
              </h3>
              {todayWaterLogs.length > 0 && (
                <button
                  type="button"
                  onClick={clearTodayWater}
                  className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                >
                  Reset {isToday ? "Today's" : "Day's"} Water
                </button>
              )}
            </div>

            {todayWaterLogs.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {todayWaterLogs.map((log) => (
                  <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Droplet className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span className="text-white font-mono-num font-semibold">{log.amountMl} ml</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-500 font-mono-num text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWaterLog(log.id)}
                        className="text-neutral-600 hover:text-rose-400 p-1 cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 py-3 text-center italic">
                {isToday
                  ? "No water logged yet today. Drink up and use the quick-add buttons above!"
                  : `No water was logged on ${formatDisplayDate(selectedDate)}.`}
              </p>
            )}
          </div>

          {/* Multi-Day Stored Hydration Archive */}
          <div className="bg-[#131317] border border-white/[0.08] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Saved Hydration History Across Dates ({activeWaterLogs.length} entries stored)
                </h3>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono-num">
                Persisted in storage
              </span>
            </div>

            {waterLogsByDate.length > 0 ? (
              <div className="space-y-2.5">
                {waterLogsByDate.map((group) => {
                  const isCurrentActive = group.date === selectedDate;
                  const isCurToday = group.date === todayStr;
                  return (
                    <div
                      key={group.date}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrentActive
                          ? 'bg-[#181824] border-[#38BDF8]/40 shadow-sm'
                          : 'bg-[#181820] border-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono-num">
                            {formatDisplayDate(group.date)}
                          </span>
                          {isCurToday && (
                            <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                              Today
                            </span>
                          )}
                          {isCurrentActive && (
                            <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 font-semibold">
                              Viewing Now
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono-num text-[#38BDF8]">
                            {group.totalMl} ml {group.totalMl >= 1000 ? `(${(group.totalMl / 1000).toFixed(1)} L)` : ''}
                          </span>
                          {!isCurrentActive && (
                            <button
                              type="button"
                              onClick={() => setSelectedDate(group.date)}
                              className="text-[11px] text-neutral-300 hover:text-white px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.1] transition-colors cursor-pointer"
                            >
                              View Date
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-white/[0.04]">
                        {group.logs.map((log) => (
                          <div key={log.id} className="py-1.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Droplet className="w-3 h-3 text-[#38BDF8]" />
                              <span className="text-neutral-200 font-mono-num">{log.amountMl} ml</span>
                            </div>
                            <span className="text-neutral-500 font-mono-num text-[10px]">
                              {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 py-3 text-center italic">
                No hydration records stored yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: SAVED FOODS & REUSABLE TEMPLATES */}
      {activeTab === 'savedFoods' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Reusable Foods & Templates</h2>
              <span className="text-xs text-neutral-400">Save common meals for 1-click re-logging</span>
            </div>
            <button
              onClick={() => setFoodModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-500 text-white font-semibold text-xs hover:bg-purple-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Save New Food
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.savedFoods.map((food) => (
              <div
                key={food.id}
                className="bg-[#131317] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-white">{food.name}</h3>
                    <button
                      onClick={() => deleteFoodTemplate(food.id)}
                      className="text-neutral-600 hover:text-rose-400 p-1 cursor-pointer"
                      title="Delete saved template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">
                    Standard Serving: {food.servingSize}
                  </span>

                  <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/[0.04] text-center font-mono-num">
                    <div className="p-1 rounded bg-[#181820]">
                      <span className="text-[10px] text-neutral-400 block">Kcal</span>
                      <span className="text-xs font-bold text-white">{food.calories}</span>
                    </div>
                    <div className="p-1 rounded bg-[#181820]">
                      <span className="text-[10px] text-[#00E5FF] block">P</span>
                      <span className="text-xs font-bold text-[#00E5FF]">{food.protein}g</span>
                    </div>
                    <div className="p-1 rounded bg-[#181820]">
                      <span className="text-[10px] text-amber-300 block">C</span>
                      <span className="text-xs font-bold text-amber-300">{food.carbs}g</span>
                    </div>
                    <div className="p-1 rounded bg-[#181820]">
                      <span className="text-[10px] text-rose-400 block">F</span>
                      <span className="text-xs font-bold text-rose-400">{food.fats}g</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-4">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mType) => (
                    <button
                      key={mType}
                      onClick={() => handleOneTapLogSavedFood(food, mType)}
                      className="flex-1 py-1 text-[10px] capitalize rounded-lg bg-white/[0.04] hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] border border-white/[0.04] text-neutral-300 transition-colors cursor-pointer"
                    >
                      +{mType.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD FOOD & NUTRITION SEARCH DATABASE */}
      <FoodSearchModal
        isOpen={mealModalOpen}
        onClose={() => setMealModalOpen(false)}
        initialMealType={mealType}
        targetDate={selectedDate}
      />

      {/* MODAL 2: SAVE REUSABLE FOOD TEMPLATE */}
      {foodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Save Reusable Food Template</h3>
            <p className="text-xs text-neutral-400 mb-4">Creates a saved food you can 1-tap add any day.</p>
            <form onSubmit={handleSaveFoodTemplate} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Food Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Whey Protein Shake (1 scoop)"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Calories</label>
                  <input
                    type="number"
                    placeholder="kcal"
                    value={templateCal}
                    onChange={(e) => setTemplateCal(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#00E5FF] block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="g"
                    value={templateP}
                    onChange={(e) => setTemplateP(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-amber-300 block mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="g"
                    value={templateC}
                    onChange={(e) => setTemplateC(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-rose-400 block mb-1">Fats (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="g"
                    value={templateF}
                    onChange={(e) => setTemplateF(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Serving Size</label>
                <input
                  type="text"
                  placeholder="1 scoop (32g)"
                  value={templateServing}
                  onChange={(e) => setTemplateServing(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFoodModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
