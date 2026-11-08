import React, { useState, useEffect, useRef } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { isDemoRecord } from '../../utils/mockData';
import { getLast7Days, formatDisplayDate } from '../../utils/dateUtils';
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Flame,
  Smile,
  Zap,
  BookOpen,
  Sparkles,
  Sun,
  Activity,
  Moon,
  Heart,
  Droplet,
  Coffee,
  Check,
  AlertCircle,
  Edit3,
} from 'lucide-react';

const MOOD_OPTIONS = [
  { level: 1 as const, emoji: '😫', label: 'Drained' },
  { level: 2 as const, emoji: '😕', label: 'Low Energy' },
  { level: 3 as const, emoji: '😐', label: 'Balanced' },
  { level: 4 as const, emoji: '😊', label: 'Energetic' },
  { level: 5 as const, emoji: '⚡', label: 'Peak Flow' },
];

const HABIT_ICONS = [
  { name: 'Sun', icon: Sun },
  { name: 'Activity', icon: Activity },
  { name: 'Moon', icon: Moon },
  { name: 'Heart', icon: Heart },
  { name: 'Droplet', icon: Droplet },
  { name: 'Coffee', icon: Coffee },
];

export const MyDayView: React.FC = () => {
  const {
    data,
    isDemoMode,
    selectedDate,
    setSelectedDate,
    todayPriorities,
    addPriority,
    togglePriority,
    deletePriority,
    todayHabitsStatus,
    toggleHabit,
    createHabit,
    deleteHabit,
    todayJournal,
    saveJournalEntry,
    deleteJournalEntry,
  } = useWellness();

  // Priority input
  const [newPriorityText, setNewPriorityText] = useState('');

  // Habit modal
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState<'mind' | 'body' | 'sleep' | 'recovery' | 'productivity'>('body');
  const [selectedIconName, setSelectedIconName] = useState('Activity');

  // Journal form state
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(todayJournal?.mood || 4);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(todayJournal?.energy || 4);
  const [reflection, setReflection] = useState(todayJournal?.reflection || '');
  const [gratitude, setGratitude] = useState(todayJournal?.gratitude || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(todayJournal?.tags || ['Focus', 'Recovery']);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const prevDateRef = useRef(selectedDate);

  // Sync journal inputs whenever selectedDate changes or todayJournal is updated
  useEffect(() => {
    if (todayJournal) {
      setMood(todayJournal.mood ?? 4);
      setEnergy(todayJournal.energy ?? 4);
      setReflection(todayJournal.reflection ?? '');
      setGratitude(todayJournal.gratitude ?? '');
      setSelectedTags(todayJournal.tags && todayJournal.tags.length > 0 ? todayJournal.tags : ['Focus', 'Recovery']);
    } else {
      setMood(4);
      setEnergy(4);
      setReflection('');
      setGratitude('');
      setSelectedTags(['Focus', 'Recovery']);
    }

    // Only reset status and errors when user actually navigated to a different date
    if (prevDateRef.current !== selectedDate) {
      prevDateRef.current = selectedDate;
      setSaveStatus('idle');
      setErrorMessage('');
    }
  }, [selectedDate, todayJournal]);

  const last7Days = getLast7Days();

  const handleAddPriority = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriorityText.trim()) return;
    addPriority(newPriorityText.trim());
    setNewPriorityText('');
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    createHabit({
      title: newHabitTitle.trim(),
      category: newHabitCategory,
      targetDaysPerWeek: 7,
      icon: selectedIconName,
      color: '#00E5FF',
    });
    setNewHabitTitle('');
    setHabitModalOpen(false);
  };

  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setErrorMessage('');

    try {
      const ok = saveJournalEntry({
        date: selectedDate,
        mood,
        energy,
        reflection: reflection.trim(),
        gratitude: gratitude.trim(),
        tags: selectedTags,
      });

      if (ok) {
        setSaveStatus('success');
        setLastSavedTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        setTimeout(() => {
          setSaveStatus((current) => (current === 'success' ? 'idle' : current));
        }, 4000);
      } else {
        setSaveStatus('error');
        setErrorMessage('Failed to save journal entry. Please verify browser local storage availability.');
      }
    } catch (err: any) {
      console.error('Save error', err);
      setSaveStatus('error');
      setErrorMessage(err?.message || 'An unexpected error occurred while saving your journal.');
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const completedPrioritiesCount = todayPriorities.filter((p) => p.completed).length;

  return (
    <div className="space-y-6 pb-28 pt-2">
      {/* Banner Card */}
      <div className="bg-[#121217] border border-white/[0.08] rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div>
          <span className="text-xs font-mono-num uppercase tracking-wider text-emerald-400 font-semibold">
            Intentionality & Mindset
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            My Day & Habit Architecture
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Rule your day with daily focus priorities, uninterrupted streaks, and cognitive reflection.
          </p>
        </div>
      </div>

      {/* 1. DAILY PRIORITIES (TOP 3 FOCUS) */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Top Daily Priorities</h2>
              <span className="text-xs text-neutral-400 font-mono-num">
                {completedPrioritiesCount} of {todayPriorities.length} tasks completed
              </span>
            </div>
          </div>
        </div>

        {/* Priority items list */}
        <div className="space-y-2 mb-4">
          {todayPriorities.map((prio) => (
            <div
              key={prio.id}
              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                prio.completed
                  ? 'bg-neutral-900/50 border-white/[0.04] text-neutral-500'
                  : 'bg-[#181820] border-white/[0.08] text-white hover:border-[#00E5FF]/40'
              }`}
            >
              <button
                onClick={() => togglePriority(prio.id)}
                className="flex items-center gap-3 flex-1 text-left cursor-pointer"
              >
                {prio.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-[#00E5FF] shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-neutral-500 hover:text-white shrink-0" />
                )}
                <span className={`text-xs font-medium leading-relaxed ${prio.completed ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
                  {prio.text}
                </span>
              </button>

              <button
                onClick={() => deletePriority(prio.id)}
                className="p-1 text-neutral-600 hover:text-rose-400 transition-colors cursor-pointer"
                title="Delete priority"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {todayPriorities.length === 0 && (
            <p className="text-xs text-neutral-500 italic py-3 text-center">
              No priorities set for today yet. Define what moves the needle most.
            </p>
          )}
        </div>

        {/* Add priority input form */}
        <form onSubmit={handleAddPriority} className="flex gap-2">
          <input
            type="text"
            placeholder="Add priority (e.g. 45m workout + 10k steps)..."
            value={newPriorityText}
            onChange={(e) => setNewPriorityText(e.target.value)}
            className="flex-1 bg-[#181820] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-purple-500 text-white font-semibold text-xs hover:bg-purple-600 transition-colors cursor-pointer"
          >
            Add
          </button>
        </form>
      </div>

      {/* 2. CUSTOM HABITS & STREAKS */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Habit Streaks & Consistency</h2>
              <span className="text-xs text-neutral-400">Micro-actions compounding daily</span>
            </div>
          </div>

          <button
            onClick={() => setHabitModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Habit
          </button>
        </div>

        {/* Habit cards */}
        <div className="space-y-3">
          {todayHabitsStatus.map(({ habit, isCompleted }) => (
            <div
              key={habit.id}
              className={`p-4 rounded-2xl border transition-all ${
                isCompleted
                  ? 'bg-[#141b18] border-emerald-500/30'
                  : 'bg-[#181820] border-white/[0.06]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-white/[0.04] border-white/[0.08] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>

                  <div>
                    <h3 className={`text-sm font-semibold ${isCompleted ? 'text-white' : 'text-neutral-200'}`}>
                      {habit.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono-num mt-0.5">
                      <span className="text-emerald-400 font-bold">🔥 {habit.streak} day streak</span>
                      <span>·</span>
                      <span>Best: {habit.bestStreak}d</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="p-1 text-neutral-600 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Delete habit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 7-Day Mini Dots Tracker */}
              <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Past 7 Days:</span>
                <div className="flex items-center gap-2">
                  {last7Days.map((dateStr) => {
                    const done = habit.completedDates.includes(dateStr);
                    const isCur = dateStr === selectedDate;
                    return (
                      <div key={dateStr} className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => toggleHabit(habit.id, dateStr)}
                          className={`w-6 h-6 rounded-lg text-[10px] font-mono-num flex items-center justify-center transition-all cursor-pointer ${
                            done
                              ? 'bg-emerald-500 text-black font-bold'
                              : 'bg-white/[0.05] text-neutral-500 hover:text-white'
                          } ${isCur ? 'ring-1 ring-[#00E5FF]' : ''}`}
                          title={`Toggle for ${dateStr}`}
                        >
                          {done ? '✓' : formatDisplayDate(dateStr).slice(0, 1)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. DAILY JOURNAL & MOOD */}
      <div className="bg-[#131317] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Mindset & Daily Reflection</h2>
              <span className="text-xs text-neutral-400">Mood, energy baseline, and gratitude</span>
            </div>
          </div>

          <div>
            {todayJournal ? (
              <span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-1 font-mono-num">
                <Check className="w-3 h-3 text-emerald-400" />
                Saved for {formatDisplayDate(selectedDate)}
              </span>
            ) : (
              <span className="text-[11px] text-neutral-400 bg-neutral-800/60 px-2 py-0.5 rounded-lg font-mono-num">
                New for {formatDisplayDate(selectedDate)}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveJournal} className="space-y-4">
          {/* Mood Selector */}
          <div>
            <label className="text-xs text-neutral-400 block mb-2">How are you feeling today?</label>
            <div className="grid grid-cols-5 gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.level}
                  type="button"
                  onClick={() => setMood(m.level)}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                    mood === m.level
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                      : 'bg-[#181820] border-white/[0.06] text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="text-xl block mb-0.5">{m.emoji}</span>
                  <span className="text-[10px] block font-medium leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy Rating */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-neutral-400">Energy Level (1 to 5):</label>
              <span className="text-xs font-mono-num text-amber-400 font-bold">{energy} / 5</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEnergy(lvl as any)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-mono-num transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    energy >= lvl
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40'
                      : 'bg-[#181820] text-neutral-600 border-white/[0.04]'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${energy >= lvl ? 'fill-[#00E5FF]' : ''}`} />
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1.5">Focus State / Context Tags:</label>
            <div className="flex flex-wrap gap-1.5">
              {['Deep Work', 'Recovery', 'Stress', 'Flow', 'Workout', 'Meditation', 'Clean Diet', 'Fatigue'].map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800 text-white border-white/30'
                        : 'bg-[#181820] text-neutral-400 border-white/[0.04] hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reflection */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Evening Reflection & Insights</label>
            <textarea
              rows={3}
              placeholder="What went well today? What will you calibrate tomorrow? How was your mental clarity?"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="w-full bg-[#181820] border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
            />
          </div>

          {/* Gratitude */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Gratitude Anchor (1 item)</label>
            <input
              type="text"
              placeholder="e.g. Morning sunlight, personal health, completed high-volume workout"
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Visible Success Banner */}
          {saveStatus === 'success' && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg transition-all animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <span className="font-semibold block text-emerald-200">Daily Journal Saved!</span>
                  <span className="text-[11px] text-emerald-300/80">
                    Mood, energy, reflection, and gratitude recorded for {formatDisplayDate(selectedDate)}.
                  </span>
                </div>
              </div>
              {lastSavedTime && (
                <span className="text-[10px] text-emerald-400/80 font-mono-num shrink-0">
                  {lastSavedTime}
                </span>
              )}
            </div>
          )}

          {/* Visible Error Banner */}
          {saveStatus === 'error' && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 shadow-lg transition-all animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-semibold block text-rose-200">Failed to Save Journal</span>
                <span className="text-[11px] text-rose-300/80">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className={`w-full py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md ${
              saveStatus === 'success'
                ? 'bg-emerald-500 text-black shadow-emerald-500/25'
                : 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Saving Journal...
              </>
            ) : saveStatus === 'success' ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                Daily Journal Saved for {formatDisplayDate(selectedDate)}!
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                {todayJournal ? 'Update Daily Journal' : 'Save Daily Journal'}
              </>
            )}
          </button>
        </form>

        {/* Saved Journal History Timeline */}
        {(() => {
          const displayJournalEntries = isDemoMode
            ? data.journalEntries
            : data.journalEntries.filter((j) => !isDemoRecord(j));
          if (displayJournalEntries.length === 0) return null;

          return (
            <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                  Saved Journal Entries ({displayJournalEntries.length})
                </span>
                <span className="text-[11px] text-neutral-500 font-mono-num">
                  Persisted in browser storage
                </span>
              </div>

              <div className="space-y-2.5">
                {displayJournalEntries.map((entry) => {
                  const moodObj = MOOD_OPTIONS.find((m) => m.level === entry.mood);
                  const isSelected = entry.date === selectedDate;

                return (
                  <div
                    key={entry.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-[#181824] border-amber-400/40 shadow-sm'
                        : 'bg-[#181820] border-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{moodObj?.emoji || '😊'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white font-mono-num">
                              {formatDisplayDate(entry.date)}
                            </span>
                            {isDemoRecord(entry) && (
                              <span className="text-[9px] uppercase font-mono-num px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                                Demo
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] text-amber-300 font-medium px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                            <span>Mood: {moodObj?.label || 'Balanced'}</span>
                            <span>·</span>
                            <span className="text-amber-400 font-mono-num">⚡ {entry.energy}/5 Energy</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isSelected && (
                          <button
                            type="button"
                            onClick={() => setSelectedDate(entry.date)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                            title="Load this entry into editor"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteJournalEntry(entry.id)}
                          className="p-1.5 text-neutral-600 hover:text-rose-400 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                          title="Delete journal entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {entry.reflection && (
                      <p className="text-xs text-neutral-300 mt-2.5 leading-relaxed bg-black/25 p-2.5 rounded-xl border border-white/[0.03]">
                        "{entry.reflection}"
                      </p>
                    )}

                    {entry.gratitude && (
                      <p className="text-[11px] text-amber-300/90 mt-2 flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-400">Gratitude:</span>
                        <span className="italic">{entry.gratitude}</span>
                      </p>
                    )}

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {entry.tags.map((tg) => (
                          <span
                            key={tg}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-neutral-400 border border-white/[0.04]"
                          >
                            #{tg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      </div>

      {/* CREATE HABIT MODAL */}
      {habitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Create Custom Habit</h3>
            <p className="text-xs text-neutral-400 mb-4">Set up a daily habit with streak tracking.</p>
            <form onSubmit={handleCreateHabit} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Habit Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10m Morning Breathwork"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Category</label>
                <select
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value as any)}
                  className="w-full bg-[#181820] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="body">Body & Movement</option>
                  <option value="recovery">Recovery & Mobility</option>
                  <option value="sleep">Sleep & Circadian</option>
                  <option value="mind">Mind & Meditation</option>
                  <option value="productivity">Productivity & Focus</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1.5">Pick Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {HABIT_ICONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedIconName(item.name)}
                        className={`p-2 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          selectedIconName === item.name
                            ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]'
                            : 'bg-[#181820] border-white/[0.06] text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHabitModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#00E5FF] text-black text-xs font-semibold cursor-pointer cyan-glow"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
