import React from 'react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export interface ThemeToggleProps {
  variant?: 'segmented' | 'compact';
  showLabels?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'compact',
  showLabels = false,
  className = '',
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: React.ElementType }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'system', label: 'System', icon: Monitor },
  ];

  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--card-border)] rounded-xl p-1 gap-1 ${className}`}
        role="group"
        aria-label="Theme selection"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTheme(opt.mode)}
              title={`${opt.label} mode${opt.mode === 'system' ? ` (currently ${resolvedTheme})` : ''}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--card-surface)] text-[var(--accent)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {showLabels && <span>{opt.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // Compact variant
  return (
    <div
      className={`inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--card-border)] rounded-lg p-0.5 ${className}`}
      role="group"
      aria-label="Theme selection"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => setTheme(opt.mode)}
            title={`${opt.label} appearance${opt.mode === 'system' ? ` (auto: ${resolvedTheme})` : ''}`}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              isSelected
                ? 'bg-[var(--card-surface)] text-[var(--accent)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
};
