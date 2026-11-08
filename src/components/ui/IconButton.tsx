import React, { ReactNode } from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: 'primary' | 'cyan' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  active = false,
  disabled,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8 min-w-[32px] p-1 rounded-lg text-xs',
    md: 'w-10 h-10 min-w-[40px] p-2 rounded-xl text-sm',
    lg: 'w-12 h-12 min-w-[48px] p-2.5 rounded-2xl text-base',
  }[size];

  const variantStyles = {
    primary:
      'bg-[#00F2A9] text-[#060A08] hover:bg-[#00d896] shadow-[0_0_12px_-2px_rgba(0,242,169,0.3)]',
    cyan:
      'bg-[#00E5FF] text-[#060A08] hover:bg-[#00cce6] shadow-[0_0_12px_-2px_rgba(0,229,255,0.3)]',
    secondary:
      'bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--card-border)] hover:bg-[var(--card-surface-elevated)]',
    ghost: active
      ? 'bg-[var(--accent-glow)] text-[var(--accent)] font-medium'
      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]',
    outline: active
      ? 'border border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]'
      : 'border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)]',
    danger:
      'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20',
  }[variant];

  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F2A9]/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
