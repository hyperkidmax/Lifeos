import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: 'mint' | 'cyan' | 'purple' | 'orange' | 'water' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const BAR_VARIANTS = {
  mint: 'bg-[#00F2A9] shadow-[0_0_10px_rgba(0,242,169,0.3)]',
  cyan: 'bg-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.3)]',
  purple: 'bg-[#A78BFA] shadow-[0_0_10px_rgba(167,139,250,0.3)]',
  orange: 'bg-[#FB923C] shadow-[0_0_10px_rgba(251,146,60,0.3)]',
  water: 'bg-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.3)]',
  neutral: 'bg-[var(--accent)]',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'mint',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  }[size];

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] mb-1.5 font-mono-num">
          <span>{Math.round(value)}</span>
          <span>{Math.round(max)} ({Math.round(percentage)}%)</span>
        </div>
      )}
      <div className={`w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden ${heightStyles}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${BAR_VARIANTS[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export interface CircularProgressProps {
  value: number; // 0 to 100
  size?: number; // diameter in px
  strokeWidth?: number;
  variant?: 'mint' | 'cyan' | 'purple' | 'orange' | 'water';
  children?: React.ReactNode;
  className?: string;
}

const CIRCLE_COLORS = {
  mint: '#00F2A9',
  cyan: '#00E5FF',
  purple: '#A78BFA',
  orange: '#FB923C',
  water: '#38BDF8',
};

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 72,
  strokeWidth = 6,
  variant = 'mint',
  children,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;
  const color = CIRCLE_COLORS[variant];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-[var(--bg-subtle)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};
