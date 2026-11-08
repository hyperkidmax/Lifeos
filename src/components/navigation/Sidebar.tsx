import React, { useState, useEffect } from 'react';
import { useWellness, ActiveTab } from '../../context/WellnessContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  Home,
  CalendarCheck,
  Utensils,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Target,
  User,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Activity,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavLinkItem {
  id: ActiveTab;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  badge?: string;
  accentColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const {
    activeTab,
    setActiveTab,
    openQuickAdd,
    data,
    syncStatus,
    syncWithCloud,
    currentUser,
  } = useWellness();

  const primaryNav: NavLinkItem[] = [
    { id: 'home', label: 'Home', sublabel: 'Daily pulse', icon: Home, accentColor: '#00F2A9' },
    { id: 'myday', label: 'My Day', sublabel: 'Habits & schedule', icon: CalendarCheck, accentColor: '#00F2A9' },
    { id: 'nutrition', label: 'Nutrition', sublabel: 'Macros & meals', icon: Utensils, accentColor: '#FB923C' },
    { id: 'fitness', label: 'Fitness', sublabel: 'Workouts & movement', icon: Dumbbell, accentColor: '#00E5FF' },
    { id: 'health', label: 'Health', sublabel: 'Vitals & recovery', icon: HeartPulse, accentColor: '#A78BFA' },
    { id: 'progress', label: 'Intelligence', sublabel: 'Progress & insights', icon: Sparkles, accentColor: '#00E5FF' },
  ];

  return (
    <aside
      aria-label="Main application sidebar"
      className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-[var(--card-surface)] border-r border-[var(--card-border)] transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--card-border)]">
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer focus:outline-none overflow-hidden"
          title="LifeOS Dashboard"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#00F2A9]/10 border border-[#00F2A9]/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_-3px_rgba(0,242,169,0.25)]">
            <Activity className="w-5 h-5 text-[#00F2A9]" />
          </div>
          {!isCollapsed && (
            <div className="text-left overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  Life<span className="text-[#00F2A9]">OS</span>
                </span>
                <span className="text-[9px] font-mono-num px-1.5 py-0.5 rounded-sm bg-[#00F2A9]/10 text-[#00F2A9] border border-[#00F2A9]/20 font-semibold uppercase">
                  v2
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {currentUser?.displayName || (data.profile?.name && data.profile.name.toLowerCase() !== 'alex' ? data.profile.name : 'Personal Wellness')}
              </p>
            </div>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Add Action Button */}
      <div className="p-3">
        <button
          onClick={() => openQuickAdd()}
          className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00F2A9] to-[#00E5FF] text-[#060A08] font-semibold shadow-sm hover:shadow-[0_0_20px_rgba(0,242,169,0.35)] active:scale-[0.98] transition-all cursor-pointer ${
            isCollapsed ? 'h-11 p-0' : 'h-11 px-4'
          }`}
          title="Quick Log Activity / Meal / Vital"
        >
          <Plus className="w-5 h-5 stroke-[2.5] shrink-0" />
          {!isCollapsed && <span className="text-sm font-semibold tracking-tight">Quick Log</span>}
        </button>
      </div>

      {/* Primary Navigation Section */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 no-scrollbar">
        {!isCollapsed && (
          <div className="px-3 pb-1 text-[10px] uppercase font-mono-num tracking-wider text-[var(--text-muted)] font-semibold">
            Wellness Core
          </div>
        )}

        {primaryNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? `${item.label} — ${item.sublabel}` : undefined}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 cursor-pointer text-left ${
                isCollapsed ? 'justify-center h-11 px-0' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-[var(--accent-glow)] text-[var(--text-primary)] border border-[var(--accent)]/30 font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div
                className={`flex items-center justify-center shrink-0 ${
                  isActive ? 'text-[#00F2A9]' : 'text-[var(--text-muted)]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00F2A9] shadow-[0_0_8px_#00F2A9]" />
                    )}
                  </div>
                  {item.sublabel && (
                    <span className="text-[11px] text-[var(--text-muted)] block truncate font-normal">
                      {item.sublabel}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}

        {/* Secondary Nav Divider */}
        <div className="pt-4 pb-1">
          {!isCollapsed ? (
            <div className="px-3 pb-1 text-[10px] uppercase font-mono-num tracking-wider text-[var(--text-muted)] font-semibold">
              Management
            </div>
          ) : (
            <div className="border-t border-[var(--card-border)] mx-2 my-1" />
          )}
        </div>

        {/* Goals link */}
        <button
          onClick={() => setActiveTab('settings')}
          title={isCollapsed ? 'Goals & Targets' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition-all cursor-pointer text-left ${
            isCollapsed ? 'justify-center h-10 px-0' : 'px-3 py-2'
          } text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]`}
        >
          <Target className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          {!isCollapsed && <span className="text-xs font-medium">Goals & Targets</span>}
        </button>

        {/* Profile link */}
        <button
          onClick={() => setActiveTab('settings')}
          title={isCollapsed ? 'Profile' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition-all cursor-pointer text-left ${
            isCollapsed ? 'justify-center h-10 px-0' : 'px-3 py-2'
          } text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]`}
        >
          <User className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          {!isCollapsed && <span className="text-xs font-medium">Profile & Bio</span>}
        </button>

        {/* Settings link */}
        <button
          onClick={() => setActiveTab('settings')}
          title={isCollapsed ? 'Settings' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition-all cursor-pointer text-left ${
            isCollapsed ? 'justify-center h-10 px-0' : 'px-3 py-2'
          } ${
            activeTab === 'settings'
              ? 'bg-[var(--accent-glow)] text-[var(--text-primary)] border border-[var(--accent)]/30 font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <Settings className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          {!isCollapsed && <span className="text-xs font-medium">System Settings</span>}
        </button>
      </nav>

      {/* Footer: Cloud Sync Status & Theme Selector */}
      <div className="p-3 border-t border-[var(--card-border)] bg-[var(--bg-subtle)]/40 space-y-2">
        {/* Sync status */}
        <div
          onClick={() => {
            if (currentUser) syncWithCloud().catch(() => {});
            else setActiveTab('settings');
          }}
          className={`flex items-center gap-2 rounded-xl p-2 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } hover:bg-[var(--bg-subtle)]`}
          title={
            currentUser
              ? `Sync: ${syncStatus.toUpperCase()} (Click to sync now)`
              : 'Sync: Local Storage (Click to connect)'
          }
        >
          <div className="flex items-center gap-2 min-w-0">
            {syncStatus === 'synced' ? (
              <CheckCircle2 className="w-4 h-4 text-[#00F2A9] shrink-0" />
            ) : syncStatus === 'syncing' ? (
              <RefreshCw className="w-4 h-4 text-[#00E5FF] animate-spin shrink-0" />
            ) : syncStatus === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CloudOff className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            )}
            {!isCollapsed && (
              <span className="text-xs text-[var(--text-secondary)] font-mono-num truncate">
                {syncStatus === 'synced' ? 'Cloud Synced' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Error' : 'Local Mode'}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] font-mono-num text-[var(--text-muted)]">
              {data.isDemoMode ? 'DEMO' : 'REAL'}
            </span>
          )}
        </div>

        {/* Theme switcher */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between pt-1'}`}>
          {!isCollapsed && (
            <span className="text-xs text-[var(--text-muted)]">Appearance</span>
          )}
          <ThemeToggle variant={isCollapsed ? 'compact' : 'compact'} />
        </div>
      </div>
    </aside>
  );
};
