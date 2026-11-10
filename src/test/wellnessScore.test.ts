/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateWellnessScore, PILLAR_WEIGHTS, PILLAR_WEIGHT_PERCENTAGES } from '../utils/wellnessScore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

console.log('=== RUNNING WELLNESS SCORE FIVE-PILLAR UNIT TESTS ===\n');

// 1. Verify exact restored weights and sum
assert(PILLAR_WEIGHTS.sleep === 0.25, 'Sleep weight is exactly 25% (0.25)');
assert(PILLAR_WEIGHTS.activity === 0.25, 'Activity weight is exactly 25% (0.25)');
assert(PILLAR_WEIGHTS.nutrition === 0.20, 'Nutrition weight is exactly 20% (0.20)');
assert(PILLAR_WEIGHTS.hydration === 0.15, 'Hydration weight is exactly 15% (0.15)');
assert(PILLAR_WEIGHTS.habits === 0.15, 'Habits/Mindset weight is exactly 15% (0.15)');

const totalWeight =
  PILLAR_WEIGHTS.sleep +
  PILLAR_WEIGHTS.activity +
  PILLAR_WEIGHTS.nutrition +
  PILLAR_WEIGHTS.hydration +
  PILLAR_WEIGHTS.habits;
assert(Math.abs(totalWeight - 1.0) < 1e-9, 'Sum of all 5 pillar weights is exactly 1.00 (100%)');

assert(PILLAR_WEIGHT_PERCENTAGES.sleep === '25%', 'Display weight for sleep is 25%');
assert(PILLAR_WEIGHT_PERCENTAGES.activity === '25%', 'Display weight for activity is 25%');
assert(PILLAR_WEIGHT_PERCENTAGES.nutrition === '20%', 'Display weight for nutrition is 20%');
assert(PILLAR_WEIGHT_PERCENTAGES.hydration === '15%', 'Display weight for hydration is 15%');
assert(PILLAR_WEIGHT_PERCENTAGES.habits === '15%', 'Display weight for habits is 15%');

// 2. Threshold test: Fewer than 3 supported domains MUST NOT produce a score
const zeroDomains = calculateWellnessScore({
  sleepScore: null,
  activityScore: null,
  nutritionScore: null,
  hydrationScore: null,
  habitsScore: null,
});
assert(zeroDomains.score === null, '0 domains: score is null');
assert(zeroDomains.isEligible === false, '0 domains: isEligible is false');
assert(zeroDomains.activeDomainsCount === 0, '0 domains: activeDomainsCount is 0');

const oneDomain = calculateWellnessScore({
  sleepScore: 90,
  activityScore: null,
  nutritionScore: null,
  hydrationScore: null,
  habitsScore: null,
});
assert(oneDomain.score === null, '1 domain: score is null');
assert(oneDomain.isEligible === false, '1 domain: isEligible is false');
assert(oneDomain.activeDomainsCount === 1, '1 domain: activeDomainsCount is 1');

const twoDomains = calculateWellnessScore({
  sleepScore: 90,
  activityScore: 85,
  nutritionScore: null,
  hydrationScore: null,
  habitsScore: null,
});
assert(twoDomains.score === null, '2 domains: score is null');
assert(twoDomains.isEligible === false, '2 domains: isEligible is false');
assert(twoDomains.activeDomainsCount === 2, '2 domains: activeDomainsCount is 2');

// 3. Exactly 3 domains: produces a score dynamically normalized by active weights
// Sleep (80 @ 0.25) + Activity (90 @ 0.25) + Hydration (100 @ 0.15)
// activeWeightsSum = 0.65
// weightedSum = 80*0.25 + 90*0.25 + 100*0.15 = 20 + 22.5 + 15 = 57.5
// expected = Math.round(57.5 / 0.65) = Math.round(88.4615) = 88
const threeDomains = calculateWellnessScore({
  sleepScore: 80,
  activityScore: 90,
  nutritionScore: null,
  hydrationScore: 100,
  habitsScore: null,
});
assert(threeDomains.isEligible === true, '3 domains: isEligible is true');
assert(threeDomains.activeDomainsCount === 3, '3 domains: activeDomainsCount is 3');
assert(Math.abs(threeDomains.activeWeightsSum - 0.65) < 1e-9, '3 domains: activeWeightsSum is 0.65');
assert(threeDomains.score === 88, `3 domains: expected 88, got ${threeDomains.score}`);
assert(threeDomains.confidenceLabel === 'Moderate Confidence', '3 domains: confidence is Moderate Confidence');

