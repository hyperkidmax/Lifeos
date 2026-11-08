import React, { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'mint' | 'cyan' | 'purple' | 'orange' | 'water' | 'emerald' | 'amber' | 'rose' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const BADGE_VARIANTS = {
  mint: {
    container: 'bg-[#00F2A9]/10 text-[#00F2A9] border border-[#00F2A9]/25',
    dot: 'bg-[#00F2A9]',
  },
  cyan: {
    container: 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/25',
    dot: 'bg-[#00E5FF]',
  },
  purple: {
    container: 'bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/25',
    dot: 'bg-[#A78BFA]',
  },
  orange: {
    container: 'bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/25',
    dot: 'bg-[#FB923C]',
  },
  water: {
    container: 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/25',
    dot: 'bg-[#38BDF8]',
  },
  emerald: {
    container: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  amber: {
    container: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    dot: 'bg-amber-400',
  },
  rose: {
    container: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    dot: 'bg-rose-400',
  },
  neutral: {
    container: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--card-border)]',
    dot: 'bg-[var(--text-muted)]',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const styles = BADGE_VARIANTS[variant];
  const sizeStyles = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md tracking-tight ${styles.container} ${sizeStyles} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      {children}
    </span>
  );
};
