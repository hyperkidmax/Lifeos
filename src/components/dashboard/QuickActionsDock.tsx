import React, { useState } from 'react';
import { useWellness } from '../../context/WellnessContext';
import { Card } from '../ui/Card';
import { Droplet, Utensils, Footprints, Moon, Dumbbell, Scale, Check } from 'lucide-react';

export const QuickActionsDock: React.FC = () => {
  const { openQuickAdd, logWater, logBodyMeasurement, selectedDate, latestWeight } = useWellness();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState(latestWeight ? String(latestWeight.weightKg) : '75.0');
  const [weightLogged, setWeightLogged] = useState(false);

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      logBodyMeasurement({
        date: selectedDate,
        weightKg: w,
      });
      setWeightLogged(true);
      setTimeout(() => {
        setWeightLogged(false);
        setShowWeightModal(false);
      }, 600);
    }
  };

  const quickActions = [
    {
      id: 'water',
      label: 'Log Water',
      subtitle: '+250ml / Custom',
      icon: Droplet,
      color: '#38BDF8',
      onClick: () => logWater(250),
    },
    {
      id: 'food',
      label: 'Log Food',
      subtitle: 'Meals & Macros',
      icon: Utensils,
      color: '#F59E0B',
      onClick: () => openQuickAdd('meal'),
    },
    {
      id: 'steps',
      label: 'Log Steps',
      subtitle: 'Daily Count',
      icon: Footprints,
      color: '#00E5FF',
      onClick: () => openQuickAdd('health'),
    },
    {
      id: 'sleep',
      label: 'Log Sleep',
      subtitle: 'Hours & Rest',
      icon: Moon,
      color: '#A78BFA',
      onClick: () => openQuickAdd('health'),
    },
    {
      id: 'workout',
      label: 'Record Workout',
      subtitle: 'Training Session',
      icon: Dumbbell,
      color: '#00F2A9',
      onClick: () => openQuickAdd('workout'),
    },
    {
      id: 'weight',
      label: 'Log Weight',
      subtitle: 'Scale Reading',
      icon: Scale,
      color: '#10B981',
      onClick: () => setShowWeightModal(true),
    },
  ];

  return (
    <Card variant="solid" padding="sm" className="space-y-2.5 sm:p-3.5">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs uppercase font-mono-num tracking-wider text-[var(--text-muted)] font-semibold">
            Quick Actions
          </h3>
          <span className="text-[10px] text-[var(--text-muted)] font-mono-num">
            · 1-Tap Entry
          </span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
          Tap water to instantly add +250ml
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--card-surface-elevated)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group min-h-[52px]"
              title={action.label}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0"
                style={{ backgroundColor: `${action.color}18`, color: action.color }}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate max-w-full">
                {action.label}
              </span>
              <span className="text-[9px] text-[var(--text-muted)] font-mono-num truncate max-w-full hidden xs:block">
                {action.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[var(--card-surface)] border border-[var(--card-border)] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00F2A9]/15 border border-[#00F2A9]/30 flex items-center justify-center text-[#00F2A9] shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Record Body Weight</h4>
                <span className="text-xs text-[var(--text-muted)]">Date: {selectedDate}</span>
              </div>
            </div>

            <form onSubmit={handleSaveWeight} className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Current Weight (kg)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    autoFocus
                    required
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--card-border)] rounded-xl px-3 py-2.5 text-sm font-mono-num text-[var(--text-primary)] focus:outline-none focus:border-[#00F2A9] transition-colors"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-[var(--text-muted)] font-mono-num">
                    kg
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--card-border)] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={weightLogged}
                  className="flex-1 py-2.5 rounded-xl bg-[#00F2A9] text-[#060A08] text-xs font-bold hover:bg-[#00d896] cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {weightLogged ? (
                    <>
                      <Check className="w-4 h-4" /> Saved!
                    </>
                  ) : (
                    'Save Weight'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
};
