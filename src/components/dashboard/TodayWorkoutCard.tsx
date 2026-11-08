import React from 'react';
import { useWellness } from '../../context/WellnessContext';
import { Card } from '../ui/Card';
import { Dumbbell, Flame, Clock, Play, ArrowRight, Plus } from 'lucide-react';
import { isDemoRecord } from '../../utils/mockData';

export const TodayWorkoutCard: React.FC = () => {
  const {
    todayWorkouts,
    todayActiveCaloriesBurned,
    isWorkoutTimerRunning,
    activeWorkoutDuration,
    setActiveTab,
    openQuickAdd,
  } = useWellness();

  const latestWorkout = todayWorkouts[0];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card variant="solid" padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-[#00E5FF]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Training & Movement
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('fitness')}
          className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer"
        >
          Fitness Hub <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Active Workout Timer Banner (if running) */}
      {isWorkoutTimerRunning && (
        <div className="p-3 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse" />
            <div>
              <span className="text-xs font-semibold text-[var(--text-primary)]">Active Session</span>
              <p className="text-[10px] text-[var(--text-muted)]">Live Timer in Progress</p>
            </div>
          </div>
          <span className="text-lg font-mono-num font-bold text-[#00E5FF]">
            {formatTimer(activeWorkoutDuration)}
          </span>
        </div>
      )}

      {/* Workout Content */}
      {todayWorkouts.length > 0 ? (
        <div className="space-y-2.5">
          {todayWorkouts.map((workout) => (
            <div
              key={workout.id}
              onClick={() => setActiveTab('fitness')}
              className="p-3.5 rounded-2xl bg-[var(--card-surface-elevated)] border border-[var(--card-border)] hover:border-[#00E5FF]/40 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#00E5FF] transition-colors">
                      {workout.title}
                    </h4>
                    {isDemoRecord(workout) && (
                      <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                        Demo
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] capitalize">
                    {workout.category} training
                  </span>
                </div>

                <span className="text-xs font-mono-num font-semibold text-[#00E5FF] px-2 py-0.5 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20">
                  {workout.durationMinutes} min
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] font-mono-num mt-3">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#FB923C]" />
                  {workout.caloriesBurned || 0} kcal
                </span>
                <span>·</span>
                <span>
                  {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                </span>
                <span>·</span>
                <span>
                  {workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)} total sets
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compact Informative Empty State */
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--card-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 flex items-center justify-center shrink-0">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                No Workout Logged Today
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                Track strength, cardio, or recovery sessions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openQuickAdd('workout')}
            className="px-3 py-1.5 rounded-xl bg-[#00E5FF] text-[#060A08] text-xs font-semibold hover:bg-[#00cce6] transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Log
          </button>
        </div>
      )}
    </Card>
  );
};
