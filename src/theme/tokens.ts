/**
 * LifeOS Centralized Design Tokens
 * 
 * Visual Identity:
 * - Nature Health + CyberFit + Modern Zen
 * - Deep forest green (#0A130F) and near-black (#080809) background canvas
 * - Nature-inspired mint (#00F2A9 / #10B981) and emerald as primary health accents
 * - Electric cyan (#00E5FF) for interactive focal highlights
 * - Calming recovery purple (#A78BFA / #8B5CF6) for sleep, mindfulness, and rest
 * - Nutrition solar orange/gold (#F59E0B / #FB923C) for calories and macronutrients
 * - Subtle borders, restrained glass effects, and soft natural depth
 */

export const DESIGN_TOKENS = {
  // Brand accents
  colors: {
    primaryMint: '#00F2A9',
    primaryMintDark: '#059669',
    electricCyan: '#00E5FF',
    recoveryPurple: '#A78BFA',
    solarOrange: '#FB923C',
    solarYellow: '#F59E0B',
    coralBurn: '#FF6B6B',
    azureWater: '#38BDF8',
  },
  typography: {
    fontDisplay: "'Plus Jakarta Sans', -apple-system, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
  },
  // Semantic category themes
  categories: {
    health: {
      accent: '#00F2A9',
      bgSubtle: 'rgba(0, 242, 169, 0.08)',
      borderSubtle: 'rgba(0, 242, 169, 0.2)',
      label: 'Health & Vitals',
    },
    fitness: {
      accent: '#00E5FF',
      bgSubtle: 'rgba(0, 229, 255, 0.08)',
      borderSubtle: 'rgba(0, 229, 255, 0.2)',
      label: 'Fitness & Movement',
    },
    nutrition: {
      accent: '#FB923C',
      bgSubtle: 'rgba(251, 146, 60, 0.08)',
      borderSubtle: 'rgba(251, 146, 60, 0.2)',
      label: 'Nutrition & Macros',
    },
    sleep: {
      accent: '#A78BFA',
      bgSubtle: 'rgba(167, 139, 250, 0.08)',
      borderSubtle: 'rgba(167, 139, 250, 0.2)',
      label: 'Sleep & Recovery',
    },
    water: {
      accent: '#38BDF8',
      bgSubtle: 'rgba(56, 189, 248, 0.08)',
      borderSubtle: 'rgba(56, 189, 248, 0.2)',
      label: 'Hydration',
    },
  },
} as const;
