import React, { ReactNode } from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  variant?: 'segmented' | 'underline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeId,
  onChange,
  variant = 'segmented',
  size = 'md',
  className = '',
}: TabsProps<T>) {
  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        className={`flex items-center gap-1 border-b border-[var(--card-border)] ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#00F2A9] text-[#00F2A9] font-semibold'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const containerPadding = size === 'sm' ? 'p-1' : 'p-1.5';
  const buttonPadding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-xs sm:text-sm';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--card-border)] rounded-2xl ${containerPadding} ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-150 cursor-pointer select-none ${buttonPadding} ${
              isActive
                ? 'bg-[var(--card-surface)] text-[var(--text-primary)] shadow-sm font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
