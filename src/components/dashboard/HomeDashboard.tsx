import React, { useState } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { formatFullDate, getPersonalizedGreeting } from '../../utils/dateUtils';
import { WellnessScoreHero } from './WellnessScoreHero';
import { DailyOverviewPillars } from './DailyOverviewPillars';
import { DailyMetricsOverview } from './DailyMetricsOverview';
import { QuickActionsDock } from './QuickActionsDock';
import { TodayPrioritiesSection } from './TodayPrioritiesSection';
import { WeeklyProgressChart } from './WeeklyProgressChart';
import { TodayWorkoutCard } from './TodayWorkoutCard';
import { DailyInsightCard } from './DailyInsightCard';
import { Sparkles, ShieldCheck, Calendar } from 'lucide-react';

export const HomeDashboard: React.FC = () => {
  const {
    data,
    currentUser,
    isDemoMode,
    hasDemoRecords,
    selectedDate,
    loadDemoData,
    clearDemoDataOnly,
  } = useWellness();

  const [showClearDemoConfirm, setShowClearDemoConfirm] = useState(false);
  const [showLoadDemoConfirm, setShowLoadDemoConfirm] = useState(false);

  const greetingText = getPersonalizedGreeting(data.profile?.name, currentUser?.displayName);

  return (
    <div className="space-y-3 sm:space-y-4 pt-0.5 pb-10 sm:pb-6">
      {/* 1. Compact Personalized Greeting, Current Date & Real/Demo Status */}
      <div className="flex items-center justify-between gap-3 bg-[var(--card-surface)] border border-[var(--card-border)] rounded-2xl sm:rounded-3xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-[var(--text-primary)] truncate">
            {greetingText}
          </h1>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
            <Calendar className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            <span>{formatFullDate(selectedDate)}</span>
          </p>
        </div>

        {/* Operating Mode Status Tag */}
        <div className="shrink-0">
          {isDemoMode || hasDemoRecords ? (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-2.5 py-1 text-xs text-amber-300">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="font-semibold text-[10px] sm:text-[11px]">Demo Mode</span>
              <button
                type="button"
                onClick={() => setShowClearDemoConfirm(true)}
                className="text-[10px] font-mono-num underline hover:text-white ml-0.5 cursor-pointer"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#00F2A9]/10 border border-[#00F2A9]/30 rounded-xl px-2.5 py-1 text-xs text-[#00F2A9]">
              <ShieldCheck className="w-3 h-3 text-[#00F2A9] shrink-0" />
              <span className="font-semibold text-[10px] sm:text-[11px]">Real Mode</span>
              <button
                type="button"
                onClick={() => setShowLoadDemoConfirm(true)}
                className="text-[10px] font-mono-num text-[var(--text-muted)] hover:text-[var(--text-primary)] underline ml-0.5 cursor-pointer"
              >
                Demo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Wellness Score Centerpiece (Primary visual element, animated progress ring, confidence & honest empty states) */}
      <WellnessScoreHero />

      {/* 3. Five Wellness Pillars (Sleep, Recovery, Activity, Nutrition, Hydration) */}
      <DailyOverviewPillars />

      {/* 4. Daily Overview (Compact summary of Steps, Active calories, Water intake, Sleep duration, Nutrition progress) */}
      <DailyMetricsOverview />

      {/* 5. Quick Actions Dock (Easy 1-tap entry: Water, Food, Steps, Sleep, Workout, Weight) */}
      <QuickActionsDock />

      {/* 6. Daily Priorities & Habits Section (Interactive completions & streaks) */}
      <TodayPrioritiesSection />

      {/* 7. Weekly Trends & Biometric Charts (Clean charts with honest empty states when historical data unavailable) */}
      <WeeklyProgressChart />

      {/* 8. Workout & Personalized Insight (Responsive 2-column grid on desktop, single-column on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Today's Workout Card */}
        <TodayWorkoutCard />

        {/* Personalized Daily Insight Card */}
        <DailyInsightCard />
      </div>

      {/* CONFIRMATION MODAL: CLEAR DEMO DATA ONLY */}
      {showClearDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[var(--card-surface)] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Clear Demo Records Only?</h3>
                <span className="text-xs text-[var(--text-muted)]">Non-destructive demo removal</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--card-border)] text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed">
              <p>This will remove only sample records generated for demonstration purposes.</p>
              <p className="text-[#00F2A9] font-medium">
                ✓ Your authentic logged meals, workouts, water intake, daily priorities, and journal reflections will remain 100% intact and safe.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowClearDemoConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--card-border)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer transition-colors"
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
          <div className="w-full max-w-md bg-[var(--card-surface)] border border-[#00E5FF]/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Load Realistic Demo Data?</h3>
                <span className="text-xs text-[var(--text-muted)]">Testing & preview dataset</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--card-border)] text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed">
              <p>
                This will populate realistic sample workouts, nutrition macros, hypnogram sleep stages, and weight logs clearly labelled as <strong className="text-[#00E5FF]">Demo Data</strong>.
              </p>
              <p className="text-[var(--text-muted)]">
                Any existing personal logs you created will remain safe and merged alongside the demo records.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLoadDemoConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--card-border)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer transition-colors"
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
