import React from 'react';
import { useWellness } from '../../context/WellnessContext';
import { Card } from '../ui/Card';
import { Footprints, Flame, Droplet, Moon, Utensils } from 'lucide-react';

export const DailyMetricsOverview: React.FC = () => {
  const {
    data,
    todaySteps,
    todayActiveCaloriesBurned,
    todayWaterTotal,
    todaySleep,
    todayCaloriesConsumed,
    setActiveTab,
  } = useWellness();

  const goals = data.goals;

  const metrics = [
    {
      id: 'steps',
      label: 'Steps',
      current: todaySteps ? todaySteps.count : 0,
      target: goals.dailySteps,
      displayCurrent: todaySteps ? (todaySteps.count >= 1000 ? `${(todaySteps.count / 1000).toFixed(1)}k` : `${todaySteps.count}`) : '0',
      displayTarget: `${Math.round(goals.dailySteps / 1000)}k`,
      unit: 'steps',
      icon: Footprints,
      color: '#00E5FF',
      tab: 'fitness' as const,
    },
    {
      id: 'burn',
      label: 'Active Burn',
      current: todayActiveCaloriesBurned,
      target: goals.dailyActiveCalories,
      displayCurrent: `${todayActiveCaloriesBurned}`,
      displayTarget: `${goals.dailyActiveCalories}`,
      unit: 'kcal',
      icon: Flame,
      color: '#00F2A9',
      tab: 'fitness' as const,
    },
    {
      id: 'water',
      label: 'Water Intake',
      current: todayWaterTotal,
      target: goals.dailyWaterMl,
      displayCurrent: todayWaterTotal >= 1000 ? `${(todayWaterTotal / 1000).toFixed(1)}L` : `${todayWaterTotal}ml`,
      displayTarget: `${(goals.dailyWaterMl / 1000).toFixed(1)}L`,
      unit: 'ml',
      icon: Droplet,
      color: '#38BDF8',
      tab: 'nutrition' as const,
    },
    {
      id: 'sleep',
      label: 'Sleep Duration',
      current: todaySleep ? todaySleep.totalMinutes : 0,
      target: goals.dailySleepMinutes,
      displayCurrent: todaySleep ? `${Math.floor(todaySleep.totalMinutes / 60)}h ${todaySleep.totalMinutes % 60}m` : '0h',
      displayTarget: `${Math.round(goals.dailySleepMinutes / 60)}h`,
      unit: 'hrs',
      icon: Moon,
      color: '#A78BFA',
      tab: 'health' as const,
    },
    {
      id: 'nutrition',
      label: 'Nutrition Budget',
      current: todayCaloriesConsumed,
      target: goals.dailyCalories,
      displayCurrent: `${todayCaloriesConsumed}`,
      displayTarget: `${goals.dailyCalories}`,
      unit: 'kcal',
      icon: Utensils,
      color: '#F59E0B',
      tab: 'nutrition' as const,
    },
  ];

  return (
    <Card variant="solid" padding="sm" className="space-y-2.5 sm:p-3.5">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs uppercase font-mono-num tracking-wider text-[var(--text-muted)] font-semibold">
            Daily Overview
          </h2>
          <span className="text-[10px] text-[var(--text-muted)] font-mono-num">
            · Real-Time Vitals
          </span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
          Tap metric to view detailed logs
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {metrics.map((m) => {
          const Icon = m.icon;
          const ratio = m.target > 0 ? Math.min(100, Math.round((m.current / m.target) * 100)) : 0;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveTab(m.tab)}
              className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--card-surface-elevated)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${m.color}18`, color: m.color }}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                    {m.label}
                  </span>
                </div>
                <span
                  className="text-[9px] font-mono-num font-semibold shrink-0"
                  style={{ color: m.current > 0 ? m.color : 'var(--text-muted)' }}
                >
                  {ratio}%
                </span>
              </div>

              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-bold font-mono-num text-[var(--text-primary)]">
                  {m.displayCurrent}
                </span>
                <span className="text-[10px] font-mono-num text-[var(--text-muted)]">
                  / {m.displayTarget}
                </span>
              </div>

              {/* Micro Progress Bar */}
              <div className="w-full bg-[var(--card-border)] h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${ratio}%`,
                    backgroundColor: m.color,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
