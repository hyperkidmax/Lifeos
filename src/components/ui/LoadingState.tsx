import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
}) => {
  const variantStyles = {
    rectangular: '',
    circular: 'rounded-full',
    rounded: 'rounded-2xl',
  }[variant];

  return (
    <div
      className={`animate-pulse bg-[var(--bg-subtle)] ${variantStyles} ${className}`}
    />
  );
};

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'mint' | 'cyan' | 'current';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'mint',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  }[size];

  const colorStyles = {
    mint: 'border-[#00F2A9]/20 border-t-[#00F2A9]',
    cyan: 'border-[#00E5FF]/20 border-t-[#00E5FF]',
    current: 'border-current/20 border-t-current',
  }[variant];

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full animate-spin ${sizeStyles} ${colorStyles} ${className}`}
    />
  );
};
