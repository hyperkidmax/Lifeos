/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PillarInput {
  sleepScore: number | null;
  activityScore: number | null;
  nutritionScore: number | null;
  hydrationScore: number | null;
  habitsScore: number | null;
}

export interface WellnessScoreResult {
  score: number | null; // null if fewer than 3 supported domains
  activeDomainsCount: number;
  totalDomains: 5;
  activeWeightsSum: number;
  confidenceLabel: string;
  isEligible: boolean; // activeDomainsCount >= 3
}

/**
 * Exact Five-Pillar Model Weights:
 * - Sleep: 25% (0.25)
 * - Activity: 25% (0.25)
 * - Nutrition: 20% (0.20)
 * - Hydration: 15% (0.15)
 * - Habits/Mindset: 15% (0.15)
 * Sum = 1.00 (100%)
 */
export const PILLAR_WEIGHTS = {
  sleep: 0.25,
  activity: 0.25,
  nutrition: 0.20,
  hydration: 0.15,
  habits: 0.15,
} as const;

export const PILLAR_WEIGHT_PERCENTAGES = {
  sleep: '25%',
  activity: '25%',
  nutrition: '20%',
  hydration: '15%',
  habits: '15%',
} as const;

/**
 * Computes the canonical LifeOS Wellness Score.
 * 
 * Scoring Principles:
 * 1. Restores the exact 5-pillar weights: Sleep (25%), Activity (25%), Nutrition (20%), Hydration (15%), Habits/Mindset (15%).
 * 2. Nutrition and Hydration are scored and weighted independently.
 * 3. Excludes unavailable domains from the weighted denominator (dynamic reweighting).
 * 4. Requires at least three supported domains before displaying a numerical Wellness Score.
 * 5. Keeps confidence separate from the numerical score.
 * 6. Never treats missing data as zero performance.
 */
export function calculateWellnessScore(inputs: PillarInput): WellnessScoreResult {
  const pillars = [
    { id: 'sleep', score: inputs.sleepScore, weight: PILLAR_WEIGHTS.sleep },
    { id: 'activity', score: inputs.activityScore, weight: PILLAR_WEIGHTS.activity },
    { id: 'nutrition', score: inputs.nutritionScore, weight: PILLAR_WEIGHTS.nutrition },
    { id: 'hydration', score: inputs.hydrationScore, weight: PILLAR_WEIGHTS.hydration },
    { id: 'habits', score: inputs.habitsScore, weight: PILLAR_WEIGHTS.habits },
  ];

  const validPillars = pillars.filter((p): p is typeof p & { score: number } => p.score !== null);
  const activeDomainsCount = validPillars.length;
  const isEligible = activeDomainsCount >= 3;

  let score: number | null = null;
  let activeWeightsSum = 0;

  if (isEligible) {
    activeWeightsSum = validPillars.reduce((acc, p) => acc + p.weight, 0);
    const weightedSum = validPillars.reduce((acc, p) => acc + p.score * p.weight, 0);
    score = Math.round(weightedSum / activeWeightsSum);
  }

  let confidenceLabel = 'Awaiting Logs';
  if (activeDomainsCount >= 4) {
    confidenceLabel = 'High Confidence';
  } else if (activeDomainsCount === 3) {
    confidenceLabel = 'Moderate Confidence';
  } else if (activeDomainsCount > 0) {
    confidenceLabel = 'Preliminary';
  }

  return {
    score,
    activeDomainsCount,
    totalDomains: 5,
    activeWeightsSum,
    confidenceLabel,
    isEligible,
  };
}
