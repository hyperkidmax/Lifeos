import React, { useState } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { isDemoRecord } from '../../utils/mockData';
import { BodyMeasurementLog } from '../../types/wellness';
import { getLast7Days, formatDisplayDate } from '../../utils/dateUtils';
import {
  TrendingUp,
  Plus,
  Scale,
  Ruler,
  Calendar,
  Trash2,
  Target,
  ArrowDown,
  ArrowUp,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export const ProgressView: React.FC = () => {
  const {
    data,
    isDemoMode,
    selectedDate,
    logBodyMeasurement,
    deleteBodyMeasurement,
    latestWeight,
  } = useWellness();

  const [modalOpen, setModalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState(latestWeight ? String(latestWeight.weightKg) : '76.5');
  const [bfInput, setBfInput] = useState(latestWeight?.bodyFatPct ? String(latestWeight.bodyFatPct) : '15.0');
  const [waistInput, setWaistInput] = useState(latestWeight?.waistCm ? String(latestWeight.waistCm) : '82');
  const [chestInput, setChestInput] = useState(latestWeight?.chestCm ? String(latestWeight.chestCm) : '103');
  const [armsInput, setArmsInput] = useState(latestWeight?.armsCm ? String(latestWeight.armsCm) : '37.5');
  const [notesInput, setNotesInput] = useState('');

  const targetWeight = data.goals.targetWeightKg || 75.0;
  const currentWeight = latestWeight?.weightKg;
  const weightDelta = currentWeight ? parseFloat((currentWeight - targetWeight).toFixed(1)) : null;

  const activeBodyLogs = isDemoMode ? data.bodyLogs : data.bodyLogs.filter((b) => !isDemoRecord(b));
  const activeStepLogs = isDemoMode ? data.stepLogs : data.stepLogs.filter((s) => !isDemoRecord(s));
  const activeWaterLogs = isDemoMode ? data.waterLogs : data.waterLogs.filter((w) => !isDemoRecord(w));

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      logBodyMeasurement({
        date: selectedDate,
        weightKg: w,
        bodyFatPct: parseFloat(bfInput) || undefined,
        waistCm: parseFloat(waistInput) || undefined,
        chestCm: parseFloat(chestInput) || undefined,
        armsCm: parseFloat(armsInput) || undefined,
        notes: notesInput.trim() || undefined,
      });
      setModalOpen(false);
    }
  };

  // Sort body logs chronologically for chart
  const sortedLogs = [...activeBodyLogs].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Calculate SVG line points for weight
  const chartWidth = 500;
  const chartHeight = 180;
  const padding = 35;

  let weightPoints: { x: number; y: number; weight: number; date: string }[] = [];
  let minWeight = 60;
  let maxWeight = 90;

  if (sortedLogs.length > 0) {
    const weights = sortedLogs.map((l) => l.weightKg);
    minWeight = Math.floor(Math.min(...weights, targetWeight) - 2);
    maxWeight = Math.ceil(Math.max(...weights, targetWeight) + 2);

    weightPoints = sortedLogs.map((log, idx) => {
      const x =
        sortedLogs.length === 1
          ? chartWidth / 2
          : padding + (idx / (sortedLogs.length - 1)) * (chartWidth - padding * 2);
      const y =
        chartHeight -
        padding -
        ((log.weightKg - minWeight) / (maxWeight - minWeight)) * (chartHeight - padding * 2);
      return { x, y, weight: log.weightKg, date: log.date };
    });
  }

  // Target Y line
  const targetY =
    chartHeight -
    padding -
    ((targetWeight - minWeight) / (maxWeight - minWeight)) * (chartHeight - padding * 2);

  const pathD =
    weightPoints.length > 1
      ? weightPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')
      : '';

  // 7-day analytics summaries
  const last7Days = getLast7Days();

  return (
    <div className="space-y-6 pb-28 pt-2">
      {/* Banner */}
      <div className="bg-[#121217] border border-white/[0.08] rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div>
          <span className="text-xs font-mono-num uppercase tracking-wider text-[#00E5FF] font-semibold">
            Body Composition & Trajectory
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Progress & Physical Metrics
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Evaluate weight trends, body measurements, and weekly goal adherence.
          </p>
        </div>
      </div>

      {/* 1. WEIGHT & TARGET CARD */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono-num text-white">
                  {currentWeight ? `${currentWeight} kg` : 'No data yet'}
                </span>
                {weightDelta !== null && (
                  <span
                    className={`text-xs font-mono-num font-semibold px-2 py-0.5 rounded flex items-center gap-0.5 ${
                      weightDelta === 0
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                        : weightDelta > 0
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        : 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {weightDelta > 0 ? `+${weightDelta} kg to target` : `${weightDelta} kg to target`}
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400">
                Target Weight: {targetWeight} kg · Measured on-device
              </span>
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#00E5FF] text-black font-semibold text-xs cyan-glow hover:bg-[#00E5FF]/90 flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Log Weigh-In
          </button>
        </div>

        {/* Weight SVG Chart */}
        <div className="bg-[#181820] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <span>Weight Trajectory</span>
            <div className="flex items-center gap-3 font-mono-num text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-[#00E5FF] rounded" /> Measured
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-emerald-400 border-dashed" /> Target ({targetWeight}kg)
              </span>
            </div>
          </div>

          {sortedLogs.length > 0 ? (
            <div className="w-full overflow-x-auto no-scrollbar">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
                {/* Horizontal reference grids */}
                <line
                  x1={padding}
                  y1={targetY}
                  x2={chartWidth - padding}
                  y2={targetY}
                  stroke="#34D399"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />

                {/* Main trajectory path */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#00E5FF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data points */}
                {weightPoints.map((pt, i) => (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill="#00E5FF"
                      className="cursor-pointer hover:r-6 transition-all"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      {pt.weight}
                    </text>
                    <text
                      x={pt.x}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      fill="#737373"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {formatDisplayDate(pt.date).split(' ')[0]}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-neutral-500 italic">
              No weigh-in logs recorded yet. Log your first measurement above.
            </div>
          )}
        </div>
      </div>

      {/* 2. BODY MEASUREMENTS MATRIX */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Body Circumference & Body Fat</h2>
              <span className="text-xs text-neutral-400">Anthropometric measurements</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Body Fat</span>
            <span className="text-xl font-bold font-mono-num text-white mt-1 block">
              {latestWeight?.bodyFatPct ? `${latestWeight.bodyFatPct}%` : '--'}
            </span>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Estimated lipid ratio</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Waist</span>
            <span className="text-xl font-bold font-mono-num text-white mt-1 block">
              {latestWeight?.waistCm ? `${latestWeight.waistCm} cm` : '--'}
            </span>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">At navel line</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Chest</span>
            <span className="text-xl font-bold font-mono-num text-white mt-1 block">
              {latestWeight?.chestCm ? `${latestWeight.chestCm} cm` : '--'}
            </span>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Mid-chest line</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06]">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Arms</span>
            <span className="text-xl font-bold font-mono-num text-white mt-1 block">
              {latestWeight?.armsCm ? `${latestWeight.armsCm} cm` : '--'}
            </span>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Flexed bicep peak</span>
          </div>
        </div>

        {/* History Table */}
        {activeBodyLogs.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block mb-2.5">
              Measurement History
            </span>
            <div className="space-y-2">
              {activeBodyLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#181820] border border-white/[0.04] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono-num font-bold text-white">{log.weightKg} kg</span>
                    {isDemoRecord(log) && (
                      <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        Demo
                      </span>
                    )}
                    {log.bodyFatPct && <span className="text-neutral-400 font-mono-num">{log.bodyFatPct}% BF</span>}
                    {log.waistCm && <span className="text-neutral-400 font-mono-num">{log.waistCm}cm Waist</span>}
                    {log.notes && <span className="text-neutral-500 italic">"{log.notes}"</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-500 font-mono-num">{log.date}</span>
                    <button
                      onClick={() => deleteBodyMeasurement(log.id)}
                      className="p-1 text-neutral-600 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. WEEKLY ADHERENCE CHARTS */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Weekly Consistency Matrix</h2>
              <span className="text-xs text-neutral-400">Step goals & hydration adherence</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Steps consistency */}
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span>Steps Goal Adherence (Last 7 Days)</span>
              <span className="font-mono-num text-white">
                {last7Days.filter((d) => (activeStepLogs.find((s) => s.date === d)?.count || 0) >= data.goals.dailySteps).length} / 7 Days Met
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {last7Days.map((dStr) => {
                const s = activeStepLogs.find((item) => item.date === dStr);
                const count = s?.count || 0;
                const hit = count >= data.goals.dailySteps;
                return (
                  <div
                    key={dStr}
                    className={`p-2 rounded-xl text-center border ${
                      hit
                        ? 'bg-[#00E5FF]/20 border-[#00E5FF]/40 text-[#00E5FF]'
                        : count > 0
                        ? 'bg-neutral-800/60 border-white/[0.04] text-neutral-300'
                        : 'bg-neutral-900 border-white/[0.02] text-neutral-600'
                    }`}
                  >
                    <span className="text-[10px] block font-mono-num">{formatDisplayDate(dStr).split(' ')[0]}</span>
                    <span className="text-xs font-bold font-mono-num block mt-0.5">
                      {count > 0 ? `${(count / 1000).toFixed(1)}k` : '--'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hydration consistency */}
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span>Hydration Target Adherence</span>
              <span className="font-mono-num text-white">
                {last7Days.filter((d) => {
                  const dayLogs = activeWaterLogs.filter((w) => w.date === d);
                  const total = dayLogs.reduce((acc, w) => acc + w.amountMl, 0);
                  return total >= data.goals.dailyWaterMl;
                }).length} / 7 Days Met
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {last7Days.map((dStr) => {
                const dayLogs = activeWaterLogs.filter((w) => w.date === dStr);
                const total = dayLogs.reduce((acc, w) => acc + w.amountMl, 0);
                const hit = total >= data.goals.dailyWaterMl;
                return (
                  <div
                    key={dStr}
                    className={`p-2 rounded-xl text-center border ${
                      hit
                        ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                        : total > 0
                        ? 'bg-neutral-800/60 border-white/[0.04] text-neutral-300'
                        : 'bg-neutral-900 border-white/[0.02] text-neutral-600'
                    }`}
                  >
                    <span className="text-[10px] block font-mono-num">{formatDisplayDate(dStr).split(' ')[0]}</span>
                    <span className="text-xs font-bold font-mono-num block mt-0.5">
                      {total > 0 ? `${(total / 1000).toFixed(1)}L` : '--'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* WEIGH-IN MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Log Weight & Measurements</h3>
            <p className="text-xs text-neutral-400 mb-4">Record body scale and circumference metrics.</p>
            <form onSubmit={handleSaveMeasurement} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono-num text-sm focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Body Fat (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="15.0"
                    value={bfInput}
                    onChange={(e) => setBfInput(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono-num text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Waist (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={waistInput}
                    onChange={(e) => setWaistInput(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Chest (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={chestInput}
                    onChange={(e) => setChestInput(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Arms (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={armsInput}
                    onChange={(e) => setArmsInput(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono-num focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Fasted morning weigh-in"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#00E5FF] text-black text-xs font-semibold cursor-pointer cyan-glow"
                >
                  Save Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
