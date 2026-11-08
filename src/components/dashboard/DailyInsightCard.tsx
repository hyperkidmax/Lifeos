import React from 'react';
import { useWellness } from '../../context/WellnessContext';
import { Card } from '../ui/Card';
import { Sparkles, Moon, Footprints, Droplet, Heart, CheckCircle2 } from 'lucide-react';

export const DailyInsightCard: React.FC = () => {
  const {
    data,
    todaySleep,
    todaySteps,
    todayWaterTotal,
    todayHeartRate,
    todayCaloriesConsumed,
    todayProteinConsumed,
    todayWorkouts,
  } = useWellness();

  const goals = data.goals;

  // Derive intelligent, personalized insight based on actual day biometrics
  const getInsight = () => {
    // 1. Sleep deficit check
    if (todaySleep && todaySleep.totalMinutes < 390) {
      const hrs = Math.floor(todaySleep.totalMinutes / 60);
      const mins = todaySleep.totalMinutes % 60;
      return {
        category: 'Recovery Focus',
        title: 'Sleep Deficit Pacing',
        message: `You recorded ${hrs}h ${mins}m of sleep today (target ${Math.round(goals.dailySleepMinutes / 60)}h). Favor low-impact mobility, avoid late afternoon caffeine, and keep hydration steady to reduce autonomic cardiac strain.`,
        icon: Moon,
        accentColor: '#A78BFA',
      };
    }

    // 2. High Step Activity Achieved
    if (todaySteps && todaySteps.count >= goals.dailySteps) {
      return {
        category: 'Cardiovascular Momentum',
        title: 'Daily Movement Goal Reached',
        message: `Phenomenal pacing—you've logged ${todaySteps.count.toLocaleString()} steps today. Take 5–10 minutes this evening for lower back and hamstring mobility to assist muscular recovery.`,
        icon: Footprints,
        accentColor: '#00F2A9',
      };
    }

    // 3. Hydration check
    if (todayWaterTotal < goals.dailyWaterMl * 0.45 && new Date().getHours() >= 13) {
      const remaining = goals.dailyWaterMl - todayWaterTotal;
      return {
        category: 'Cellular Hydration',
        title: 'Hydration Target Pacing',
        message: `You're currently at ${Math.round((todayWaterTotal / goals.dailyWaterMl) * 100)}% of your daily water goal. Drinking 500ml before your next meal will help maintain cognitive focus and metabolic balance.`,
        icon: Droplet,
        accentColor: '#38BDF8',
      };
    }

    // 4. Post-workout recovery
    if (todayWorkouts.length > 0) {
      const workout = todayWorkouts[0];
      return {
        category: 'Post-Workout Fueling',
        title: 'Anabolic Recovery Window',
        message: `Workout logged: ${workout.title} (${workout.durationMinutes}m). Ensure adequate protein intake (${todayProteinConsumed}g logged so far toward ${goals.dailyProteinG}g target) to support muscle protein synthesis.`,
        icon: Sparkles,
        accentColor: '#00E5FF',
      };
    }

    // 5. Resting Heart Rate optimal
    if (todayHeartRate?.restingBpm && todayHeartRate.restingBpm <= 62) {
      return {
        category: 'Cardiac Balance',
        title: 'Resting Vitals in Optimal Zone',
        message: `Resting heart rate logged at ${todayHeartRate.restingBpm} bpm, signaling strong parasympathetic recovery. A balanced day for strength training or productive deep work.`,
        icon: Heart,
        accentColor: '#00F2A9',
      };
    }

    // Default Zen calibration insight
    return {
      category: 'Daily Wellness Rhythm',
      title: 'Mindful Health Calibration',
      message: 'Consistency compounds quietly. Log your waking vitals, morning hydration, or first meal to calibrate your personal LifeOS Wellness Score for today.',
      icon: CheckCircle2,
      accentColor: '#00F2A9',
    };
  };

  const insight = getInsight();
  const Icon = insight.icon;

  return (
    <Card
      variant="solid"
      padding="md"
      className="relative overflow-hidden bg-gradient-to-br from-[var(--card-surface)] via-[var(--card-surface)] to-[var(--bg-subtle)] border-[var(--card-border)] shadow-sm"
    >
      {/* Soft ambient tint */}
      <div
        className="absolute top-0 right-0 w-36 h-36 rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{ backgroundColor: insight.accentColor }}
      />

      <div className="relative z-10 flex items-start gap-3.5">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: `${insight.accentColor}15`,
            borderColor: `${insight.accentColor}30`,
            color: insight.accentColor,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-mono-num uppercase tracking-wider font-semibold"
              style={{ color: insight.accentColor }}
            >
              {insight.category}
            </span>
          </div>

          <h4 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
            {insight.title}
          </h4>

          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            {insight.message}
          </p>
        </div>
      </div>
    </Card>
  );
};
