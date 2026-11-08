import React, { ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accent?: 'mint' | 'cyan' | 'purple' | 'orange' | 'water' | 'none';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  accent = 'mint',
  className = '',
}) => {
  const accentStyles = {
    mint: 'bg-[#00F2A9]/10 text-[#00F2A9] border-[#00F2A9]/20',
    cyan: 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20',
    purple: 'bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/20',
    orange: 'bg-[#FB923C]/10 text-[#FB923C] border-[#FB923C]/20',
    water: 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20',
    none: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--card-border)]',
  }[accent];

  return (
    <Card
      variant="subtle"
      padding="lg"
      className={`text-center flex flex-col items-center justify-center py-10 sm:py-14 ${className}`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center border mb-3.5 ${accentStyles}`}
      >
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm mt-1 mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant={accent === 'cyan' ? 'cyan' : 'primary'} size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
};
