import React, { useState } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { isDemoRecord } from '../../utils/mockData';
import { MultiRingWidget } from '../common/ProgressRing';
import { formatFullDate, formatDisplayDate } from '../../utils/dateUtils';
import {
  Footprints,
  Flame,
  Moon,
  Heart,
  Droplet,
  Utensils,
  Dumbbell,
  CheckCircle2,
  Circle,
  Plus,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Activity,
  ShieldCheck,
  Settings,
} from 'lucide-react';

export const HomeDashboard: React.FC = () => {
  const {
    data,
    isDemoMode,
    hasDemoRecords,
    selectedDate,
    isToday,
    setActiveTab,
    openQuickAdd,
    logWater,
    todaySteps,
    todaySleep,
    todayHeartRate,
    todayWaterTotal,
    todayCaloriesConsumed,
    todayProteinConsumed,
    todayCarbsConsumed,
    todayFatConsumed,
    todayActiveCaloriesBurned,
    todayWorkouts,
    todayPriorities,
    togglePriority,
    todayHabitsStatus,
    toggleHabit,
    loadDemoData,
    clearDemoDataOnly,
  } = useWellness();

  const [showClearDemoConfirm, setShowClearDemoConfirm] = useState(false);
  const [showLoadDemoConfirm, setShowLoadDemoConfirm] = useState(false);

  const goals = data.goals;

  // Prepare 3 concentric daily goals rings
  const rings = [
    {
      id: 'steps',
      label: 'Steps',
      current: todaySteps?.count || 0,
      goal: goals.dailySteps,
      unit: 'steps',
      color: '#00E5FF', // Cyan (outer ring)
    },
    {
      id: 'activeKcal',
      label: 'Active Burn',
      current: todayActiveCaloriesBurned,
      goal: goals.dailyActiveCalories,
      unit: 'kcal',
      color: '#FF725C', // Coral (middle ring)
    },
    {
      id: 'water',
      label: 'Hydration',
      current: todayWaterTotal,
      goal: goals.dailyWaterMl,
      unit: 'ml',
      color: '#38BDF8', // Azure (inner ring)
    },
  ];

  return (
    <div className="space-y-6 pb-28 pt-2">
      {/* Demo Mode vs Real Mode Notice Banner */}
      {isDemoMode || hasDemoRecords ? (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-neutral-300">
              <strong className="text-amber-300 font-semibold">Demo Mode Active</strong> · Realistic sample metrics are currently loaded for preview. Real Mode operates strictly from your manual inputs.
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => setShowClearDemoConfirm(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Clear Demo Data
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06] text-[11px] transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-neutral-300">
              <strong className="text-emerald-300 font-semibold">Real Mode Active</strong> · No synthetic health data. Displaying your authentic manual records.
            </span>
          </div>
          <button
            onClick={() => setShowLoadDemoConfirm(true)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08] text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
          >
            Load Demo Data
          </button>
        </div>
      )}

      {/* Date & Overview Ring Hero Card */}
      <div className="bg-gradient-to-b from-[#141419] to-[#101014] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle cyan ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00E5FF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-stretch justify-between gap-6 relative z-10">
          <div className="flex-1 text-center sm:text-left">
            <span className="text-xs font-mono-num uppercase tracking-wider text-[#00E5FF] font-semibold">
              Daily Wellness Overview
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              {formatFullDate(selectedDate)}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              Track real-time biometric metrics, nutrition macros, workouts, and cognitive habits.
            </p>

            {/* Quick Micro Ring Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <Footprints className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>Steps</span>
                </div>
                <div className="text-sm font-bold font-mono-num text-white mt-0.5">
                  {todaySteps ? todaySteps.count.toLocaleString() : <span className="text-neutral-500 text-xs font-normal">No data yet</span>}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <Flame className="w-3.5 h-3.5 text-[#FF725C]" />
                  <span>Active Burn</span>
                </div>
                <div className="text-sm font-bold font-mono-num text-white mt-0.5">
                  {todayActiveCaloriesBurned > 0 ? (
                    `${todayActiveCaloriesBurned} kcal`
                  ) : (
                    <span className="text-neutral-500 text-xs font-normal">No data yet</span>
                  )}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <Droplet className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Water</span>
                </div>
                <div className="text-sm font-bold font-mono-num text-white mt-0.5">
                  {todayWaterTotal > 0 ? (
                    `${(todayWaterTotal / 1000).toFixed(1)} L`
                  ) : (
                    <span className="text-neutral-500 text-xs font-normal">0 L</span>
                  )}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <Moon className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>Sleep</span>
                </div>
                <div className="text-sm font-bold font-mono-num text-white mt-0.5">
                  {todaySleep ? (
                    `${Math.floor(todaySleep.totalMinutes / 60)}h ${todaySleep.totalMinutes % 60}m`
                  ) : (
                    <span className="text-neutral-500 text-xs font-normal">No data yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Central concentric ring chart */}
          <div className="flex flex-col items-center justify-center shrink-0 gap-2.5">
            <MultiRingWidget rings={rings} size={150} />
            <div className="flex items-center justify-center gap-3 text-[10px] text-neutral-400 select-none">
              <span className="flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_6px_rgba(0,229,255,0.5)]" /> Steps
              </span>
              <span className="flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#FF725C] shadow-[0_0_6px_rgba(255,114,92,0.5)]" /> Burn
              </span>
              <span className="flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_6px_rgba(56,189,248,0.5)]" /> Water
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Dock */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">Quick Log</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => openQuickAdd('water')}
              className="px-2.5 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/30 text-sky-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Droplet className="w-3.5 h-3.5" />
              + Water
            </button>
            <button
              onClick={() => openQuickAdd('meal')}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" />
              + Meal
            </button>
            <button
              onClick={() => openQuickAdd('workout')}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              + Workout
            </button>
            <button
              onClick={() => openQuickAdd('health')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              + Metric
            </button>
          </div>
        </div>
      </div>

      {/* METRIC CARDS GRID (Steps, Active Calories, Sleep, Heart Rate, Water, Consumed Calories, Protein) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
            Biometrics & Fuel
          </h2>
          <span className="text-[11px] text-neutral-500">
            Manual log · Local mode
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. STEPS CARD */}
          <div
            onClick={() => setActiveTab('health')}
            className="group bg-[#131317] hover:bg-[#16161c] border border-white/[0.08] hover:border-[#00E5FF]/40 rounded-2xl p-4.5 transition-all cursor-pointer shadow-sm relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
                  <Footprints className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-white">Daily Steps</h3>
                    {isDemoRecord(todaySteps) && (
                      <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        Demo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400">Target: {goals.dailySteps.toLocaleString()}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#00E5FF] transition-colors" />
            </div>

            <div className="mt-3.5">
              {todaySteps ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono-num text-white">
                      {todaySteps.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono-num">
                      {Math.round((todaySteps.count / goals.dailySteps) * 100)}% of goal
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-[#00E5FF] h-full rounded-full transition-all duration-700 cyan-glow-subtle"
                      style={{ width: `${Math.min((todaySteps.count / goals.dailySteps) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 font-mono-num">
                    <span>{todaySteps.distanceKm} km</span>
                    <span>{todaySteps.activeMinutes} active mins</span>
                  </div>
                </>
              ) : (
                <div className="py-2 flex items-center justify-between">
                  <span className="text-sm text-neutral-500 italic">No data yet</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickAdd('health');
                    }}
                    className="text-xs text-[#00E5FF] hover:underline"
                  >
                    + Log steps
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. ACTIVE CALORIES CARD */}
          <div
            onClick={() => setActiveTab('fitness')}
            className="group bg-[#131317] hover:bg-[#16161c] border border-white/[0.08] hover:border-[#FF725C]/40 rounded-2xl p-4.5 transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FF725C]/10 border border-[#FF725C]/30 flex items-center justify-center text-[#FF725C]">
                  <Flame className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-white">Active Calories</h3>
                    {todayWorkouts.some(isDemoRecord) && (
                      <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        Demo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400">Target: {goals.dailyActiveCalories} kcal</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#FF725C] transition-colors" />
            </div>

            <div className="mt-3.5">
              {todayActiveCaloriesBurned > 0 ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono-num text-white">
                      {todayActiveCaloriesBurned}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono-num">
                      kcal burned
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-[#FF725C] h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((todayActiveCaloriesBurned / goals.dailyActiveCalories) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2">
                    <span>{todayWorkouts.length} workout(s) logged</span>
                    <span>{todaySteps?.caloriesBurned || 0} kcal step burn</span>
                  </div>
                </>
              ) : (
                <div className="py-2 flex items-center justify-between">
                  <span className="text-sm text-neutral-500 italic">No data yet</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickAdd('workout');
                    }}
                    className="text-xs text-[#FF725C] hover:underline"
                  >
                    + Log workout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 3. SLEEP CARD */}
          <div
            onClick={() => setActiveTab('health')}
            className="group bg-[#131317] hover:bg-[#16161c] border border-white/[0.08] hover:border-[#818CF8]/40 rounded-2xl p-4.5 transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#818CF8]/10 border border-[#818CF8]/30 flex items-center justify-center text-[#818CF8]">
                  <Moon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-white">Sleep Duration</h3>
                    {isDemoRecord(todaySleep) && (
                      <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        Demo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400">Target: {Math.round(goals.dailySleepMinutes / 60)}h</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#818CF8] transition-colors" />
            </div>

            <div className="mt-3.5">
              {todaySleep ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono-num text-white">
                      {Math.floor(todaySleep.totalMinutes / 60)}h {todaySleep.totalMinutes % 60}m
                    </span>
                    {todaySleep.qualityScore && (
                      <span className="text-xs text-indigo-300 font-mono-num bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        {todaySleep.qualityScore}% Score
                      </span>
                    )}
                  </div>
                  {todaySleep.stages && (
                    <div className="w-full flex h-2 rounded-full overflow-hidden mt-2 gap-0.5">
                      <div
                        title={`Deep: ${todaySleep.stages.deepMinutes}m`}
                        style={{ width: `${(todaySleep.stages.deepMinutes / todaySleep.totalMinutes) * 100}%` }}
                        className="bg-indigo-500"
                      />
                      <div
                        title={`REM: ${todaySleep.stages.remMinutes}m`}
                        style={{ width: `${(todaySleep.stages.remMinutes / todaySleep.totalMinutes) * 100}%` }}
                        className="bg-purple-400"
                      />
                      <div
                        title={`Light: ${todaySleep.stages.lightMinutes}m`}
                        style={{ width: `${(todaySleep.stages.lightMinutes / todaySleep.totalMinutes) * 100}%` }}
                        className="bg-sky-400"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 font-mono-num">
                    <span>Deep: {todaySleep.stages?.deepMinutes || 0}m</span>
                    <span>REM: {todaySleep.stages?.remMinutes || 0}m</span>
                    <span>Light: {todaySleep.stages?.lightMinutes || 0}m</span>
                  </div>
                </>
              ) : (
                <div className="py-2 flex items-center justify-between">
                  <span className="text-sm text-neutral-500 italic">No data yet</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickAdd('health');
                    }}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    + Log sleep
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. HEART RATE CARD */}
          <div
            onClick={() => setActiveTab('health')}
            className="group bg-[#131317] hover:bg-[#16161c] border border-white/[0.08] hover:border-rose-500/40 rounded-2xl p-4.5 transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Heart className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-white">Heart Rate</h3>
                    {isDemoRecord(todayHeartRate) && (
                      <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        Demo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400">Resting & Cardiac</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-rose-400 transition-colors" />
            </div>

            <div className="mt-3.5">
              {todayHeartRate ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono-num text-white">
                      {todayHeartRate.restingBpm || todayHeartRate.avgBpm}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono-num">
                      bpm (Resting)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-2 font-mono-num">
                    <span>Avg: {todayHeartRate.avgBpm} bpm</span>
                    <span>·</span>
                    <span>Range: {todayHeartRate.minBpm} - {todayHeartRate.maxBpm} bpm</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1.5">
                    Sensor: {todayHeartRate.source === 'demo' ? 'Sample biometrics' : 'Manual entry'}
                  </p>
                </>
              ) : (
                <div className="py-2 flex items-center justify-between">
                  <span className="text-sm text-neutral-500 italic">Not connected</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickAdd('health');
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    + Log reading
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 5. WATER INTAKE CARD */}
          <div className="bg-[#131317] border border-white/[0.08] hover:border-[#38BDF8]/40 rounded-2xl p-4.5 transition-all shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
                  <Droplet className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-white">Water Intake</h3>
                    {!isToday && (
                      <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        {formatDisplayDate(selectedDate)}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400">Target: {goals.dailyWaterMl} ml</span>
                </div>
              </div>
              <button
                onClick={() => logWater(250)}
                className="px-2.5 py-1 rounded-lg bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-[#38BDF8] border border-[#38BDF8]/40 text-xs font-semibold font-mono-num cursor-pointer transition-colors"
                title="Quick Add 250ml"
              >
                +250 ml
              </button>
            </div>

            <div className="mt-3.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-num text-white">
                  {todayWaterTotal}
                </span>
                <span className="text-xs text-neutral-400 font-mono-num">
                  / {goals.dailyWaterMl} ml ({Math.round((todayWaterTotal / goals.dailyWaterMl) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-[#38BDF8] h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((todayWaterTotal / goals.dailyWaterMl) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2">
                <span>{goals.dailyWaterMl - todayWaterTotal > 0 ? `${goals.dailyWaterMl - todayWaterTotal} ml remaining` : 'Goal reached! 🎉'}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openQuickAdd('water')}
                    className="text-neutral-400 hover:text-white text-xs underline cursor-pointer"
                  >
                    Custom
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => setActiveTab('nutrition')}
                    className="text-[#38BDF8] hover:underline text-xs cursor-pointer"
                  >
                    All Days →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 6. CONSUMED CALORIES CARD */}
          <div
            onClick={() => setActiveTab('nutrition')}
            className="group bg-[#131317] hover:bg-[#16161c] border border-white/[0.08] hover:border-amber-400/40 rounded-2xl p-4.5 transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Utensils className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Consumed Calories</h3>
                  <span className="text-[11px] text-neutral-400">Target: {goals.dailyCalories} kcal</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors" />
            </div>

            <div className="mt-3.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-num text-white">
                  {todayCaloriesConsumed}
                </span>
                <span className="text-xs text-neutral-400 font-mono-num">
                  kcal ({Math.max(0, goals.dailyCalories - todayCaloriesConsumed)} left)
                </span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((todayCaloriesConsumed / goals.dailyCalories) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 font-mono-num">
                <span>C: {todayCarbsConsumed}g</span>
                <span>F: {todayFatConsumed}g</span>
                <span>P: {todayProteinConsumed}g</span>
              </div>
            </div>
          </div>

          {/* 7. PROTEIN INTAKE CARD */}
          <div
            onClick={() => setActiveTab('nutrition')}
            className="group bg-[#131317] hover:bg-[#16161c] border border-white/[0.08] hover:border-[#00E5FF]/40 rounded-2xl p-4.5 transition-all cursor-pointer shadow-sm sm:col-span-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Protein Target</h3>
                  <span className="text-[11px] text-neutral-400">Essential macro for lean mass repair</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold font-mono-num text-[#00E5FF]">
                  {todayProteinConsumed}g
                </span>
                <span className="text-xs text-neutral-400 block font-mono-num">
                  / {goals.dailyProteinG}g target
                </span>
              </div>
            </div>

            <div className="mt-3">
              <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#00E5FF] h-full rounded-full transition-all duration-700 cyan-glow-subtle"
                  style={{ width: `${Math.min((todayProteinConsumed / goals.dailyProteinG) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2">
                <span>
                  {goals.dailyProteinG - todayProteinConsumed > 0
                    ? `${goals.dailyProteinG - todayProteinConsumed}g needed to reach target`
                    : 'Target fulfilled! ⚡'}
                </span>
                <span className="text-[#00E5FF] text-xs font-medium">Log meal in Nutrition →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MY DAY SNAPSHOT (Top Priorities & Habit Streaks) */}
      <div className="bg-[#121216] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">My Day Snapshot</h2>
            <span className="text-[11px] text-neutral-400">· Focus & Habits</span>
          </div>
          <button
            onClick={() => setActiveTab('myday')}
            className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Open My Day <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Daily Priorities checklist */}
        <div className="space-y-2 mb-4">
          {todayPriorities.length > 0 ? (
            todayPriorities.map((prio) => (
              <div
                key={prio.id}
                onClick={() => togglePriority(prio.id)}
                className={`p-2.5 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer ${
                  prio.completed
                    ? 'bg-neutral-900/60 border-white/[0.04] text-neutral-500'
                    : 'bg-[#18181f] border-white/[0.08] text-white hover:border-[#00E5FF]/40'
                }`}
              >
                {prio.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-neutral-500 shrink-0" />
                )}
                <span className={`text-xs flex-1 ${prio.completed ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
                  {prio.text}
                </span>
              </div>
            ))
          ) : (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-neutral-500 flex items-center justify-between">
              <span>No daily priorities set for today.</span>
              <button
                onClick={() => openQuickAdd('priority')}
                className="text-xs text-[#00E5FF] hover:underline"
              >
                + Add priority
              </button>
            </div>
          )}
        </div>

        {/* Habits Quick Row */}
        <div>
          <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-2 font-medium">
            Daily Habits
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {todayHabitsStatus.map(({ habit, isCompleted }) => (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#18181f] border-white/[0.06] text-neutral-400 hover:text-white hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono-num font-semibold">
                    🔥 {habit.streak}d streak
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-neutral-600" />
                  )}
                </div>
                <p className="text-xs font-medium text-white line-clamp-1">{habit.title}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL: CLEAR DEMO DATA ONLY */}
      {showClearDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear Demo Records Only?</h3>
                <span className="text-xs text-neutral-400">Non-destructive demo removal</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06] text-xs text-neutral-300 space-y-2 leading-relaxed">
              <p>
                This will remove only sample records generated for demonstration purposes.
              </p>
              <p className="text-emerald-300 font-medium">
                ✓ Your real logged meals, workouts, water intake, daily priorities, and journal reflections will remain 100% intact and safe.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowClearDemoConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearDemoDataOnly();
                  setShowClearDemoConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold cursor-pointer transition-colors shadow-lg"
              >
                Confirm: Clear Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: LOAD DEMO DATA */}
      {showLoadDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-[#00E5FF]/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Load Realistic Demo Data?</h3>
                <span className="text-xs text-neutral-400">Testing & preview dataset</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06] text-xs text-neutral-300 space-y-2 leading-relaxed">
              <p>
                This will populate realistic sample workouts, nutrition macros, hypnogram sleep stages, and weight logs clearly labelled as <strong className="text-[#00E5FF]">Demo Data</strong>.
              </p>
              <p className="text-neutral-400">
                Any existing personal logs you created will remain safe and merged alongside the demo records.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLoadDemoConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  loadDemoData();
                  setShowLoadDemoConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-black text-xs font-bold cursor-pointer transition-colors cyan-glow"
              >
                Confirm: Load Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
