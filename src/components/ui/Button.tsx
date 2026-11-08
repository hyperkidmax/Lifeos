import React, { ReactNode } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'cyan' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F2A9]/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-5 py-3 min-h-[48px] gap-2.5 rounded-2xl',
  }[size];

  const variantStyles = {
    primary:
      'bg-[#00F2A9] text-[#060A08] font-semibold hover:bg-[#00d896] shadow-[0_0_15px_-3px_rgba(0,242,169,0.3)]',
    cyan:
      'bg-[#00E5FF] text-[#060A08] font-semibold hover:bg-[#00cce6] shadow-[0_0_15px_-3px_rgba(0,229,255,0.3)]',
    secondary:
      'bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--card-border)] hover:bg-[var(--card-surface-elevated)] hover:border-[var(--card-border-hover)]',
    ghost:
      'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]',
    outline:
      'border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] hover:border-[var(--card-border-hover)]',
    danger:
      'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
