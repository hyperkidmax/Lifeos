import React from 'react';
import { useWellness, ActiveTab } from '../../context/WellnessContext';
import { Card } from '../ui/Card';
import { Moon, Heart, Footprints, Utensils, Droplet, ArrowRight, Sparkles, Check, Clock } from 'lucide-react';

export const WellnessScoreHero: React.FC = () => {
  const {
    data,
    todaySteps,
    todaySleep,
    todayHeartRate,
    todayWaterTotal,
    todayCaloriesConsumed,
    todayActiveCaloriesBurned,
    setActiveTab,
  } = useWellness();

  const goals = data.goals;

  // 1. Sleep Pillar Score (0 - 100)
  const sleepScore: number | null = todaySleep
    ? todaySleep.qualityScore ?? Math.min(100, Math.round((todaySleep.totalMinutes / goals.dailySleepMinutes) * 100))
    : null;

  // 2. Recovery Pillar Score (0 - 100)
  let recoveryScore: number | null = null;
  if (todayHeartRate?.restingBpm) {
    const rBpm = todayHeartRate.restingBpm;
    if (rBpm <= 60) recoveryScore = 95;
    else if (rBpm <= 68) recoveryScore = 88;
    else if (rBpm <= 75) recoveryScore = 80;
    else recoveryScore = 68;
  } else if (todaySleep?.qualityScore) {
    recoveryScore = Math.max(50, Math.min(95, todaySleep.qualityScore - 4));
  }

  // 3. Activity Pillar Score (0 - 100)
  const stepRatio = todaySteps ? todaySteps.count / goals.dailySteps : 0;
  const burnRatio = todayActiveCaloriesBurned > 0 ? todayActiveCaloriesBurned / goals.dailyActiveCalories : 0;
  let activityScore: number | null = null;
  if (todaySteps || todayActiveCaloriesBurned > 0) {
    const combined = stepRatio > 0 && burnRatio > 0 ? (stepRatio + burnRatio) / 2 : stepRatio || burnRatio;
    activityScore = Math.min(100, Math.round(combined * 100));
  }

  // 4. Nutrition Pillar Score (0 - 100)
  const waterRatio = todayWaterTotal > 0 ? todayWaterTotal / goals.dailyWaterMl : 0;
  const calRatio = todayCaloriesConsumed > 0 ? Math.min(1, todayCaloriesConsumed / goals.dailyCalories) : 0;
  let nutritionScore: number | null = null;
  if (todayWaterTotal > 0 || todayCaloriesConsumed > 0) {
    const combined = waterRatio > 0 && calRatio > 0 ? (waterRatio * 0.5 + calRatio * 0.5) : waterRatio || calRatio;
    nutritionScore = Math.min(100, Math.round(combined * 100));
  }

  // Preserve existing composite Wellness Score formula exactly
  const validPillars = [
    { score: sleepScore, weight: 0.3 },
    { score: recoveryScore, weight: 0.2 },
    { score: activityScore, weight: 0.3 },
    { score: nutritionScore, weight: 0.2 },
  ].filter((p): p is { score: number; weight: number } => p.score !== null);

  let totalScore: number | null = null;
  if (validPillars.length > 0) {
    const totalWeight = validPillars.reduce((acc, p) => acc + p.weight, 0);
    const weightedSum = validPillars.reduce((acc, p) => acc + p.score * p.weight, 0);
    totalScore = Math.round(weightedSum / totalWeight);
  }

  // 5 Contributing Health Domains
  const domainPresence = [
    { id: 'sleep', name: 'Sleep', active: !!todaySleep, color: '#A78BFA', icon: Moon, tab: 'health' as ActiveTab },
    { id: 'recovery', name: 'Recovery', active: !!(todayHeartRate || todaySleep?.qualityScore), color: '#00F2A9', icon: Heart, tab: 'health' as ActiveTab },
    { id: 'activity', name: 'Activity', active: !!(todaySteps || todayActiveCaloriesBurned > 0), color: '#00E5FF', icon: Footprints, tab: 'fitness' as ActiveTab },
    { id: 'nutrition', name: 'Nutrition', active: todayCaloriesConsumed > 0, color: '#F59E0B', icon: Utensils, tab: 'nutrition' as ActiveTab },
    { id: 'hydration', name: 'Hydration', active: todayWaterTotal > 0, color: '#38BDF8', icon: Droplet, tab: 'nutrition' as ActiveTab },
  ];
  const activeDomainsCount = domainPresence.filter((d) => d.active).length;

  // Confidence assessment
  let confidenceLabel = 'Awaiting Logs';
  let confidenceTone = 'text-[var(--text-muted)]';
  if (activeDomainsCount >= 4) {
    confidenceLabel = 'High Confidence';
    confidenceTone = 'text-[#00F2A9]';
  } else if (activeDomainsCount >= 2) {
    confidenceLabel = 'Moderate Confidence';
    confidenceTone = 'text-[#00E5FF]';
  } else if (activeDomainsCount === 1) {
    confidenceLabel = 'Preliminary';
    confidenceTone = 'text-[#F59E0B]';
  }

  // Tone and descriptor
  let scoreLabel = 'No Logs Today';
  let scoreToneColor = '#00F2A9';
  if (totalScore !== null) {
    if (totalScore >= 85) {
      scoreLabel = 'Optimal Zone';
      scoreToneColor = '#00F2A9';
    } else if (totalScore >= 70) {
      scoreLabel = 'Healthy Baseline';
      scoreToneColor = '#00E5FF';
    } else if (totalScore >= 50) {
      scoreLabel = 'In Progress';
      scoreToneColor = '#F59E0B';
    } else {
      scoreLabel = 'Recovery Focus';
      scoreToneColor = '#A78BFA';
    }
  }

  // Compact Responsive SVG geometry (viewBox 0 0 100 100)
  const center = 50;
  const radius = 40;
  const strokeWidth = 8.5;
  const circumference = 2 * Math.PI * radius; // ~251.32
  const progressRatio = totalScore !== null ? Math.min(100, Math.max(0, totalScore)) / 100 : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <Card
      variant="solid"
      padding="none"
      className="relative overflow-hidden bg-gradient-to-br from-[var(--card-surface)] via-[var(--card-surface)] to-[var(--bg-subtle)] border-[var(--card-border)] shadow-xs"
    >
      {/* Ambient background glow */}
      <div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: totalScore !== null ? scoreToneColor : '#00F2A9' }}
      />

      <div className="p-3.5 sm:p-5 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-6">
          {/* Circular Score Visualisation (Compact & proportionate: 124px mobile, 140px desktop) */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative flex items-center justify-center shrink-0 w-[124px] h-[124px] sm:w-[140px] sm:h-[140px]">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="scoreArcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F2A9" />
                    <stop offset="60%" stopColor="#00E5FF" />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>

                {/* Track background */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="text-[var(--bg-subtle)] opacity-85"
                />

                {/* Animated active arc */}
                {totalScore !== null ? (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="url(#scoreArcGradient)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    style={{
                      strokeDashoffset,
                      transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    className="drop-shadow-[0_0_10px_rgba(0,242,169,0.3)]"
                  />
                ) : (
                  /* Honest Empty state dashed track */
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth - 3}
                    strokeDasharray="4 4"
                    fill="transparent"
                    className="text-[var(--card-border-hover)] opacity-50"
                  />
                )}
              </svg>

              {/* Central Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-2">
                <span className="text-[9px] uppercase font-mono-num tracking-wider text-[var(--text-muted)] font-semibold">
                  Wellness Score
                </span>
                <div className="flex items-baseline gap-0.5 my-0.5">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono-num text-[var(--text-primary)] tracking-tight">
                    {totalScore !== null ? totalScore : '--'}
                  </span>
                  {totalScore !== null && (
                    <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
                      /100
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] sm:text-[11px] font-semibold tracking-tight"
                  style={{ color: totalScore !== null ? scoreToneColor : 'var(--text-muted)' }}
                >
                  {scoreLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Balanced Explanation & Active Pillar Calibration (Zero duplicated metrics) */}
          <div className="flex-1 flex flex-col justify-between min-w-0 w-full space-y-3 sm:space-y-2.5">
            {/* Top row: Status Badge & Confidence assessment */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: totalScore !== null ? scoreToneColor : 'var(--text-muted)' }}
                />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {scoreLabel}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">·</span>
                <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline font-mono-num">
                  Daily Composite
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--card-border)]">
                <span className={`text-[10px] font-mono-num font-semibold ${confidenceTone}`}>
                  {confidenceLabel}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono-num">
                  ({activeDomainsCount}/5 pillars)
                </span>
              </div>
            </div>

            {/* Clear explanation of score calculation and calibration */}
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              LifeOS personal health index dynamically weighted across your 5 core wellness pillars:
              Sleep (30%), Activity (30%), Recovery (20%), and Nutrition &amp; Hydration (20%).
            </p>

            {/* 5 Pillar Activation Status Strip (Explains score composition without duplicating metric numbers) */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono-num text-[var(--text-muted)] mb-1.5 px-0.5">
                <span className="uppercase font-semibold tracking-wider">
                  Today's Pillar Status
                </span>
                <span className="hidden sm:inline">Tap pillar to view full logs</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {domainPresence.map((domain) => {
                  const Icon = domain.icon;
                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => setActiveTab(domain.tab)}
                      className={`group p-1.5 sm:p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        domain.active
                          ? 'bg-[var(--card-surface-elevated)] border-[var(--card-border-hover)] hover:border-[#00F2A9]/50 shadow-xs'
                          : 'bg-[var(--bg-subtle)]/60 border-[var(--card-border)] opacity-60 hover:opacity-90'
                      }`}
                      title={`${domain.name}: ${domain.active ? 'Active today' : 'Awaiting entry'}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <Icon
                          className="w-3 h-3 shrink-0"
                          style={{ color: domain.active ? domain.color : 'var(--text-muted)' }}
                        />
                        {domain.active ? (
                          <Check className="w-2.5 h-2.5 text-[#00F2A9] shrink-0" />
                        ) : (
                          <Clock className="w-2.5 h-2.5 text-[var(--text-muted)] shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--text-primary)] truncate w-full">
                        {domain.name}
                      </span>
                      <span
                        className="text-[9px] font-mono-num truncate"
                        style={{ color: domain.active ? domain.color : 'var(--text-muted)' }}
                      >
                        {domain.active ? 'Logged' : 'Pending'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status footnote */}
            <div className="text-[11px] text-[var(--text-muted)] pt-0.5 flex items-center justify-between">
              <span>
                {totalScore === null
                  ? 'Log any pillar below or use Quick Actions to calculate today\'s score.'
                  : 'Scores update in real time with every logged vital, workout, meal, or habit.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
