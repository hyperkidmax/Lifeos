import React, { useState } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { isDemoRecord } from '../../utils/mockData';
import { WorkoutLog, WorkoutExercise, WorkoutSet } from '../../types/wellness';
import {
  Dumbbell,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Circle,
  Timer,
  ChevronDown,
  ChevronUp,
  Flame,
  Award,
  Layers,
} from 'lucide-react';

const PRESET_TEMPLATES = [
  {
    title: 'Upper Body Hypertrophy',
    category: 'Strength',
    durationMinutes: 50,
    caloriesBurned: 380,
    exercises: [
      {
        name: 'Incline Dumbbell Press',
        category: 'chest' as const,
        sets: [
          { setNumber: 1, reps: 10, weightKg: 28, completed: true, rpe: 8 },
          { setNumber: 2, reps: 10, weightKg: 30, completed: true, rpe: 8.5 },
          { setNumber: 3, reps: 8, weightKg: 32, completed: true, rpe: 9 },
        ],
      },
      {
        name: 'Lat Pulldown',
        category: 'back' as const,
        sets: [
          { setNumber: 1, reps: 12, weightKg: 60, completed: true, rpe: 8 },
          { setNumber: 2, reps: 10, weightKg: 65, completed: true, rpe: 8.5 },
          { setNumber: 3, reps: 10, weightKg: 65, completed: true, rpe: 9 },
        ],
      },
    ],
  },
  {
    title: 'Leg Day & Posterior Chain',
    category: 'Strength',
    durationMinutes: 55,
    caloriesBurned: 420,
    exercises: [
      {
        name: 'Barbell Back Squat',
        category: 'legs' as const,
        sets: [
          { setNumber: 1, reps: 8, weightKg: 100, completed: true, rpe: 8 },
          { setNumber: 2, reps: 8, weightKg: 105, completed: true, rpe: 8.5 },
          { setNumber: 3, reps: 6, weightKg: 110, completed: true, rpe: 9 },
        ],
      },
      {
        name: 'Romanian Deadlift',
        category: 'legs' as const,
        sets: [
          { setNumber: 1, reps: 10, weightKg: 80, completed: true, rpe: 8 },
          { setNumber: 2, reps: 10, weightKg: 85, completed: true, rpe: 8.5 },
        ],
      },
    ],
  },
  {
    title: '5km Aerobic Tempo Run',
    category: 'Cardio',
    durationMinutes: 28,
    caloriesBurned: 310,
    exercises: [
      {
        name: 'Outdoor Running',
        category: 'cardio' as const,
        sets: [
          { setNumber: 1, durationSec: 1680, completed: true },
        ],
      },
    ],
  },
];

