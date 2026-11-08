import React from 'react';
import { useWellness } from '../../context/WellnessContext';
import { formatDisplayDate, getTodayDateString, getPersonalizedGreeting } from '../../utils/dateUtils';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  Calendar,
  Settings as SettingsIcon,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Activity,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    data,
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    isToday,
    currentUser,
    syncStatus,
    syncWithCloud,
    syncToast,
    clearSyncToast,
  } = useWellness();

  // Auto-dismiss sync toast after 5s
  React.useEffect(() => {
    if (syncToast) {
      const timer = setTimeout(() => {
        clearSyncToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncToast, clearSyncToast]);

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const yStr = date.getFullYear();
    const mStr = String(date.getMonth() + 1).padStart(2, '0');
    const dStr = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${yStr}-${mStr}-${dStr}`);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const yStr = date.getFullYear();
    const mStr = String(date.getMonth() + 1).padStart(2, '0');
    const dStr = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${yStr}-${mStr}-${dStr}`);
  };

  const jumpToToday = () => {
    setSelectedDate(getTodayDateString());
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--card-border)] pt-safe px-3 sm:px-6 py-2.5 transition-colors">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Greeting (visible on mobile or when desktop sidebar is collapsed) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none shrink-0"
            title="LifeOS Home"
          >
            <div className="w-8 h-8 rounded-xl bg-[#00F2A9]/10 border border-[#00F2A9]/30 flex items-center justify-center shrink-0 group-hover:border-[#00F2A9] transition-all shadow-[0_0_12px_-2px_rgba(0,242,169,0.2)]">
              <Activity className="w-4 h-4 text-[#00F2A9]" />
            </div>
            <div className="hidden xs:block">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-[var(--text-primary)] group-hover:text-[#00F2A9] transition-colors">
                  Life<span className="text-[#00F2A9]">OS</span>
                </span>
                {data.isDemoMode ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('settings');
                    }}
                    className="text-[9px] uppercase font-mono-num px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                    title="Demo Mode is Active - Click to change in Settings"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Demo
                  </span>
                ) : (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('settings');
                    }}
                    className="text-[9px] uppercase font-mono-num px-1.5 py-0.5 rounded bg-[#00F2A9]/15 text-[#00F2A9] border border-[#00F2A9]/30 hover:bg-[#00F2A9]/25 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                    title="Real Personal Tracking Mode - Click to view in Settings"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F2A9]" />
                    Real
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-medium truncate max-w-[130px] sm:max-w-none">
                {getPersonalizedGreeting(data.profile?.name, currentUser?.displayName)}
              </p>
            </div>
          </button>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center bg-[var(--bg-subtle)] border border-[var(--card-border)] rounded-xl p-0.5 shadow-xs">
          <button
            onClick={handlePrevDay}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--card-surface)] transition-colors cursor-pointer"
            title="Previous day"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={jumpToToday}
            className={`px-2 sm:px-3 py-1 text-xs font-mono-num font-medium rounded-lg transition-all cursor-pointer ${
              isToday
                ? 'text-[#00F2A9] bg-[#00F2A9]/10 font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-surface)]'
            }`}
            title="Click to jump to today"
          >
            {isToday ? `Today (${formatDisplayDate(selectedDate)})` : formatDisplayDate(selectedDate)}
          </button>

          <button
            onClick={handleNextDay}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--card-surface)] transition-colors cursor-pointer"
            title="Next day"
            aria-label="Next day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action icons: Sync Status, Theme Toggle, Mobile MyDay shortcut, Settings */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Cloud Sync Status Pill */}
          <button
            onClick={() => {
              if (currentUser) {
                syncWithCloud().catch(() => {});
              } else {
                setActiveTab('settings');
              }
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] font-mono-num font-medium transition-all cursor-pointer border ${
              syncStatus === 'synced'
                ? 'bg-[#00F2A9]/10 text-[#00F2A9] border-[#00F2A9]/30 hover:bg-[#00F2A9]/20'
                : syncStatus === 'syncing'
                ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
                : syncStatus === 'error'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--card-border)] hover:border-[var(--card-border-hover)]'
            }`}
            title={
              currentUser
                ? `Cloud Sync: ${syncStatus.toUpperCase()} (Click to sync now)`
                : 'Cloud Sync: Local Storage only (Click to sign in with Google)'
            }
          >
            {syncStatus === 'synced' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F2A9]" />
                <span className="hidden sm:inline">Synced</span>
              </>
            ) : syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3 h-3 text-[#00E5FF] animate-spin" />
                <span className="hidden sm:inline">Syncing</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span className="hidden sm:inline">Sync Error</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </button>

          {/* Theme Toggle (Header Quick Switch) */}
          <div className="hidden sm:block">
            <ThemeToggle variant="compact" />
          </div>

          {/* Mobile My Day Shortcut (if on small screen) */}
          <button
            onClick={() => setActiveTab('myday')}
            className={`lg:hidden p-2 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'myday'
                ? 'bg-[#00F2A9]/15 text-[#00F2A9]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
            title="My Day: Habits & Schedule"
            aria-label="My Day"
          >
            <CalendarCheck className="w-4 h-4" />
          </button>

          {/* Settings Shortcut */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#00F2A9]/15 text-[#00F2A9]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
            title="Settings & Preferences"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Sync Toast Notification */}
      {syncToast && (
        <div
          className={`mt-2 -mx-3 sm:-mx-6 -mb-2.5 px-4 py-2 text-xs flex items-center justify-between border-t transition-all ${
            syncToast.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-[#00F2A9]/15 border-[#00F2A9]/30 text-[#00F2A9]'
          }`}
        >
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            {syncToast.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00F2A9] shrink-0" />
            )}
            <span className="font-medium text-[11px] truncate">{syncToast.message}</span>
            <button
              onClick={clearSyncToast}
              className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
