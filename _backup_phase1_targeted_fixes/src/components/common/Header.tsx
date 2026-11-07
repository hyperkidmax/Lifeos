import React from 'react';
import { useWellness, ActiveTab } from '../../context/WellnessContext';
import { formatDisplayDate, getTodayDateString, getGreeting } from '../../utils/dateUtils';
import {
  Sparkles,
  Calendar,
  Settings as SettingsIcon,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Activity,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    data,
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    isToday,
    loadDemoData,
    clearAllData,
    currentUser,
    syncStatus,
    syncError,
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
    <header className="sticky top-0 z-30 bg-[#080809]/90 backdrop-blur-xl border-b border-white/[0.06] pt-safe px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Greeting */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
            title="LifeOS Home"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00E5FF]/20 to-[#00E5FF]/5 border border-[#00E5FF]/40 flex items-center justify-center cyan-glow-subtle group-hover:border-[#00E5FF] transition-all">
              <Activity className="w-4 h-4 text-[#00E5FF]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white group-hover:text-[#00E5FF] transition-colors">
                  Life<span className="text-[#00E5FF]">OS</span>
                </span>
                {data.isDemoMode ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('settings');
                    }}
                    className="text-[9px] uppercase font-mono-num px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                    title="Demo Mode is Active - Click to change in Settings"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Demo Mode
                  </span>
                ) : (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('settings');
                    }}
                    className="text-[9px] uppercase font-mono-num px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/40 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                    title="Real Personal Tracking Mode - Click to view in Settings"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Real Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium">
                {getGreeting()}, {data.profile.name.split(' ')[0]}
              </p>
            </div>
          </button>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center bg-[#141418] border border-white/[0.08] rounded-lg p-0.5 shadow-sm">
          <button
            onClick={handlePrevDay}
            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Previous day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={jumpToToday}
            className={`px-2.5 py-1 text-xs font-mono-num font-medium rounded transition-all cursor-pointer ${
              isToday
                ? 'text-[#00E5FF] hover:bg-[#00E5FF]/10'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Click to jump to today"
          >
            {isToday ? `Today (${formatDisplayDate(selectedDate)})` : formatDisplayDate(selectedDate)}
          </button>

          <button
            onClick={handleNextDay}
            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Next day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action icons: Sync Status, Progress & Settings */}
        <div className="flex items-center gap-1.5">
          {/* Cloud Sync Status Pill */}
          <button
            onClick={() => {
              if (currentUser) {
                syncWithCloud().catch(() => {});
              } else {
                setActiveTab('settings');
              }
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono-num font-medium transition-all cursor-pointer border ${
              syncStatus === 'synced'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40'
                : syncStatus === 'syncing'
                ? 'bg-cyan-950/40 text-[#00E5FF] border-cyan-500/30'
                : syncStatus === 'error'
                ? 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/40'
                : 'bg-neutral-900/70 text-neutral-400 border-white/[0.08] hover:border-white/[0.15]'
            }`}
            title={
              currentUser
                ? `Cloud Sync: ${syncStatus.toUpperCase()} (Click to sync now)`
                : 'Cloud Sync: Local Storage only (Click to sign in with Google)'
            }
          >
            {syncStatus === 'synced' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="hidden xs:inline">Synced</span>
              </>
            ) : syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3 h-3 text-[#00E5FF] animate-spin" />
                <span className="hidden xs:inline">Syncing</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span className="hidden xs:inline">Sync Error</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3 h-3 text-neutral-400" />
                <span className="hidden xs:inline">Offline</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'progress'
                ? 'bg-[#00E5FF]/15 text-[#00E5FF]'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.06]'
            }`}
            title="Body Progress & Analytics"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#00E5FF]/15 text-[#00E5FF]'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.06]'
            }`}
            title="Settings & Data"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Sync Toast Notification */}
      {syncToast && (
        <div
          className={`mt-2 -mx-4 -mb-3 px-4 py-2 text-xs flex items-center justify-between border-t transition-all ${
            syncToast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/40 text-rose-200'
              : 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            {syncToast.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="font-medium text-[11px] truncate">{syncToast.message}</span>
            <button
              onClick={clearSyncToast}
              className="ml-auto text-neutral-400 hover:text-white text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
