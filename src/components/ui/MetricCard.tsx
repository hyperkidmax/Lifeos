import React, { ReactNode } from 'react';
import { Card } from './Card';

export type MetricCategory = 'health' | 'fitness' | 'nutrition' | 'sleep' | 'water' | 'neutral';

export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: ReactNode;
  category?: MetricCategory;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    positive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

const CATEGORY_STYLES: Record<
  MetricCategory,
  {
    iconBg: string;
    iconColor: string;
    accentBorder: 'none' | 'mint' | 'cyan' | 'purple' | 'orange' | 'water';
  }
> = {
  health: {
    iconBg: 'bg-[#00F2A9]/10 border border-[#00F2A9]/20',
    iconColor: 'text-[#00F2A9]',
    accentBorder: 'mint',
  },
  fitness: {
    iconBg: 'bg-[#00E5FF]/10 border border-[#00E5FF]/20',
    iconColor: 'text-[#00E5FF]',
    accentBorder: 'cyan',
  },
  nutrition: {
    iconBg: 'bg-[#FB923C]/10 border border-[#FB923C]/20',
    iconColor: 'text-[#FB923C]',
    accentBorder: 'orange',
  },
  sleep: {
    iconBg: 'bg-[#A78BFA]/10 border border-[#A78BFA]/20',
    iconColor: 'text-[#A78BFA]',
    accentBorder: 'purple',
  },
  water: {
    iconBg: 'bg-[#38BDF8]/10 border border-[#38BDF8]/20',
    iconColor: 'text-[#38BDF8]',
    accentBorder: 'water',
  },
  neutral: {
    iconBg: 'bg-[var(--bg-subtle)] border border-[var(--card-border)]',
    iconColor: 'text-[var(--text-secondary)]',
    accentBorder: 'none',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  category = 'neutral',
  trend,
  onClick,
  className = '',
}) => {
  const categoryStyle = CATEGORY_STYLES[category];

  return (
    <Card
      variant="solid"
      accent={categoryStyle.accentBorder}
      hoverEffect={!!onClick}
      padding="md"
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-xs font-medium text-[var(--text-muted)] tracking-wide uppercase">
          {title}
        </span>
        {icon && (
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${categoryStyle.iconBg} ${categoryStyle.iconColor}`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-bold font-mono-num text-[var(--text-primary)] tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">
            {unit}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`font-mono-num font-medium text-xs flex items-center gap-0.5 ml-auto ${
                trend.positive
                  ? 'text-[#00F2A9]'
                  : trend.direction === 'neutral'
                  ? 'text-[var(--text-muted)]'
                  : 'text-[#FB923C]'
              }`}
            >
              {trend.direction === 'up' && '↑'}
              {trend.direction === 'down' && '↓'}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