export const FitnessView: React.FC = () => {
  const {
    data,
    isDemoMode,
    selectedDate,
    logWorkout,
    deleteWorkout,
    todayWorkouts,
    activeWorkoutDuration,
    isWorkoutTimerRunning,
    startWorkoutTimer,
    pauseWorkoutTimer,
    resetWorkoutTimer,
  } = useWellness();

  // Active workout builder modal / state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState('Strength Training');
  const [workoutCategory, setWorkoutCategory] = useState('Strength');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [caloriesBurned, setCaloriesBurned] = useState('320');
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Active exercises being built
  const [exercises, setExercises] = useState<WorkoutExercise[]>([
    {
      id: 'ex-1',
      name: 'Incline Bench Press',
      category: 'chest',
      sets: [
        { setNumber: 1, reps: 10, weightKg: 30, completed: true, rpe: 8 },
        { setNumber: 2, reps: 10, weightKg: 30, completed: false, rpe: 8 },
        { setNumber: 3, reps: 8, weightKg: 32, completed: false, rpe: 9 },
      ],
    },
  ]);

  // Rest Timer states (seconds)
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restTimerActive, setRestTimerActive] = useState(false);

  // Interval for rest timer
  React.useEffect(() => {
    let timer: any;
    if (restTimerActive && restSecondsLeft !== null && restSecondsLeft > 0) {
      timer = setInterval(() => {
        setRestSecondsLeft((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (restSecondsLeft === 0) {
      setRestTimerActive(false);
    }
    return () => clearInterval(timer);
  }, [restTimerActive, restSecondsLeft]);

  const startRestTimer = (secs: number) => {
    setRestSecondsLeft(secs);
    setRestTimerActive(true);
  };

  const handleAddExercise = () => {
    const newEx: WorkoutExercise = {
      id: 'ex-' + Date.now(),
      name: 'Exercise #' + (exercises.length + 1),
      category: 'chest',
      sets: [{ setNumber: 1, reps: 10, weightKg: 20, completed: false, rpe: 8 }],
    };
    setExercises([...exercises, newEx]);
  };

  const handleAddSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: WorkoutSet = {
          setNumber: ex.sets.length + 1,
          reps: lastSet?.reps || 10,
          weightKg: lastSet?.weightKg || 20,
          completed: false,
          rpe: lastSet?.rpe || 8,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  const handleToggleSetComplete = (exerciseId: string, setNumber: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.setNumber === setNumber ? { ...s, completed: !s.completed } : s)),
        };
      })
    );
    // Start standard 60s rest timer on completing set
    startRestTimer(60);
  };

  const handleUpdateSet = (
    exerciseId: string,
    setNumber: number,
    field: 'reps' | 'weightKg' | 'rpe',
    value: number
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.setNumber === setNumber ? { ...s, [field]: value } : s)),
        };
      })
    );
  };

  const handleSaveWorkout = () => {
    if (!workoutTitle.trim()) return;
    logWorkout({
      date: selectedDate,
      title: workoutTitle.trim(),
      category: workoutCategory,
      durationMinutes: parseInt(durationMinutes, 10) || 45,
      caloriesBurned: parseInt(caloriesBurned, 10) || 300,
      exercises,
      notes: workoutNotes.trim() || undefined,
    });
    setIsBuilderOpen(false);
  };

  const handleLoadTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    setWorkoutTitle(tpl.title);
    setWorkoutCategory(tpl.category);
    setDurationMinutes(String(tpl.durationMinutes));
    setCaloriesBurned(String(tpl.caloriesBurned));
    setExercises(
      tpl.exercises.map((e, idx) => ({
        id: 'tpl-ex-' + idx,
        name: e.name,
        category: e.category,
        sets: e.sets.map((s) => ({ ...s })),
      }))
    );
    setIsBuilderOpen(true);
  };

  // Format workout active timer seconds to MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-28 pt-2">
      {/* Top Banner & Live Workout HUD */}
      <div className="bg-[#121217] border border-white/[0.08] rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono-num uppercase tracking-wider text-[#FF725C] font-semibold">
              Athletic Conditioning & Hypertrophy
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              Fitness & Strength Engine
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Log progressive overload, exercise sets, reps, weight loads, and training volume.
            </p>
          </div>

          {/* Live Workout Session Timer */}
          <div className="flex items-center gap-3 bg-[#181820] border border-white/[0.08] rounded-2xl p-2.5">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Session Time</span>
              <span className="text-xl font-bold font-mono-num text-white">
                {formatTimer(activeWorkoutDuration)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isWorkoutTimerRunning ? (
                <button
                  onClick={pauseWorkoutTimer}
                  className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 cursor-pointer transition-colors"
                  title="Pause Timer"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={startWorkoutTimer}
                  className="p-2 rounded-xl bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 hover:bg-[#00E5FF]/30 cursor-pointer transition-colors cyan-glow-subtle"
                  title="Start Stopwatch"
                >
                  <Play className="w-4 h-4 fill-[#00E5FF]" />
                </button>
              )}
              <button
                onClick={resetWorkoutTimer}
                className="p-2 rounded-xl bg-white/[0.04] text-neutral-400 hover:text-white cursor-pointer transition-colors"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Button & Rest Timer Ribbon */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Rest Timer:</span>
            {[30, 60, 90, 120].map((s) => (
              <button
                key={s}
                onClick={() => startRestTimer(s)}
                className={`px-2.5 py-1 text-xs rounded-lg font-mono-num transition-all cursor-pointer ${
                  restTimerActive && restSecondsLeft === s
                    ? 'bg-[#00E5FF] text-black font-semibold'
                    : 'bg-[#181820] text-neutral-300 hover:text-white border border-white/[0.06]'
                }`}
              >
                {s}s
              </button>
            ))}
            {restTimerActive && restSecondsLeft !== null && restSecondsLeft > 0 && (
              <span className="text-xs font-mono-num font-bold text-[#00E5FF] animate-pulse ml-1">
                ⏱ {restSecondsLeft}s left
              </span>
            )}
          </div>

          <button
            onClick={() => setIsBuilderOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#FF725C] text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-[#FF725C]/90 transition-all cursor-pointer shadow-lg shadow-[#FF725C]/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Workout Session
          </button>
        </div>
      </div>

      {/* QUICK WORKOUT TEMPLATES */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
            1-Tap Workout Templates
          </h2>
          <span className="text-[11px] text-neutral-500">Preset exercises & sets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESET_TEMPLATES.map((tpl) => (
            <div
              key={tpl.title}
              onClick={() => handleLoadTemplate(tpl)}
              className="bg-[#131317] hover:bg-[#181820] border border-white/[0.08] hover:border-[#FF725C]/40 rounded-2xl p-4 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-mono-num px-2 py-0.5 rounded bg-white/[0.04] text-neutral-400">
                    {tpl.category}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono-num">~{tpl.durationMinutes}m</span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-[#FF725C] transition-colors">
                  {tpl.title}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {tpl.exercises.map((e) => e.name).join(', ')}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-[#FF725C]">
                <span>Load & Start</span>
                <Play className="w-3.5 h-3.5 fill-[#FF725C]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WORKOUT HISTORY LIST */}
      {(() => {
        const displayWorkouts = isDemoMode
          ? data.workoutLogs
          : data.workoutLogs.filter((w) => !isDemoRecord(w));

        return (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Workout History ({displayWorkouts.length})
              </h2>
              <span className="text-[11px] text-neutral-500">Manual overload tracker</span>
            </div>

            {displayWorkouts.length > 0 ? (
              <div className="space-y-3.5">
                {displayWorkouts.map((wo) => {
              // Calculate total volume lifted
              const totalVolume = wo.exercises.reduce((acc, ex) => {
                const exVol = ex.sets.reduce((sAcc, s) => sAcc + (s.reps || 0) * (s.weightKg || 0), 0);
                return acc + exVol;
              }, 0);

              const totalSetsCount = wo.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

              return (
                <div
                  key={wo.id}
                  className="bg-[#131317] border border-white/[0.08] rounded-2xl p-4.5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{wo.title}</span>
                        <span className="text-[10px] uppercase font-mono-num px-1.5 py-0.5 rounded bg-white/[0.04] text-neutral-400">
                          {wo.category}
                        </span>
                        {isDemoRecord(wo) && (
                          <span className="text-[10px] uppercase font-mono-num px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Demo Data
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono-num mt-1">
                        <span>{wo.date}</span>
                        <span>·</span>
                        <span>{wo.durationMinutes} mins</span>
                        <span>·</span>
                        <span className="text-[#FF725C]">{wo.caloriesBurned || 0} kcal</span>
                        {totalVolume > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-[#00E5FF] font-semibold">{totalVolume.toLocaleString()} kg vol</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteWorkout(wo.id)}
                      className="p-1 text-neutral-600 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete workout log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {wo.notes && (
                    <p className="text-xs text-neutral-400 mt-2.5 bg-white/[0.02] p-2 rounded-xl border border-white/[0.04] italic">
                      "{wo.notes}"
                    </p>
                  )}

                  {/* Exercises and Sets Breakdown */}
                  {wo.exercises.length > 0 && (
                    <div className="mt-3.5 pt-3.5 border-t border-white/[0.04] space-y-2.5">
                      {wo.exercises.map((ex) => (
                        <div key={ex.id || ex.name} className="p-2.5 rounded-xl bg-[#181820] border border-white/[0.04]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-neutral-200">{ex.name}</span>
                            <span className="text-[10px] text-neutral-500 font-mono-num">
                              {ex.sets.length} sets
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ex.sets.map((s, sIdx) => (
                              <div
                                key={sIdx}
                                className={`px-2 py-1 rounded text-[11px] font-mono-num ${
                                  s.completed
                                    ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                                    : 'bg-white/[0.04] text-neutral-400'
                                }`}
                              >
                                #{s.setNumber}: {s.reps ? `${s.reps}r` : ''}{s.weightKg ? ` @ ${s.weightKg}kg` : ''}
                                {s.durationSec ? ` ${s.durationSec}s` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#131317] border border-dashed border-white/[0.08] text-center">
            <Dumbbell className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-300 font-medium">No workouts logged yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              Start an empty workout or pick one of the 1-tap templates above.
            </p>
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-[#FF725C] text-black text-xs font-semibold cursor-pointer"
            >
              + Create Workout
            </button>
          </div>
        )}
      </div>
    );
  })()}

      {/* WORKOUT BUILDER MODAL */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#121217] border border-white/[0.08] rounded-2xl p-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-semibold text-white">Workout Logger & Overload</h3>
                <span className="text-xs text-neutral-400">Add exercises, sets, reps, and weights</span>
              </div>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              {/* Header Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Workout Title</label>
                  <input
                    type="text"
                    required
                    value={workoutTitle}
                    onChange={(e) => setWorkoutTitle(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF725C]"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Category</label>
                  <select
                    value={workoutCategory}
                    onChange={(e) => setWorkoutCategory(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Strength">Strength / Hypertrophy</option>
                    <option value="Cardio">Cardio / Running</option>
                    <option value="HIIT">HIIT / Conditioning</option>
                    <option value="Mobility">Mobility & Yoga</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Calories Burned (kcal)</label>
                  <input
                    type="number"
                    value={caloriesBurned}
                    onChange={(e) => setCaloriesBurned(e.target.value)}
                    className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono-num"
                  />
                </div>
              </div>

              {/* Exercises List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                    Exercises ({exercises.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddExercise}
                    className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Exercise
                  </button>
                </div>

                {exercises.map((ex, exIdx) => (
                  <div key={ex.id} className="p-3.5 rounded-2xl bg-[#181820] border border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExercises((prev) =>
                            prev.map((item) => (item.id === ex.id ? { ...item, name: val } : item))
                          );
                        }}
                        className="bg-transparent text-sm font-semibold text-white border-b border-transparent hover:border-white/20 focus:border-[#00E5FF] focus:outline-none flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setExercises(exercises.filter((item) => item.id !== ex.id))}
                        className="text-neutral-500 hover:text-rose-400 text-xs cursor-pointer"
                        title="Remove exercise"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Sets Table */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-12 gap-1.5 text-[10px] text-neutral-400 font-mono-num px-1">
                        <span className="col-span-2">SET</span>
                        <span className="col-span-3">KG</span>
                        <span className="col-span-3">REPS</span>
                        <span className="col-span-2">RPE</span>
                        <span className="col-span-2 text-right">DONE</span>
                      </div>

                      {ex.sets.map((set) => (
                        <div
                          key={set.setNumber}
                          className={`grid grid-cols-12 gap-1.5 items-center p-1.5 rounded-xl border ${
                            set.completed
                              ? 'bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-white/[0.02] border-white/[0.04]'
                          }`}
                        >
                          <span className="col-span-2 text-xs font-mono-num text-neutral-400 font-medium pl-1">
                            #{set.setNumber}
                          </span>

                          <div className="col-span-3">
                            <input
                              type="number"
                              step="0.5"
                              value={set.weightKg ?? ''}
                              onChange={(e) =>
                                handleUpdateSet(ex.id, set.setNumber, 'weightKg', parseFloat(e.target.value) || 0)
                              }
                              className="w-full bg-[#111115] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white font-mono-num focus:outline-none"
                            />
                          </div>

                          <div className="col-span-3">
                            <input
                              type="number"
                              value={set.reps ?? ''}
                              onChange={(e) =>
                                handleUpdateSet(ex.id, set.setNumber, 'reps', parseInt(e.target.value, 10) || 0)
                              }
                              className="w-full bg-[#111115] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white font-mono-num focus:outline-none"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.5"
                              min="1"
                              max="10"
                              value={set.rpe ?? ''}
                              onChange={(e) =>
                                handleUpdateSet(ex.id, set.setNumber, 'rpe', parseFloat(e.target.value) || 0)
                              }
                              className="w-full bg-[#111115] border border-white/[0.08] rounded-lg px-1.5 py-1 text-xs text-white font-mono-num focus:outline-none"
                            />
                          </div>

                          <div className="col-span-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleSetComplete(ex.id, set.setNumber)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center ${
                                set.completed ? 'text-emerald-400' : 'text-neutral-500 hover:text-white'
                              }`}
                            >
                              {set.completed ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSet(ex.id)}
                      className="w-full py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      + Add Set
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Workout Notes & Reflections</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Great shoulder pump, hit PR on set 2"
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveWorkout}
                className="flex-1 py-2.5 rounded-xl bg-[#FF725C] text-black text-xs font-semibold cursor-pointer"
              >
                Finish & Save Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
