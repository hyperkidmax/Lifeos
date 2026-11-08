import React, { useState } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { isDemoRecord } from '../../utils/mockData';
import { formatMinutesToHoursMinutes, getLast7Days, formatDisplayDate } from '../../utils/dateUtils';
import {
  HeartPulse,
  Footprints,
  Moon,
  Activity,
  Plus,
  Info,
  Radio,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

export const HealthView: React.FC = () => {
  const {
    data,
    isDemoMode,
    selectedDate,
    todaySteps,
    todaySleep,
    todayHeartRate,
    logSteps,
    logSleep,
    logHeartRate,
  } = useWellness();

  // Modal states for manual logging
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [hrModalOpen, setHrModalOpen] = useState(false);

  // Form states
  const [stepInput, setStepInput] = useState(todaySteps?.count ? String(todaySteps.count) : '10000');
  const [distanceInput, setDistanceInput] = useState(todaySteps?.distanceKm ? String(todaySteps.distanceKm) : '7.5');
  const [activeMinsInput, setActiveMinsInput] = useState(todaySteps?.activeMinutes ? String(todaySteps.activeMinutes) : '55');

  const [sleepHoursInput, setSleepHoursInput] = useState(todaySleep ? (todaySleep.totalMinutes / 60).toFixed(1) : '7.5');
  const [sleepQualityInput, setSleepQualityInput] = useState(todaySleep?.qualityScore ? String(todaySleep.qualityScore) : '85');
  const [sleepNotesInput, setSleepNotesInput] = useState(todaySleep?.notes || '');

  const [restingHrInput, setRestingHrInput] = useState(todayHeartRate?.restingBpm ? String(todayHeartRate.restingBpm) : '58');
  const [avgHrInput, setAvgHrInput] = useState(todayHeartRate?.avgBpm ? String(todayHeartRate.avgBpm) : '68');
  const [currentHrInput, setCurrentHrInput] = useState('72');

  const last7Days = getLast7Days();

  const handleSaveSteps = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(stepInput, 10);
    const dist = parseFloat(distanceInput);
    const mins = parseInt(activeMinsInput, 10);
    if (!isNaN(count)) {
      logSteps(count, isNaN(dist) ? undefined : dist, isNaN(mins) ? undefined : mins);
      setStepModalOpen(false);
    }
  };

  const handleSaveSleep = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(sleepHoursInput);
    const quality = parseInt(sleepQualityInput, 10);
    if (!isNaN(hours) && hours > 0) {
      const totalMinutes = Math.round(hours * 60);
      const deep = Math.round(totalMinutes * 0.22);
      const rem = Math.round(totalMinutes * 0.24);
      const light = Math.round(totalMinutes * 0.46);
      const awake = Math.max(0, totalMinutes - (deep + rem + light));
      logSleep(totalMinutes, deep, rem, light, awake, isNaN(quality) ? 80 : quality, sleepNotesInput);
      setSleepModalOpen(false);
    }
  };

  const handleSaveHR = (e: React.FormEvent) => {
    e.preventDefault();
    const resting = parseInt(restingHrInput, 10);
    const avg = parseInt(avgHrInput, 10);
    const curr = parseInt(currentHrInput, 10);
    logHeartRate(
      isNaN(resting) ? undefined : resting,
      isNaN(avg) ? undefined : avg,
      isNaN(curr) ? undefined : curr
    );
    setHrModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-28 pt-2">
      {/* Header & Sync Status Banner */}
      <div className="bg-[#121217] border border-white/[0.08] rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
              <span className="text-xs font-mono-num uppercase tracking-wider text-[#00E5FF] font-semibold">
                Health Diagnostics
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              Biometric Telemetry
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Active steps, cardiac rhythm, and polysomnographic sleep stage tracking.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#18181f] border border-white/[0.06] rounded-2xl px-3.5 py-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <div className="text-[11px]">
              <span className="text-neutral-300 font-medium block">
                Health Connect Bridge
              </span>
              <span className="text-neutral-500">
                Phase 2 Ready · Manual Mode
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. STEPS & DISTANCE SECTION */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <Footprints className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Daily Steps & Mobility</h2>
                {isDemoRecord(todaySteps) && (
                  <span className="text-[10px] uppercase font-mono-num px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                    Demo Data
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400">Pedometer & movement metrics</span>
            </div>
          </div>

          <button
            onClick={() => setStepModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {todaySteps ? 'Update Steps' : 'Log Steps'}
          </button>
        </div>

        {todaySteps ? (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Total Steps</span>
                <span className="text-2xl font-bold font-mono-num text-white mt-1 block">
                  {todaySteps.count.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#00E5FF] font-mono-num mt-0.5 block">
                  {Math.round((todaySteps.count / data.goals.dailySteps) * 100)}% of goal
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Distance</span>
                <span className="text-2xl font-bold font-mono-num text-white mt-1 block">
                  {todaySteps.distanceKm}
                </span>
                <span className="text-[11px] text-neutral-400 mt-0.5 block">km walked</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Active Time</span>
                <span className="text-2xl font-bold font-mono-num text-white mt-1 block">
                  {todaySteps.activeMinutes}
                </span>
                <span className="text-[11px] text-neutral-400 mt-0.5 block">active mins</span>
              </div>
            </div>

            {/* 7-Day Steps History Mini Bar Chart */}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span>Last 7 Days Steps</span>
                <span>Target: {data.goals.dailySteps.toLocaleString()}</span>
              </div>
              <div className="flex items-end justify-between gap-2 h-24 pt-4">
                {(() => {
                  const activeStepLogs = isDemoMode ? data.stepLogs : data.stepLogs.filter((s) => !isDemoRecord(s));
                  return last7Days.map((dateStr) => {
                    const log = activeStepLogs.find((s) => s.date === dateStr);
                    const count = log?.count || 0;
                  const pct = Math.min((count / data.goals.dailySteps) * 100, 100);
                  const isCur = dateStr === selectedDate;
                  return (
                    <div key={dateStr} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full bg-white/[0.04] rounded-t-lg h-full flex items-end overflow-hidden p-0.5">
                        <div
                          style={{ height: `${pct || 4}%` }}
                          className={`w-full rounded-t transition-all duration-500 ${
                            count >= data.goals.dailySteps
                              ? 'bg-[#00E5FF] cyan-glow-subtle'
                              : count > 0
                              ? 'bg-neutral-600'
                              : 'bg-neutral-800'
                          } ${isCur ? 'ring-1 ring-white/50' : ''}`}
                        />
                      </div>
                      <span className={`text-[10px] font-mono-num ${isCur ? 'text-[#00E5FF] font-bold' : 'text-neutral-500'}`}>
                        {formatDisplayDate(dateStr).split(' ')[0]}
                      </span>
                    </div>
                  );
                });
              })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#181820] border border-dashed border-white/[0.08] text-center">
            <Footprints className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-300 font-medium">No steps recorded for this date</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              Never invent health data. Tap below to log steps manually or connect in Phase 2.
            </p>
            <button
              onClick={() => setStepModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-[#00E5FF] text-black text-xs font-semibold cursor-pointer"
            >
              + Log Today's Steps
            </button>
          </div>
        )}
      </div>

      {/* 2. SLEEP DURATION & AVAILABLE SLEEP STAGES */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#818CF8]/10 border border-[#818CF8]/30 flex items-center justify-center text-[#818CF8]">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Sleep & Sleep Architecture</h2>
                {isDemoRecord(todaySleep) && (
                  <span className="text-[10px] uppercase font-mono-num px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                    Demo Data
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400">Duration and hypnogram stages</span>
            </div>
          </div>

          <button
            onClick={() => setSleepModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#818CF8]/15 hover:bg-[#818CF8]/25 border border-[#818CF8]/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {todaySleep ? 'Update Sleep' : 'Log Sleep'}
          </button>
        </div>

        {todaySleep ? (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <span className="text-3xl font-bold font-mono-num text-white">
                  {Math.floor(todaySleep.totalMinutes / 60)}h {todaySleep.totalMinutes % 60}m
                </span>
                <span className="text-xs text-neutral-400 ml-2">Total Time Asleep</span>
              </div>

              {todaySleep.qualityScore && (
                <div className="text-right">
                  <span className="text-sm font-bold font-mono-num text-indigo-300">
                    {todaySleep.qualityScore} / 100
                  </span>
                  <span className="text-[10px] text-neutral-400 block">Sleep Quality Score</span>
                </div>
              )}
            </div>

            {/* Visual Sleep Stages Bar */}
            {todaySleep.stages && (
              <div className="space-y-3">
                <div className="w-full flex h-4 rounded-xl overflow-hidden gap-1 bg-[#181820] p-1 border border-white/[0.06]">
                  <div
                    style={{ width: `${(todaySleep.stages.deepMinutes / todaySleep.totalMinutes) * 100}%` }}
                    className="bg-indigo-600 rounded-sm"
                    title={`Deep Sleep: ${todaySleep.stages.deepMinutes}m`}
                  />
                  <div
                    style={{ width: `${(todaySleep.stages.remMinutes / todaySleep.totalMinutes) * 100}%` }}
                    className="bg-purple-500 rounded-sm"
                    title={`REM Sleep: ${todaySleep.stages.remMinutes}m`}
                  />
                  <div
                    style={{ width: `${(todaySleep.stages.lightMinutes / todaySleep.totalMinutes) * 100}%` }}
                    className="bg-sky-500 rounded-sm"
                    title={`Light Sleep: ${todaySleep.stages.lightMinutes}m`}
                  />
                  {todaySleep.stages.awakeMinutes > 0 && (
                    <div
                      style={{ width: `${(todaySleep.stages.awakeMinutes / todaySleep.totalMinutes) * 100}%` }}
                      className="bg-amber-500/80 rounded-sm"
                      title={`Awake: ${todaySleep.stages.awakeMinutes}m`}
                    />
                  )}
                </div>

                {/* Stages Detailed Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#181820] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <span className="text-xs text-neutral-300 font-medium">Deep Sleep</span>
                    </div>
                    <span className="text-base font-bold font-mono-num text-white mt-1 block">
                      {formatMinutesToHoursMinutes(todaySleep.stages.deepMinutes)}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {Math.round((todaySleep.stages.deepMinutes / todaySleep.totalMinutes) * 100)}% · Physical repair
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#181820] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <span className="text-xs text-neutral-300 font-medium">REM Sleep</span>
                    </div>
                    <span className="text-base font-bold font-mono-num text-white mt-1 block">
                      {formatMinutesToHoursMinutes(todaySleep.stages.remMinutes)}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {Math.round((todaySleep.stages.remMinutes / todaySleep.totalMinutes) * 100)}% · Memory consolidation
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#181820] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      <span className="text-xs text-neutral-300 font-medium">Light Sleep</span>
                    </div>
                    <span className="text-base font-bold font-mono-num text-white mt-1 block">
                      {formatMinutesToHoursMinutes(todaySleep.stages.lightMinutes)}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {Math.round((todaySleep.stages.lightMinutes / todaySleep.totalMinutes) * 100)}% · Baseline recovery
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#181820] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs text-neutral-300 font-medium">Awake</span>
                    </div>
                    <span className="text-base font-bold font-mono-num text-white mt-1 block">
                      {todaySleep.stages.awakeMinutes}m
                    </span>
                    <span className="text-[10px] text-neutral-400">Micro-arousals</span>
                  </div>
                </div>

                {todaySleep.notes && (
                  <p className="text-xs text-neutral-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04] italic">
                    "{todaySleep.notes}"
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#181820] border border-dashed border-white/[0.08] text-center">
            <Moon className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-300 font-medium">No sleep session logged for this date</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              Track duration and stages to maintain an optimal circadian schedule.
            </p>
            <button
              onClick={() => setSleepModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-[#818CF8] text-white text-xs font-semibold cursor-pointer"
            >
              + Log Sleep Duration
            </button>
          </div>
        )}
      </div>

      {/* 3. HEART RATE & RESTING HEART RATE */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Cardiac Rhythm & Resting HR</h2>
                {isDemoRecord(todayHeartRate) && (
                  <span className="text-[10px] uppercase font-mono-num px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                    Demo Data
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400">Cardiovascular fitness & recovery</span>
            </div>
          </div>

          <button
            onClick={() => setHrModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {todayHeartRate ? 'Log Reading' : 'Log Heart Rate'}
          </button>
        </div>

        {todayHeartRate ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Resting HR</span>
                <span className="text-2xl font-bold font-mono-num text-rose-400 mt-1 block">
                  {todayHeartRate.restingBpm || '--'} <span className="text-xs text-neutral-400 font-normal">bpm</span>
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Baseline resting</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Average HR</span>
                <span className="text-2xl font-bold font-mono-num text-white mt-1 block">
                  {todayHeartRate.avgBpm || '--'} <span className="text-xs text-neutral-400 font-normal">bpm</span>
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Daily average</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Lowest HR</span>
                <span className="text-2xl font-bold font-mono-num text-sky-400 mt-1 block">
                  {todayHeartRate.minBpm || '--'} <span className="text-xs text-neutral-400 font-normal">bpm</span>
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">During deep rest</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Peak HR</span>
                <span className="text-2xl font-bold font-mono-num text-amber-400 mt-1 block">
                  {todayHeartRate.maxBpm || '--'} <span className="text-xs text-neutral-400 font-normal">bpm</span>
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Peak training zone</span>
              </div>
            </div>

            {/* Readings Timeline */}
            {todayHeartRate.readings && todayHeartRate.readings.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-2 font-medium">
                  Logged Intraday Readings
                </span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {todayHeartRate.readings.map((r, i) => (
                    <div key={i} className="px-3 py-2 rounded-xl bg-[#181820] border border-white/[0.04] shrink-0 text-center">
                      <span className="text-sm font-bold font-mono-num text-white block">{r.bpm} bpm</span>
                      <span className="text-[10px] text-neutral-500 block font-mono-num">{r.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#181820] border border-dashed border-white/[0.08] text-center">
            <HeartPulse className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-300 font-medium">Heart rate sensor not connected</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              Hardware BLE / Health Connect sync disabled. You can log manual pulse readings below.
            </p>
            <button
              onClick={() => setHrModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold cursor-pointer"
            >
              + Log Heart Rate
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: STEP LOGGER */}
      {stepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Log Daily Steps</h3>
            <p className="text-xs text-neutral-400 mb-4">Update pedometer count and activity for {selectedDate}.</p>
            <form onSubmit={handleSaveSteps} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Step Count</label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  required
                  value={stepInput}
                  onChange={(e) => setStepInput(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono-num text-base focus:outline-none focus:border-[#00E5FF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={distanceInput}
                    onChange={(e) => setDistanceInput(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono-num text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Active Minutes</label>
                  <input
                    type="number"
                    value={activeMinsInput}
                    onChange={(e) => setActiveMinsInput(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono-num text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStepModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#00E5FF] text-black text-xs font-semibold cyan-glow cursor-pointer"
                >
                  Save Steps
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SLEEP LOGGER */}
      {sleepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Log Sleep Duration & Quality</h3>
            <p className="text-xs text-neutral-400 mb-4">Record your sleep duration for {selectedDate}.</p>
            <form onSubmit={handleSaveSleep} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Total Sleep Duration (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="20"
                  required
                  value={sleepHoursInput}
                  onChange={(e) => setSleepHoursInput(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono-num text-base focus:outline-none focus:border-[#818CF8]"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Quality Score (0 - 100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={sleepQualityInput}
                  onChange={(e) => setSleepQualityInput(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono-num text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Notes / Reflection</label>
                <input
                  type="text"
                  placeholder="e.g. Deep sleep, woke up refreshed"
                  value={sleepNotesInput}
                  onChange={(e) => setSleepNotesInput(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSleepModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#818CF8] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Sleep
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HEART RATE LOGGER */}
      {hrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Log Heart Rate Reading</h3>
            <p className="text-xs text-neutral-400 mb-4">Manual cardiac pulse measurement.</p>
            <form onSubmit={handleSaveHR} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Resting BPM</label>
                  <input
                    type="number"
                    min="35"
                    max="150"
                    value={restingHrInput}
                    onChange={(e) => setRestingHrInput(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono-num text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Current Reading</label>
                  <input
                    type="number"
                    min="35"
                    max="220"
                    value={currentHrInput}
                    onChange={(e) => setCurrentHrInput(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono-num text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHrModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Reading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
