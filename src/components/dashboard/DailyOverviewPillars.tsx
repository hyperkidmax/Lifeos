import React from 'react';
import { useWellness } from '../../context/WellnessContext';
import { Card } from '../ui/Card';
import { Moon, Heart, Footprints, Utensils, Droplet, ArrowRight, Plus } from 'lucide-react';
import { isDemoRecord } from '../../utils/mockData';

export const DailyOverviewPillars: React.FC = () => {
  const {
    data,
    selectedDate,
    todaySleep,
    todayHeartRate,
    todaySteps,
    todayActiveCaloriesBurned,
    todayCaloriesConsumed,
    todayProteinConsumed,
    todayCarbsConsumed,
    todayFatConsumed,
    todayWaterTotal,
    logWater,
    setActiveTab,
    openQuickAdd,
    isDemoMode,
  } = useWellness();

  const goals = data.goals;

  // Compute previous day's date string (YYYY-MM-DD)
  const [y, m, d] = selectedDate.split('-').map(Number);
  const prevDate = new Date(y, m - 1, d);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;

  // Filter logs based on operating mode
  const stepLogs = isDemoMode ? data.stepLogs : data.stepLogs.filter((s) => !isDemoRecord(s));
  const sleepLogs = isDemoMode ? data.sleepLogs : data.sleepLogs.filter((s) => !isDemoRecord(s));
  const hrLogs = isDemoMode ? data.heartRateLogs : data.heartRateLogs.filter((h) => !isDemoRecord(h));
  const mealLogs = isDemoMode ? data.mealLogs : data.mealLogs.filter((m) => !isDemoRecord(m));
  const waterLogs = isDemoMode ? data.waterLogs : data.waterLogs.filter((w) => !isDemoRecord(w));

  // 1. Sleep Trend: only if previous day sleep exists
  const prevSleep = sleepLogs.find((s) => s.date === prevDateStr);
  const sleepDeltaMinutes = todaySleep && prevSleep ? todaySleep.totalMinutes - prevSleep.totalMinutes : null;

  // 2. Recovery / Heart Rate Trend: only if previous resting HR exists
  const prevHr = hrLogs.find((h) => h.date === prevDateStr);
  const hrDelta =
    todayHeartRate?.restingBpm && prevHr?.restingBpm
      ? todayHeartRate.restingBpm - prevHr.restingBpm
      : null;

  // 3. Activity / Step Trend: only if previous step log exists
  const prevSteps = stepLogs.find((s) => s.date === prevDateStr);
  const stepDelta = todaySteps && prevSteps ? todaySteps.count - prevSteps.count : null;

  // 4. Nutrition Trend: only if previous day meals exist
  const prevDayMeals = mealLogs.filter((m) => m.date === prevDateStr);
  const prevDayCalories = prevDayMeals.reduce((acc, m) => acc + m.calories, 0);
  const caloriesDelta =
    todayCaloriesConsumed > 0 && prevDayCalories > 0 ? todayCaloriesConsumed - prevDayCalories : null;

  // 5. Hydration Trend: only if previous day water logs exist
  const prevDayWater = waterLogs.filter((w) => w.date === prevDateStr).reduce((acc, w) => acc + w.amountMl, 0);
  const waterDelta = todayWaterTotal > 0 && prevDayWater > 0 ? todayWaterTotal - prevDayWater : null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs uppercase font-mono-num tracking-wider text-[var(--text-muted)] font-semibold">
            Five Wellness Pillars
          </h2>
          <span className="text-[10px] text-[var(--text-muted)] font-mono-num">
            · Core Domains
          </span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
          Trends based on verified historical logs
        </span>
      </div>

      {/* Clean responsive grid: 2 cols on mobile, 3 on tablet, 5 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        {/* 1. SLEEP PILLAR (Lavender accent) */}
        <Card
          variant="solid"
          accent="purple"
          hoverEffect
          padding="none"
          onClick={() => setActiveTab('health')}
          className="p-3 sm:p-3.5 cursor-pointer group flex flex-col justify-between border-[var(--card-border)] hover:border-[#A78BFA]/50 transition-all min-h-[105px]"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#A78BFA]/15 text-[#A78BFA] flex items-center justify-center shrink-0">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[#A78BFA] transition-colors truncate">
                  Sleep
                </span>
              </div>
              <ArrowRight className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[#A78BFA] transition-colors shrink-0" />
            </div>

            {todaySleep ? (
              <div className="mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[var(--text-primary)]">
                    {Math.floor(todaySleep.totalMinutes / 60)}h {todaySleep.totalMinutes % 60}m
                  </span>
                </div>
                <div className="text-[10px] font-mono-num text-[var(--text-muted)] mt-0.5 truncate">
                  {sleepDeltaMinutes !== null ? (
                    <span className={sleepDeltaMinutes >= 0 ? 'text-[#00F2A9]' : 'text-[#FB923C]'}>
                      {sleepDeltaMinutes >= 0 ? `+${sleepDeltaMinutes}m` : `${sleepDeltaMinutes}m`} vs yday
                    </span>
                  ) : todaySleep.qualityScore ? (
                    `${todaySleep.qualityScore}% score`
                  ) : (
                    `Target ${Math.round(goals.dailySleepMinutes / 60)}h`
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[var(--text-muted)] italic">Unlogged</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickAdd('health');
                  }}
                  className="text-[11px] font-medium text-[#A78BFA] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Log
                </button>
              </div>
            )}
          </div>

          {/* Micro Progress bar */}
          <div className="w-full bg-[var(--bg-subtle)] h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#A78BFA] h-full rounded-full transition-all duration-500"
              style={{
                width: `${todaySleep ? Math.min(100, (todaySleep.totalMinutes / goals.dailySleepMinutes) * 100) : 0}%`,
              }}
            />
          </div>
        </Card>

        {/* 2. RECOVERY PILLAR (Mint accent) */}
        <Card
          variant="solid"
          accent="mint"
          hoverEffect
          padding="none"
          onClick={() => setActiveTab('health')}
          className="p-3 sm:p-3.5 cursor-pointer group flex flex-col justify-between border-[var(--card-border)] hover:border-[#00F2A9]/50 transition-all min-h-[105px]"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#00F2A9]/15 text-[#00F2A9] flex items-center justify-center shrink-0">
                  <Heart className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[#00F2A9] transition-colors truncate">
                  Recovery
                </span>
              </div>
              <ArrowRight className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[#00F2A9] transition-colors shrink-0" />
            </div>

            {todayHeartRate ? (
              <div className="mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[var(--text-primary)]">
                    {todayHeartRate.restingBpm || todayHeartRate.avgBpm}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono-num">bpm</span>
                </div>
                <div className="text-[10px] font-mono-num text-[var(--text-muted)] mt-0.5 truncate">
                  {hrDelta !== null ? (
                    <span className={hrDelta <= 0 ? 'text-[#00F2A9]' : 'text-[#FB923C]'}>
                      {hrDelta <= 0 ? `${hrDelta} bpm` : `+${hrDelta} bpm`} vs yday
                    </span>
                  ) : (
                    'Resting Cardiac'
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[var(--text-muted)] italic">Unlogged</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickAdd('health');
                  }}
                  className="text-[11px] font-medium text-[#00F2A9] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Log
                </button>
              </div>
            )}
          </div>

          {/* Micro Progress bar */}
          <div className="w-full bg-[var(--bg-subtle)] h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#00F2A9] h-full rounded-full transition-all duration-500"
              style={{
                width: `${todayHeartRate ? Math.min(100, Math.max(20, 100 - ((todayHeartRate.restingBpm || 65) - 45) * 2)) : 0}%`,
              }}
            />
          </div>
        </Card>

        {/* 3. ACTIVITY PILLAR (Cyan accent) */}
        <Card
          variant="solid"
          accent="cyan"
          hoverEffect
          padding="none"
          onClick={() => setActiveTab('fitness')}
          className="p-3 sm:p-3.5 cursor-pointer group flex flex-col justify-between border-[var(--card-border)] hover:border-[#00E5FF]/50 transition-all min-h-[105px]"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#00E5FF]/15 text-[#00E5FF] flex items-center justify-center shrink-0">
                  <Footprints className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[#00E5FF] transition-colors truncate">
                  Activity
                </span>
              </div>
              <ArrowRight className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[#00E5FF] transition-colors shrink-0" />
            </div>

            {todaySteps ? (
              <div className="mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold font-mono-num text-[var(--text-primary)]">
                    {todaySteps.count >= 1000 ? `${(todaySteps.count / 1000).toFixed(1)}k` : todaySteps.count}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono-num">steps</span>
                </div>
                <div className="text-[10px] font-mono-num text-[var(--text-muted)] mt-0.5 truncate">
                  {stepDelta !== null ? (
                    <span className={stepDelta >= 0 ? 'text-[#00F2A9]' : 'text-[#FB923C]'}>
                      {stepDelta >= 0 ? `+${stepDelta}` : stepDelta} vs yday
                    </span>
                  ) : (
                    `${todayActiveCaloriesBurned} kcal active`
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[var(--text-muted)] italic">0 steps</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickAdd('health');
                  }}
                  className="text-[11px] font-medium text-[#00E5FF] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Log
                </button>
              </div>
            )}
          </div>

          {/* Micro Progress bar */}
          <div className="w-full bg-[var(--bg-subtle)] h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#00E5FF] h-full rounded-full transition-all duration-500"
              style={{
                width: `${todaySteps ? Math.min(100, (todaySteps.count / goals.dailySteps) * 100) : 0}%`,
              }}
            />
          </div>
        </Card>

        {/* 4. NUTRITION PILLAR (Warm Yellow / Solar Amber accent) */}
        <Card
          variant="solid"
          accent="orange"
          hoverEffect
          padding="none"
          onClick={() => setActiveTab('nutrition')}
          className="p-3 sm:p-3.5 cursor-pointer group flex flex-col justify-between border-[var(--card-border)] hover:border-[#F59E0B]/50 transition-all min-h-[105px]"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center shrink-0">
                  <Utensils className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[#F59E0B] transition-colors truncate">
                  Nutrition
                </span>
              </div>
              <ArrowRight className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[#F59E0B] transition-colors shrink-0" />
            </div>

            <div className="mt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold font-mono-num text-[var(--text-primary)]">
                  {todayCaloriesConsumed}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono-num">kcal</span>
              </div>
              <div className="text-[10px] font-mono-num text-[var(--text-muted)] mt-0.5 truncate">
                {caloriesDelta !== null ? (
                  <span className={caloriesDelta <= 0 ? 'text-[#00F2A9]' : 'text-[#FB923C]'}>
                    {caloriesDelta <= 0 ? `${caloriesDelta} kcal` : `+${caloriesDelta} kcal`} vs yday
                  </span>
                ) : (
                  `${todayProteinConsumed}g protein`
                )}
              </div>
            </div>
          </div>

          {/* Micro Progress bar */}
          <div className="w-full bg-[var(--bg-subtle)] h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#F59E0B] h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (todayCaloriesConsumed / goals.dailyCalories) * 100)}%`,
              }}
            />
          </div>
        </Card>

        {/* 5. HYDRATION PILLAR (Azure / Water accent) */}
        <Card
          variant="solid"
          accent="water"
          hoverEffect
          padding="none"
          className="p-3 sm:p-3.5 cursor-pointer group flex flex-col justify-between border-[var(--card-border)] hover:border-[#38BDF8]/50 transition-all min-h-[105px] col-span-2 sm:col-span-1"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center shrink-0">
                  <Droplet className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[#38BDF8] transition-colors truncate">
                  Hydration
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  logWater(250);
                }}
                className="px-1.5 py-0.5 rounded-md bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/30 text-[9px] font-mono-num font-semibold transition-colors cursor-pointer"
                title="Quick add 250ml"
              >
                +250ml
              </button>
            </div>

            <div className="mt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold font-mono-num text-[var(--text-primary)]">
                  {todayWaterTotal}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono-num">
                  / {goals.dailyWaterMl} ml
                </span>
              </div>
              <div className="text-[10px] font-mono-num text-[var(--text-muted)] mt-0.5 truncate">
                {waterDelta !== null ? (
                  <span className={waterDelta >= 0 ? 'text-[#00F2A9]' : 'text-[#FB923C]'}>
                    {waterDelta >= 0 ? `+${waterDelta} ml` : `${waterDelta} ml`} vs yday
                  </span>
                ) : (
                  `${Math.round((todayWaterTotal / goals.dailyWaterMl) * 100)}% of daily goal`
                )}
              </div>
            </div>
          </div>

          {/* Micro Progress bar */}
          <div className="w-full bg-[var(--bg-subtle)] h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#38BDF8] h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (todayWaterTotal / goals.dailyWaterMl) * 100)}%`,
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};
