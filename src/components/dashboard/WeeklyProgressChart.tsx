import React, { useState } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { Card } from '../ui/Card';
import { formatDisplayDate } from '../../utils/dateUtils';
import { isDemoRecord } from '../../utils/mockData';
import { BarChart3, Plus } from 'lucide-react';

type ChartMetric = 'steps' | 'burn' | 'water' | 'sleep';
type TimeRange = '7d' | '14d';

export const WeeklyProgressChart: React.FC = () => {
  const { data, selectedDate, setSelectedDate, isDemoMode, openQuickAdd } = useWellness();
  const [metric, setMetric] = useState<ChartMetric>('steps');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const goals = data.goals;

  // Filter logs appropriately based on operating mode
  const stepLogs = isDemoMode ? data.stepLogs : data.stepLogs.filter((s) => !isDemoRecord(s));
  const workoutLogs = isDemoMode ? data.workoutLogs : data.workoutLogs.filter((w) => !isDemoRecord(w));
  const waterLogs = isDemoMode ? data.waterLogs : data.waterLogs.filter((w) => !isDemoRecord(w));
  const sleepLogs = isDemoMode ? data.sleepLogs : data.sleepLogs.filter((s) => !isDemoRecord(s));

  // Compute dates array for either 7 or 14 days ending today
  const dayCount = timeRange === '7d' ? 7 : 14;
  const rangeDates: string[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    rangeDates.push(`${year}-${month}-${day}`);
  }

  // Build daily data points
  const dailyData = rangeDates.map((dateStr) => {
    // 1. Steps
    const stepLog = stepLogs.find((s) => s.date === dateStr);
    const steps = stepLog ? stepLog.count : 0;

    // 2. Active Calories Burned
    const workoutsOnDay = workoutLogs.filter((w) => w.date === dateStr);
    const workoutBurn = workoutsOnDay.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);
    const stepBurn = stepLog ? stepLog.caloriesBurned : 0;
    const burn = workoutBurn + stepBurn;

    // 3. Water
    const waterOnDay = waterLogs.filter((w) => w.date === dateStr);
    const water = waterOnDay.reduce((acc, w) => acc + w.amountMl, 0);

    // 4. Sleep in hours
    const sleepOnDay = sleepLogs.find((s) => s.date === dateStr);
    const sleepHrs = sleepOnDay ? parseFloat((sleepOnDay.totalMinutes / 60).toFixed(1)) : 0;

    return {
      date: dateStr,
      label: formatDisplayDate(dateStr).split(',')[0], // e.g. "Mon"
      shortDate: dateStr.slice(5), // e.g. "11-08"
      steps,
      burn,
      water,
      sleep: sleepHrs,
      isToday: dateStr === rangeDates[rangeDates.length - 1],
      isSelected: dateStr === selectedDate,
    };
  });

  const totalHistoricalRecords =
    stepLogs.length + workoutLogs.length + waterLogs.length + sleepLogs.length;
  const hasAnyMetricDataInRange = dailyData.some(
    (d) => d.steps > 0 || d.burn > 0 || d.water > 0 || d.sleep > 0
  );

  const targetValue = {
    steps: goals.dailySteps,
    burn: goals.dailyActiveCalories,
    water: goals.dailyWaterMl,
    sleep: Math.round(goals.dailySleepMinutes / 60),
  }[metric];

  const metricLabel = {
    steps: 'Steps',
    burn: 'Active Burn (kcal)',
    water: 'Hydration (ml)',
    sleep: 'Sleep (hours)',
  }[metric];

  const metricColor = {
    steps: '#00F2A9',
    burn: '#00E5FF',
    water: '#38BDF8',
    sleep: '#A78BFA',
  }[metric];

  const currentValues = dailyData.map((d) => d[metric]);
  const hasDataForMetric = currentValues.some((v) => v > 0);
  const maxValue = Math.max(...currentValues, targetValue, 5);
  const averageValue = hasDataForMetric
    ? (currentValues.reduce((a, b) => a + b, 0) / (currentValues.filter((v) => v > 0).length || 1)).toFixed(
        metric === 'sleep' ? 1 : 0
      )
    : '0';

  // SVG Chart Dimensions (Compact, height 135px)
  const chartHeight = 135;
  const chartWidth = 520;
  const paddingX = 24;
  const barWidth = timeRange === '7d' ? 24 : 13;
  const usableWidth = chartWidth - paddingX * 2;
  const stepX = usableWidth / (dailyData.length - 1 || 1);

  // Target Y line calculation
  const targetY = chartHeight - 28 - (targetValue / (maxValue * 1.15)) * (chartHeight - 44);

  return (
    <Card variant="solid" padding="sm" className="space-y-3 sm:p-4">
      {/* Header, Range Selector & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-[#00F2A9]" />
            <h3 className="text-xs font-semibold uppercase font-mono-num tracking-wider text-[var(--text-primary)]">
              Weekly Trends
            </h3>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {timeRange === '7d' ? '7-Day' : '14-Day'} active average:{' '}
            <strong className="font-mono-num text-[var(--text-primary)]">{averageValue}</strong>{' '}
            {metric === 'steps' ? 'steps' : metric === 'burn' ? 'kcal' : metric === 'water' ? 'ml' : 'hrs'}
          </p>
        </div>

        {/* Controls: Time range & Metric tabs */}
        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          {/* Time range */}
          <div className="inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--card-border)] rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-1.5 py-0.5 text-[10px] font-mono-num rounded-md transition-all cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-[var(--card-surface)] text-[var(--text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('14d')}
              className={`px-1.5 py-0.5 text-[10px] font-mono-num rounded-md transition-all cursor-pointer ${
                timeRange === '14d'
                  ? 'bg-[var(--card-surface)] text-[var(--text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              14D
            </button>
          </div>

          {/* Metric Selector */}
          <div className="inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--card-border)] rounded-lg p-0.5 gap-0.5">
            {(['steps', 'burn', 'water', 'sleep'] as ChartMetric[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                  metric === m
                    ? 'bg-[var(--card-surface)] text-[var(--text-primary)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m === 'steps' ? 'Steps' : m === 'burn' ? 'Burn' : m === 'water' ? 'Water' : 'Sleep'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* When NO historical data exists at all, display honest empty state */}
      {totalHistoricalRecords === 0 || !hasAnyMetricDataInRange ? (
        <div className="py-4 text-center bg-[var(--bg-subtle)] rounded-xl border border-[var(--card-border)] px-4 flex flex-col items-center justify-center gap-1.5">
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            No Historical Records Available Yet
          </p>
          <p className="text-[11px] text-[var(--text-muted)] max-w-sm leading-relaxed">
            As you log your daily steps, sleep, hydration, and workouts, LifeOS will construct your 7-day and 14-day biometric trend lines here.
          </p>
          <button
            type="button"
            onClick={() => openQuickAdd()}
            className="mt-1 px-3 py-1.5 rounded-lg bg-[#00F2A9] text-[#060A08] text-xs font-semibold hover:bg-[#00d896] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" /> Log First Entry
          </button>
        </div>
      ) : hasDataForMetric ? (
        <div className="w-full overflow-x-auto no-scrollbar pt-1">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-36 select-none overflow-visible"
          >
            {/* Target Reference Line */}
            {targetValue > 0 && targetY >= 12 && targetY <= chartHeight - 26 && (
              <>
                <line
                  x1={paddingX}
                  y1={targetY}
                  x2={chartWidth - paddingX}
                  y2={targetY}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-[var(--text-muted)] opacity-35"
                />
                <text
                  x={chartWidth - paddingX}
                  y={targetY - 4}
                  textAnchor="end"
                  className="fill-[var(--text-muted)] text-[8.5px] font-mono-num font-medium"
                >
                  Goal {targetValue.toLocaleString()} {metric === 'sleep' ? 'h' : ''}
                </text>
              </>
            )}

            {/* Daily Bars */}
            {dailyData.map((d, idx) => {
              const val = d[metric];
              const barHeight = val > 0 ? Math.max(4, (val / (maxValue * 1.15)) * (chartHeight - 44)) : 2;
              const x = paddingX + idx * stepX - barWidth / 2;
              const y = chartHeight - 24 - barHeight;
              const isToday = d.isToday;

              return (
                <g
                  key={d.date}
                  className="cursor-pointer group"
                  onClick={() => setSelectedDate(d.date)}
                >
                  {/* Hover background column */}
                  <rect
                    x={x - 2}
                    y={6}
                    width={barWidth + 4}
                    height={chartHeight - 28}
                    rx={3}
                    fill="currentColor"
                    className="text-[var(--bg-subtle)] opacity-0 group-hover:opacity-40 transition-opacity"
                  />

                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={timeRange === '7d' ? 4 : 2.5}
                    fill={isToday ? metricColor : 'currentColor'}
                    className={
                      isToday
                        ? 'drop-shadow-[0_0_6px_rgba(0,242,169,0.3)] transition-all duration-300'
                        : val > 0
                        ? 'text-[var(--card-border-hover)] group-hover:text-[var(--text-secondary)] transition-all duration-300'
                        : 'text-[var(--bg-subtle)]'
                    }
                  />

                  {/* Value text above bar (shown for 7d view) */}
                  {timeRange === '7d' && val > 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 3}
                      textAnchor="middle"
                      className="fill-[var(--text-muted)] text-[8.5px] font-mono-num font-semibold"
                    >
                      {metric === 'steps' && val >= 1000
                        ? `${(val / 1000).toFixed(1)}k`
                        : val}
                    </text>
                  )}

                  {/* Day label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    className={`text-[9px] font-mono-num ${
                      d.isSelected
                        ? 'fill-[#00F2A9] font-bold'
                        : isToday
                        ? 'fill-[var(--text-primary)] font-semibold'
                        : 'fill-[var(--text-muted)]'
                    }`}
                  >
                    {timeRange === '7d' ? d.label : d.shortDate.slice(3)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        /* Inline note if this specific metric has no entries in the range */
        <div className="py-2.5 text-center bg-[var(--bg-subtle)] rounded-xl border border-[var(--card-border)] px-3 text-[11px] text-[var(--text-muted)]">
          No {metricLabel} logged in this {timeRange === '7d' ? '7-day' : '14-day'} window.
        </div>
      )}
    </Card>
  );
};