// 4. Missing data is never treated as zero performance
// If 3 domains are all 100%, and 2 are missing, the score must be 100 (not dragged down by missing data)
const perfectThree = calculateWellnessScore({
  sleepScore: 100,
  activityScore: 100,
  nutritionScore: 100,
  hydrationScore: null,
  habitsScore: null,
});
assert(perfectThree.score === 100, 'Missing data is not treated as zero: 3 perfect domains yield 100');

// 5. Four domains test
// Sleep (80 @ 0.25) + Activity (90 @ 0.25) + Nutrition (75 @ 0.20) + Hydration (100 @ 0.15)
// activeWeightsSum = 0.85
// weightedSum = 20 + 22.5 + 15 + 15 = 72.5
// expected = Math.round(72.5 / 0.85) = Math.round(85.29) = 85
const fourDomains = calculateWellnessScore({
  sleepScore: 80,
  activityScore: 90,
  nutritionScore: 75,
  hydrationScore: 100,
  habitsScore: null,
});
assert(fourDomains.isEligible === true, '4 domains: isEligible is true');
assert(fourDomains.activeDomainsCount === 4, '4 domains: activeDomainsCount is 4');
assert(fourDomains.score === 85, `4 domains: expected 85, got ${fourDomains.score}`);
assert(fourDomains.confidenceLabel === 'High Confidence', '4 domains: confidence is High Confidence');

// 6. Five domains test (all active)
// Sleep (80 @ 0.25) + Activity (90 @ 0.25) + Nutrition (75 @ 0.20) + Hydration (100 @ 0.15) + Habits (60 @ 0.15)
// activeWeightsSum = 1.00
// weightedSum = 20 + 22.5 + 15 + 15 + 9 = 81.5
// expected = Math.round(81.5 / 1.0) = 82
const fiveDomains = calculateWellnessScore({
  sleepScore: 80,
  activityScore: 90,
  nutritionScore: 75,
  hydrationScore: 100,
  habitsScore: 60,
});
assert(fiveDomains.isEligible === true, '5 domains: isEligible is true');
assert(fiveDomains.activeDomainsCount === 5, '5 domains: activeDomainsCount is 5');
assert(Math.abs(fiveDomains.activeWeightsSum - 1.0) < 1e-9, '5 domains: activeWeightsSum is 1.00');
assert(fiveDomains.score === 82, `5 domains: expected 82, got ${fiveDomains.score}`);
assert(fiveDomains.confidenceLabel === 'High Confidence', '5 domains: confidence is High Confidence');

// 7. Independence of Nutrition (20%) and Hydration (15%)
// Test A: Nutrition=100, Hydration=50, Sleep=80, Activity=80 (Habits=null)
// activeWeightsSum = 0.25 + 0.25 + 0.20 + 0.15 = 0.85
// weightedSum = 20 + 20 + 20 + 7.5 = 67.5 => Math.round(67.5 / 0.85) = 79
const testA = calculateWellnessScore({
  sleepScore: 80,
  activityScore: 80,
  nutritionScore: 100,
  hydrationScore: 50,
  habitsScore: null,
});
// Test B: Nutrition=50, Hydration=100, Sleep=80, Activity=80 (Habits=null)
// weightedSum = 20 + 20 + 10 + 15 = 65.0 => Math.round(65.0 / 0.85) = 76
const testB = calculateWellnessScore({
  sleepScore: 80,
  activityScore: 80,
  nutritionScore: 50,
  hydrationScore: 100,
  habitsScore: null,
});
assert(testA.score === 79, `Independent test A: expected 79, got ${testA.score}`);
assert(testB.score === 76, `Independent test B: expected 76, got ${testB.score}`);
assert(testA.score !== testB.score, 'Nutrition (20%) and Hydration (15%) are independently weighted');

// 8. Combinations with Habits/Mindset
// Sleep=null, Activity=null, Nutrition=80, Hydration=80, Habits=80
// activeWeightsSum = 0.20 + 0.15 + 0.15 = 0.50
// weightedSum = 16 + 12 + 12 = 40 => Math.round(40 / 0.50) = 80
const threeWithoutSleepActivity = calculateWellnessScore({
  sleepScore: null,
  activityScore: null,
  nutritionScore: 80,
  hydrationScore: 80,
  habitsScore: 80,
});
assert(threeWithoutSleepActivity.isEligible === true, '3 domains (Nutrition, Hydration, Habits): isEligible is true');
assert(threeWithoutSleepActivity.score === 80, `3 domains without sleep/activity: expected 80, got ${threeWithoutSleepActivity.score}`);

console.log('\nALL 19 WELLNESS SCORE TESTS PASSED SUCCESSFULLY!');
