import React from 'react';
import { useWellness, ActiveTab } from '../../context/WellnessContext';
import { Home, HeartPulse, Utensils, Dumbbell, CalendarCheck, Plus } from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'myday', label: 'My Day', icon: CalendarCheck },
];

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openQuickAdd } = useWellness();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0f]/95 backdrop-blur-2xl border-t border-white/[0.08] pb-safe">
      <div className="max-w-md mx-auto px-3 py-1.5 flex items-center justify-between">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer select-none ${
                isActive
                  ? 'text-[#00E5FF]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00E5FF] cyan-glow shadow-[0_0_8px_#00E5FF]" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium tracking-tight ${isActive ? 'text-[#00E5FF] font-semibold' : 'text-neutral-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Quick Add Floating Trigger */}
        <button
          onClick={() => openQuickAdd()}
          className="ml-1 w-11 h-11 rounded-full bg-gradient-to-tr from-[#00E5FF] to-[#00b4d8] text-black flex items-center justify-center shadow-lg shadow-[#00E5FF]/20 cyan-glow active:scale-95 transition-all cursor-pointer focus:outline-none"
          title="Quick Log"
          aria-label="Quick Log"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
