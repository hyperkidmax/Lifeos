import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'elevated' | 'glass' | 'subtle';
  accent?: 'none' | 'mint' | 'cyan' | 'purple' | 'orange' | 'water';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'solid',
  accent = 'none',
  padding = 'md',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    solid: 'bg-[var(--card-surface)] border border-[var(--card-border)]',
    elevated: 'bg-[var(--card-surface-elevated)] border border-[var(--card-border)] shadow-sm',
    glass: 'glass-panel',
    subtle: 'bg-[var(--bg-subtle)] border border-[var(--card-border)]',
  }[variant];

  const paddingStyles = {
    none: '',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6 sm:p-7',
  }[padding];

  const accentBorder = {
    none: '',
    mint: 'hover:border-[#00F2A9]/40',
    cyan: 'hover:border-[#00E5FF]/40',
    purple: 'hover:border-[#A78BFA]/40',
    orange: 'hover:border-[#FB923C]/40',
    water: 'hover:border-[#38BDF8]/40',
  }[accent];

  const hoverStyle = hoverEffect
    ? `transition-all duration-200 hover:-translate-y-0.5 ${accentBorder}`
    : 'transition-colors duration-200';

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl relative overflow-hidden ${variantStyles} ${paddingStyles} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
