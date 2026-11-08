import React, { useState } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { Card } from '../ui/Card';
import { CheckCircle2, Circle, Plus, Sparkles, Flame, ArrowRight } from 'lucide-react';

export const TodayPrioritiesSection: React.FC = () => {
  const {
    todayPriorities,
    togglePriority,
    addPriority,
    todayHabitsStatus,
    toggleHabit,
    setActiveTab,
  } = useWellness();

  const [newPriorityText, setNewPriorityText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriorityText.trim()) return;
    addPriority(newPriorityText.trim());
    setNewPriorityText('');
    setIsAdding(false);
  };

  const completedPrioritiesCount = todayPriorities.filter((p) => p.completed).length;
  const completedHabitsCount = todayHabitsStatus.filter((h) => h.isCompleted).length;

  return (
    <Card variant="solid" padding="sm" className="space-y-3 sm:p-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#00F2A9]/15 text-[#00F2A9] flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3" />
          </div>
          <div>
            <h3 className="text-xs uppercase font-mono-num tracking-wider text-[var(--text-primary)] font-semibold">
              Daily Priorities &amp; Habits
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono-num text-[var(--text-muted)]">
            {todayPriorities.length > 0 && `${completedPrioritiesCount}/${todayPriorities.length} priorities`}
            {todayPriorities.length > 0 && todayHabitsStatus.length > 0 && ' · '}
            {todayHabitsStatus.length > 0 && `${completedHabitsCount}/${todayHabitsStatus.length} habits`}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('myday')}
            className="text-[10px] text-[#00F2A9] hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
          >
            My Day <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Responsive 2-Column Split on Tablet/Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Left: Daily Focus Priorities */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Today's Key Priorities
            </span>
            <button
              type="button"
              onClick={() => setIsAdding((prev) => !prev)}
              className="text-[10px] text-[#00F2A9] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
            >
              <Plus className="w-3 h-3" /> Add Priority
            </button>
          </div>

          {/* Add Priority Inline Form */}
          {isAdding && (
            <form onSubmit={handleAddSubmit} className="flex items-center gap-1.5 pt-0.5">
              <input
                type="text"
                value={newPriorityText}
                onChange={(e) => setNewPriorityText(e.target.value)}
                placeholder="e.g. 45-min workout, 2L water"
                autoFocus
                className="flex-1 bg-[var(--bg-subtle)] border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#00F2A9] transition-colors"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-[#00F2A9] text-[#060A08] text-xs font-semibold hover:bg-[#00d896] transition-colors cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                ✕
              </button>
            </form>
          )}

          {/* Priorities List */}
          <div className="space-y-1.5 max-h-[145px] overflow-y-auto no-scrollbar">
            {todayPriorities.length > 0 ? (
              todayPriorities.map((prio) => (
                <button
                  key={prio.id}
                  type="button"
                  onClick={() => togglePriority(prio.id)}
                  className={`w-full p-2 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer select-none ${
                    prio.completed
                      ? 'bg-[var(--bg-subtle)]/40 border-[var(--card-border)] text-[var(--text-muted)]'
                      : 'bg-[var(--card-surface-elevated)] border-[var(--card-border)] text-[var(--text-primary)] hover:border-[#00F2A9]/40'
                  }`}
                >
                  {prio.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00F2A9] shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  )}
                  <span
                    className={`text-xs flex-1 truncate ${
                      prio.completed ? 'line-through text-[var(--text-muted)]' : 'font-medium'
                    }`}
                  >
                    {prio.text}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--card-border)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                <span>No priorities set for today.</span>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="text-[#00F2A9] font-medium hover:underline cursor-pointer"
                >
                  + Set focus
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Daily Habit Consistency */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Habit Consistency
            </span>
            <span className="text-[10px] font-mono-num text-[var(--text-muted)]">
              Daily Streak
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-[145px] overflow-y-auto no-scrollbar">
            {todayHabitsStatus.slice(0, 4).map(({ habit, isCompleted }) => (
              <button
                key={habit.id}
                type="button"
                onClick={() => toggleHabit(habit.id)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-[#00F2A9]/10 border-[#00F2A9]/30 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-subtle)] border-[var(--card-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-mono-num font-semibold text-[#FB923C] flex items-center gap-0.5">
                    🔥 {habit.streak}d
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3 h-3 text-[#00F2A9]" />
                  ) : (
                    <Circle className="w-3 h-3 text-[var(--text-muted)]" />
                  )}
                </div>
                <p className="text-[11px] font-medium truncate">{habit.title}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
