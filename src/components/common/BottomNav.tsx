import React from 'react';
import { useWellness, ActiveTab } from '../../context/WellnessContext';
import { Home, HeartPulse, Utensils, Dumbbell, Sparkles, Plus } from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'progress', label: 'Intelligence', icon: Sparkles },
];

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openQuickAdd } = useWellness();

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--glass-bg)] backdrop-blur-2xl border-t border-[var(--card-border)] pb-safe transition-colors"
    >
      <div className="max-w-md mx-auto px-3 py-1.5 flex items-center justify-between">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[44px] rounded-xl transition-all cursor-pointer select-none ${
                isActive
                  ? 'text-[#00F2A9]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00F2A9] shadow-[0_0_8px_#00F2A9]" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight truncate ${
                  isActive ? 'text-[#00F2A9] font-semibold' : 'text-[var(--text-muted)] font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Quick Add Floating Trigger */}
        <button
          onClick={() => openQuickAdd()}
          className="ml-1 w-11 h-11 min-w-[44px] rounded-full bg-gradient-to-tr from-[#00F2A9] to-[#00E5FF] text-[#060A08] flex items-center justify-center shadow-lg shadow-[#00F2A9]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F2A9]"
          title="Quick Log Activity / Meal / Vital"
          aria-label="Quick Log Activity"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </nav>
  );
};
