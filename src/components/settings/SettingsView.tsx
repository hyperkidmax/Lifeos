import React, { useState } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { isDemoRecord } from '../../utils/mockData';
import {
  User,
  Sliders,
  Radio,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Check,
  Smartphone,
  Cloud,
  CloudOff,
  Lock,
  Layers,
  Sparkles,
  AlertTriangle,
  Database,
  Info,
  CheckCircle2,
  ShieldAlert,
  LogIn,
  LogOut,
  Server,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    data,
    isDemoMode,
    hasDemoRecords,
    setOperatingMode,
    updateProfile,
    updateGoals,
    loadDemoData,
    clearDemoDataOnly,
    clearAllData,
    exportDataJson,
    importDataJson,
    currentUser,
    isAuthLoading,
    syncStatus,
    syncError,
    lastSyncedAt,
    isMigrating,
    signInWithGoogle,
    signOut,
    syncWithCloud,
    migrateLocalData,
  } = useWellness();

  // Modals for confirmation
  const [showClearDemoConfirm, setShowClearDemoConfirm] = useState(false);
  const [showLoadDemoConfirm, setShowLoadDemoConfirm] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);
  const [showMigrateConfirm, setShowMigrateConfirm] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSyncingAction, setIsSyncingAction] = useState(false);
  const [isSigningInAction, setIsSigningInAction] = useState(false);

  // Profile Form
  const [name, setName] = useState(data.profile.name);
  const [age, setAge] = useState(data.profile.age ? String(data.profile.age) : '28');
  const [heightCm, setHeightCm] = useState(data.profile.heightCm ? String(data.profile.heightCm) : '178');
  const [weightUnit, setWeightUnit] = useState(data.profile.weightUnit);
  const [waterUnit, setWaterUnit] = useState(data.profile.waterUnit);
  const [profileSaved, setProfileSaved] = useState(false);

  // Goals Form
  const [stepGoal, setStepGoal] = useState(String(data.goals.dailySteps));
  const [activeKcalGoal, setActiveKcalGoal] = useState(String(data.goals.dailyActiveCalories));
  const [waterGoal, setWaterGoal] = useState(String(data.goals.dailyWaterMl));
  const [calGoal, setCalGoal] = useState(String(data.goals.dailyCalories));
  const [proteinGoal, setProteinGoal] = useState(String(data.goals.dailyProteinG));
  const [sleepHoursGoal, setSleepHoursGoal] = useState(String(Math.round(data.goals.dailySleepMinutes / 60)));
  const [targetWeight, setTargetWeight] = useState(data.goals.targetWeightKg ? String(data.goals.targetWeightKg) : '75');
  const [goalsSaved, setGoalsSaved] = useState(false);

  // Import JSON State
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Accurate Real vs Demo stats calculation across all categories
  const demoStepsCount = data.stepLogs.filter(isDemoRecord).length;
  const demoSleepCount = data.sleepLogs.filter(isDemoRecord).length;
  const demoHrCount = data.heartRateLogs.filter(isDemoRecord).length;
  const demoMealsCount = data.mealLogs.filter(isDemoRecord).length;
  const demoWorkoutsCount = data.workoutLogs.filter(isDemoRecord).length;
  const demoWaterCount = data.waterLogs.filter(isDemoRecord).length;
  const demoHabitsCount = data.habits.filter(isDemoRecord).length;
  const demoPrioritiesCount = data.dailyPriorities.filter(isDemoRecord).length;
  const demoJournalCount = data.journalEntries.filter(isDemoRecord).length;
  const demoBodyLogsCount = data.bodyLogs.filter(isDemoRecord).length;

  const totalDemoRecords =
    demoStepsCount +
    demoSleepCount +
    demoHrCount +
    demoMealsCount +
    demoWorkoutsCount +
    demoWaterCount +
    demoHabitsCount +
    demoPrioritiesCount +
    demoJournalCount +
    demoBodyLogsCount;

  const realStepsCount = data.stepLogs.filter((s) => !isDemoRecord(s)).length;
  const realSleepCount = data.sleepLogs.filter((s) => !isDemoRecord(s)).length;
  const realHrCount = data.heartRateLogs.filter((h) => !isDemoRecord(h)).length;
  const realMealsCount = data.mealLogs.filter((m) => !isDemoRecord(m)).length;
  const realWorkoutsCount = data.workoutLogs.filter((w) => !isDemoRecord(w)).length;
  const realWaterCount = data.waterLogs.filter((w) => !isDemoRecord(w)).length;
  const realHabitsCount = data.habits.filter((h) => !isDemoRecord(h)).length;
  const realPrioritiesCount = data.dailyPriorities.filter((p) => !isDemoRecord(p)).length;
  const realJournalCount = data.journalEntries.filter((j) => !isDemoRecord(j)).length;
  const realBodyLogsCount = data.bodyLogs.filter((b) => !isDemoRecord(b)).length;

  const totalRealRecords =
    realStepsCount +
    realSleepCount +
    realHrCount +
    realMealsCount +
    realWorkoutsCount +
    realWaterCount +
    realHabitsCount +
    realPrioritiesCount +
    realJournalCount +
    realBodyLogsCount;

  const showStatus = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleExecuteClearDemo = () => {
    clearDemoDataOnly();
    setShowClearDemoConfirm(false);
    showStatus('Demo records safely removed! Real personal logs preserved.');
  };

  const handleExecuteLoadDemo = () => {
    loadDemoData();
    setShowLoadDemoConfirm(false);
    showStatus('Realistic demo dataset loaded! Tagged as Demo Data.');
  };

  const handleExecuteResetAll = () => {
    clearAllData();
    setShowResetAllConfirm(false);
    showStatus('System reset to pristine clean slate.');
  };

  const handleSignIn = async () => {
    setIsSigningInAction(true);
    setSyncFeedback(null);
    try {
      await signInWithGoogle();
      setSyncFeedback({ text: 'Signed in successfully! Encrypted cloud sync is active.' });
    } catch (err: any) {
      setSyncFeedback({
        text: err?.message || 'Google sign-in was cancelled or encountered an error.',
        isError: true,
      });
    } finally {
      setIsSigningInAction(false);
    }
  };

  const handleSignOutUser = async () => {
    try {
      await signOut();
      setSyncFeedback({ text: 'Signed out. Your records remain safe in your local browser storage.' });
    } catch (err: any) {
      setSyncFeedback({ text: 'Sign out failed.', isError: true });
    }
  };

  const handleManualSyncNow = async () => {
    if (!currentUser) return;
    setIsSyncingAction(true);
    setSyncFeedback(null);
    try {
      await syncWithCloud();
      setSyncFeedback({
        text: `Sync complete! All records verified and written to Firestore (/users/${currentUser.uid.slice(0, 8)}.../mealLogs).`,
      });
    } catch (err: any) {
      setSyncFeedback({
        text: err?.message || 'Cloud sync failed. Please check your internet connection.',
        isError: true,
      });
    } finally {
      setIsSyncingAction(false);
    }
  };

  const handleExecuteMigrateLocal = async () => {
    setShowMigrateConfirm(false);
    setIsSyncingAction(true);
    setSyncFeedback(null);
    try {
      const res = await migrateLocalData();
      if (res) {
        const detailMsg = res.addedToCloud > 0
          ? `Uploaded ${res.addedToCloud} new local records to your private Firestore account! (Total ${res.totalUploaded} records synchronized under /users/${currentUser?.uid.slice(0, 8)}...).`
          : `All ${res.totalRecords} records (including recent meals) are safely stored in your private Firestore account (/users/${currentUser?.uid.slice(0, 8)}...). Zero duplicates created.`;
        setSyncFeedback({ text: detailMsg });
      }
    } catch (err: any) {
      setSyncFeedback({
        text: err?.message || 'Migration failed. Your local data remains completely safe.',
        isError: true,
      });
    } finally {
      setIsSyncingAction(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim() || 'Alex',
      age: parseInt(age, 10) || undefined,
      heightCm: parseInt(heightCm, 10) || undefined,
      weightUnit,
      waterUnit,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    updateGoals({
      dailySteps: parseInt(stepGoal, 10) || 10000,
      dailyActiveCalories: parseInt(activeKcalGoal, 10) || 500,
      dailyWaterMl: parseInt(waterGoal, 10) || 2500,
      dailyCalories: parseInt(calGoal, 10) || 2200,
      dailyProteinG: parseInt(proteinGoal, 10) || 150,
      dailySleepMinutes: (parseFloat(sleepHoursGoal) || 8) * 60,
      targetWeightKg: parseFloat(targetWeight) || undefined,
    });
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 2000);
  };

  const handleExportData = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-wellness-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    const result = importDataJson(importText.trim(), { mode: 'merge' });
    if (result.success) {
      setImportMessage({ text: result.message });
      setImportText('');
    } else {
      setImportMessage({ text: result.message, error: true });
    }
  };

  return (
    <div className="space-y-6 pb-28 pt-2">
      {/* Banner */}
      <div className="bg-[#121217] border border-white/[0.08] rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div>
          <span className="text-xs font-mono-num uppercase tracking-wider text-[#00E5FF] font-semibold">
            System Preferences & Data Controls
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            LifeOS Configuration
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Personal profile, daily biometric targets, privacy sandbox, and health sync architecture.
          </p>
        </div>
      </div>

      {/* Floating Status Notification */}
      {statusNotification && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* 1. OPERATING MODE: REAL MODE VS DEMO MODE */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              !isDemoMode
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Operating Mode</h2>
                {!isDemoMode ? (
                  <span className="text-[10px] uppercase font-mono-num px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Real Mode Active
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono-num px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Demo Mode Active
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400">Choose between authentic personal tracking or test data</span>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#181820] p-1.5 rounded-2xl border border-white/[0.06] mb-4">
          <button
            type="button"
            onClick={() => {
              if (isDemoMode) {
                setOperatingMode('real');
                showStatus('Switched to Real Mode. Authentic manual records active.');
              }
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !isDemoMode
                ? 'bg-emerald-500 text-black shadow-lg font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Real Mode (Authentic)
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isDemoMode) {
                if (hasDemoRecords) {
                  setOperatingMode('demo');
                  showStatus('Switched to Demo Mode view.');
                } else {
                  setShowLoadDemoConfirm(true);
                }
              }
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isDemoMode
                ? 'bg-amber-400 text-black shadow-lg font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Demo Mode (Sample Data)
          </button>
        </div>

        {/* Mode Description & Real Records Breakdown */}
        {!isDemoMode ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="text-emerald-300 font-semibold block">Clean Personal Sandbox</span>
                  <p className="text-neutral-300 mt-0.5 leading-relaxed">
                    In Real Mode, LifeOS never fabricates fictitious metrics or sample steps. All calculations and rings strictly reflect your real manual inputs. Missing measurements display <strong className="text-white">"No data yet"</strong> or <strong className="text-white">"Not connected"</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Authenticated Personal Storage Counter */}
            <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2">
                Your Authentic Saved Records ({totalRealRecords} entries)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-xs font-mono-num font-bold text-white block">{realMealsCount}</span>
                  <span className="text-[10px] text-neutral-400">Meals</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-xs font-mono-num font-bold text-white block">{realWorkoutsCount}</span>
                  <span className="text-[10px] text-neutral-400">Workouts</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-xs font-mono-num font-bold text-white block">{realWaterCount}</span>
                  <span className="text-[10px] text-neutral-400">Hydration</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-xs font-mono-num font-bold text-white block">{realJournalCount}</span>
                  <span className="text-[10px] text-neutral-400">Journals</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-xs font-mono-num font-bold text-white block">{realBodyLogsCount}</span>
                  <span className="text-[10px] text-neutral-400">Body Logs</span>
                </div>
              </div>
            </div>

            {/* If demo records are present while in Real Mode */}
            {hasDemoRecords && (
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-200">
                    Storage contains <strong>{totalDemoRecords}</strong> demo records from a previous test.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearDemoConfirm(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Clear Demo Records Only
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="text-amber-300 font-semibold block">Demonstration Dataset Loaded</span>
                  <p className="text-neutral-300 mt-0.5 leading-relaxed">
                    Demo Mode populates realistic workouts, macros, polysomnographic sleep stages, and weight trajectory charts for evaluation. All demo records are labelled with <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono-num text-[10px] font-bold">DEMO DATA</span> tags so they are never confused with real data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOperatingMode('real')}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Switch to Real Mode
              </button>
              <button
                type="button"
                onClick={() => setShowClearDemoConfirm(true)}
                className="py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Demo Data Only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. PROFILE SETTINGS */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">User Profile</h2>
              <span className="text-xs text-neutral-400">Personal identity and metrics units</span>
            </div>
          </div>

          {profileSaved && (
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white font-mono-num focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Height (cm)</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white font-mono-num focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Weight Unit</label>
              <div className="flex bg-[#181820] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setWeightUnit('kg')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    weightUnit === 'kg' ? 'bg-[#00E5FF] text-black cyan-glow-subtle' : 'text-neutral-400'
                  }`}
                >
                  Kilograms (kg)
                </button>
                <button
                  type="button"
                  onClick={() => setWeightUnit('lbs')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    weightUnit === 'lbs' ? 'bg-[#00E5FF] text-black cyan-glow-subtle' : 'text-neutral-400'
                  }`}
                >
                  Pounds (lbs)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Water Unit</label>
              <div className="flex bg-[#181820] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setWaterUnit('ml')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    waterUnit === 'ml' ? 'bg-[#38BDF8] text-black' : 'text-neutral-400'
                  }`}
                >
                  Milliliters (ml)
                </button>
                <button
                  type="button"
                  onClick={() => setWaterUnit('oz')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    waterUnit === 'oz' ? 'bg-[#38BDF8] text-black' : 'text-neutral-400'
                  }`}
                >
                  Fluid Oz (fl oz)
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold transition-colors cursor-pointer mt-2"
          >
            Update Profile Preferences
          </button>
        </form>
      </div>

      {/* 2. DAILY GOALS CONFIGURATION */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Daily Biometric Goals</h2>
              <span className="text-xs text-neutral-400">Calibrate your daily baseline targets</span>
            </div>
          </div>

          {goalsSaved && (
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveGoals} className="space-y-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Daily Steps</label>
              <input
                type="number"
                value={stepGoal}
                onChange={(e) => setStepGoal(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono-num focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Active Burn (kcal)</label>
              <input
                type="number"
                value={activeKcalGoal}
                onChange={(e) => setActiveKcalGoal(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono-num focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Water Target (ml)</label>
              <input
                type="number"
                value={waterGoal}
                onChange={(e) => setWaterGoal(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono-num focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Sleep Goal (Hours)</label>
              <input
                type="number"
                step="0.5"
                value={sleepHoursGoal}
                onChange={(e) => setSleepHoursGoal(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono-num focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Daily Calories</label>
              <input
                type="number"
                value={calGoal}
                onChange={(e) => setCalGoal(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono-num focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#00E5FF] block mb-1">Protein Target (g)</label>
              <input
                type="number"
                value={proteinGoal}
                onChange={(e) => setProteinGoal(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono-num focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-emerald-400 block mb-1">Target Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono-num focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-400 text-black text-xs font-semibold transition-colors cursor-pointer mt-2"
          >
            Save Target Goals
          </button>
        </form>
      </div>

      {/* 3. SECURE CLOUD BACKUP & GOOGLE SIGN-IN */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Cloud Backup & Google Sign-In</h2>
              <span className="text-xs text-neutral-400">Encrypted multi-device sync with Firebase Firestore</span>
            </div>
          </div>

          {/* Real-time Sync Status Pill */}
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] uppercase font-mono-num px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-semibold ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                  : syncStatus === 'syncing'
                  ? 'bg-cyan-950/70 text-[#00E5FF] border-cyan-500/40'
                  : syncStatus === 'error'
                  ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-white/[0.08]'
              }`}
            >
              {syncStatus === 'synced' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Synced
                </>
              ) : syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-[#00E5FF] animate-spin" />
                  Syncing
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Sync Error
                </>
              ) : (
                <>
                  <CloudOff className="w-3 h-3 text-neutral-400" />
                  Offline
                </>
              )}
            </span>
          </div>
        </div>

        {/* Sync Feedback Message */}
        {syncFeedback && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-start justify-between gap-2 ${
              syncFeedback.isError
                ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.isError ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{syncFeedback.text}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-neutral-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sync Error Details & Retry */}
        {syncError && !syncFeedback && (
          <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">Cloud sync encountered an issue: {syncError}</span>
            </div>
            <button
              onClick={handleManualSyncNow}
              disabled={isSyncingAction}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-[11px] font-semibold text-rose-300 cursor-pointer transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Account State Card */}
        {currentUser ? (
          <div className="p-4 rounded-2xl bg-[#181820] border border-white/[0.08] space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google Account'}
                    className="w-10 h-10 rounded-full border border-[#00E5FF]/40 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#00E5FF] font-bold text-sm">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'G'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {currentUser.displayName || 'Google User'}
                    </span>
                    <span className="text-[10px] font-mono-num text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      Google Verified
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 block truncate max-w-[200px] sm:max-w-xs">
                    {currentUser.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSignOutUser}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/[0.08] text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                title="Sign out of Google Account (preserves all local data)"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Cloud Sync Details & Last Synced Timestamp */}
            <div className="grid grid-cols-2 gap-2 text-neutral-400 text-[11px] bg-[#121216] p-3 rounded-xl border border-white/[0.04]">
              <div>
                <span className="block text-[10px] uppercase font-mono-num text-neutral-500">Last Synced</span>
                <span className="text-white font-mono-num font-medium">
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono-num text-neutral-500">Cloud Storage</span>
                <span className="text-emerald-400 font-medium">Private Firestore</span>
              </div>
            </div>

            {/* Action Buttons: Manual Sync & Safe Migration */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isSyncingAction}
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-black text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 cyan-glow disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAction ? 'animate-spin' : ''}`} />
                <span>{isSyncingAction ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMigrateConfirm(true)}
                disabled={isSyncingAction || isMigrating}
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/[0.08] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Migrate Local Records ({totalRealRecords})</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#181820] border border-white/[0.08] space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF] shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs text-neutral-300 leading-relaxed">
                <p className="font-semibold text-white mb-0.5">Offline-First Local Storage Active</p>
                <p className="text-neutral-400">
                  Your records are stored safely on this device. Sign in with Google to back up your nutrition, workouts, hydration, habits, and journals to your private Firebase Firestore database.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningInAction || isAuthLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1e2230] hover:bg-[#252b3d] border border-[#00E5FF]/40 hover:border-[#00E5FF] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg group disabled:opacity-50"
            >
              {/* Google G Icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSigningInAction ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>
          </div>
        )}

        {/* Security & Multi-Device Isolation Information */}
        <div className="p-3 rounded-2xl bg-[#121216] border border-white/[0.04] text-[11px] text-neutral-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-white font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict Zero-Trust Privacy Guarantee</span>
          </div>
          <p className="leading-relaxed text-neutral-400">
            Each signed-in user's records are strictly isolated under <code className="text-[#00E5FF] font-mono text-[10px]">/users/&#123;userId&#125;</code>. Firestore server-side security rules mathematically prevent public access or cross-tenant data leaks.
          </p>
        </div>
      </div>

      {/* 4. DATA MANAGEMENT: DEMO TOGGLE, EXPORT & IMPORT */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Data Management & Portability</h2>
            <span className="text-xs text-neutral-400">Safe demo toggling, JSON backup, and restore</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setShowLoadDemoConfirm(true)}
            className="p-3.5 rounded-2xl bg-[#181820] hover:bg-[#20202c] border border-white/[0.06] text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-[#00E5FF] mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold">Load Demo Data</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Adds realistic sample workouts, meals, hypnogram sleep stages, and weight logs.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setShowClearDemoConfirm(true)}
            disabled={!hasDemoRecords}
            className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer group ${
              hasDemoRecords
                ? 'bg-[#181820] hover:bg-amber-950/20 border-white/[0.06] hover:border-amber-500/40'
                : 'bg-white/[0.02] border-white/[0.04] opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-semibold">
                Clear Demo Records Only {hasDemoRecords ? `(${totalDemoRecords})` : ''}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              {hasDemoRecords
                ? `Removes ${totalDemoRecords} records explicitly marked as demo data.`
                : 'No demo records currently present in storage.'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setShowResetAllConfirm(true)}
            className="p-3.5 rounded-2xl bg-[#181820] hover:bg-rose-950/20 border border-white/[0.06] hover:border-rose-500/30 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-rose-400 mb-1">
              <Trash2 className="w-4 h-4" />
              <span className="text-xs font-semibold">Reset to Clean Slate</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Permanently clears all logged history and returns to initial baseline.
            </p>
          </button>
        </div>

        {/* Export / Import */}
        <div className="pt-3 border-t border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-neutral-200 font-medium block">Export LifeOS Data</span>
              <span className="text-[11px] text-neutral-500">Download a complete JSON backup of profile and logs</span>
            </div>
            <button
              onClick={handleExportData}
              className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download JSON
            </button>
          </div>

          <form onSubmit={handleImportSubmit} className="space-y-2 pt-2">
            <label className="text-xs text-neutral-400 block">Import / Restore Backup (JSON):</label>
            <textarea
              rows={2}
              placeholder="Paste JSON string here to restore..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full bg-[#181820] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white font-mono-num focus:outline-none"
            />
            {importMessage && (
              <p
                className={`text-xs ${importMessage.error ? 'text-rose-400' : 'text-emerald-400'}`}
              >
                {importMessage.text}
              </p>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore Backup
            </button>
          </form>
        </div>
      </div>

      {/* CONFIRMATION MODAL 1: CLEAR DEMO RECORDS ONLY */}
      {showClearDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear Demo Records Only?</h3>
                <span className="text-xs text-neutral-400">Non-destructive demo removal</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06] text-xs text-neutral-300 space-y-2.5 leading-relaxed">
              <p>
                This will remove only records explicitly marked as demo data (<strong className="text-amber-300 font-semibold">{totalDemoRecords} demo entries detected</strong>).
              </p>
              
              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 space-y-1">
                <span className="font-semibold block flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Preserved Data Guarantee:
                </span>
                <p className="text-[11px] text-neutral-300">
                  All your manually entered meals, hydration logs, workouts, journal entries, body logs, profile settings, and daily goals will remain 100% intact and untouched. Records are <strong>never</strong> deleted just because they were created before switching modes.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-neutral-400">
                <span className="font-medium text-neutral-300 block mb-0.5">Safety Rule:</span>
                If the app cannot reliably distinguish a record as demo data, it will not delete it. You can also download a complete JSON backup below prior to clearing.
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={handleExportData}
                className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON Backup First
              </button>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowClearDemoConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClearDemo}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold cursor-pointer transition-colors shadow-lg"
              >
                Confirm: Clear Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL 2: LOAD DEMO DATA */}
      {showLoadDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-[#00E5FF]/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Load Realistic Demo Data?</h3>
                <span className="text-xs text-neutral-400">Testing & preview dataset</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06] text-xs text-neutral-300 space-y-2 leading-relaxed">
              <p>
                This will add realistic sample workouts, nutrition macros, hypnogram sleep stages, and weight logs clearly labelled as <strong className="text-[#00E5FF]">Demo Data</strong>.
              </p>
              <p className="text-neutral-400">
                Any existing personal logs you created will be preserved and merged safely alongside the demo records.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLoadDemoConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteLoadDemo}
                className="flex-1 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-black text-xs font-bold cursor-pointer transition-colors cyan-glow"
              >
                Confirm: Load Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL 2.5: MIGRATE LOCAL DATA TO CLOUD */}
      {showMigrateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-[#00E5FF]/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Migrate Local Records to Cloud?</h3>
                <span className="text-xs text-neutral-400">Secure deduplicated synchronization</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06] text-xs text-neutral-300 space-y-2.5 leading-relaxed">
              <p>
                This will upload your <strong className="text-[#00E5FF]">{totalRealRecords} personal records</strong> to your authenticated Google Cloud account ({currentUser?.email}).
              </p>

              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 space-y-1">
                <span className="font-semibold block flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Zero Data Loss & Safe Merge:
                </span>
                <p className="text-[11px] text-neutral-300">
                  Every item is deduplicated by unique record ID. None of your local records will be deleted or removed.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-neutral-400">
                <span className="font-medium text-neutral-300 block mb-0.5">Private Firestore Access:</span>
                Only you ({currentUser?.uid}) can read or write to this database partition.
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowMigrateConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMigrateLocal}
                className="flex-1 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-black text-xs font-bold cursor-pointer transition-colors cyan-glow"
              >
                Start Migration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL 3: RESET ALL DATA (DANGER ZONE) */}
      {showResetAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset All Local Data?</h3>
                <span className="text-xs text-rose-400">Irreversible Action · Clean Slate</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06] text-xs text-neutral-300 space-y-2 leading-relaxed">
              <p className="text-rose-300 font-medium">
                Warning: This will permanently erase ALL logged meals, hydration entries, workout history, body measurements, and journal reflections.
              </p>
              <p className="text-neutral-400">
                If you have records you wish to keep, download a JSON backup first using the "Download JSON" button.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowResetAllConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteResetAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Yes, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
