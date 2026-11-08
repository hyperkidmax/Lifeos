/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WellnessProvider, useWellness } from './context/WellnessContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { QuickAddModal } from './components/common/QuickAddModal';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { HealthView } from './components/health/HealthView';
import { NutritionView } from './components/nutrition/NutritionView';
import { FitnessView } from './components/fitness/FitnessView';
import { MyDayView } from './components/myday/MyDayView';
import { ProgressView } from './components/progress/ProgressView';
import { SettingsView } from './components/settings/SettingsView';
import { Smartphone, Monitor } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab } = useWellness();
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);

  return (
    <div className="min-h-screen bg-[#080809] text-neutral-100 flex flex-col items-center">
      {/* Desktop Device View Switcher (Discreet helper for testing mobile/desktop layouts) */}
      <aside aria-label="Layout view controls" className="hidden lg:flex fixed top-3 right-4 z-50 items-center gap-1 bg-[#141418]/90 backdrop-blur-md border border-white/[0.08] p-1 rounded-xl shadow-lg text-xs">
        <button
          onClick={() => setIsPhoneFrame(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            isPhoneFrame ? 'bg-[#00E5FF]/20 text-[#00E5FF] font-medium' : 'text-neutral-400 hover:text-white'
          }`}
          title="Simulate iPhone View (390px)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Frame</span>
        </button>
        <button
          onClick={() => setIsPhoneFrame(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            !isPhoneFrame ? 'bg-[#00E5FF]/20 text-[#00E5FF] font-medium' : 'text-neutral-400 hover:text-white'
          }`}
          title="Responsive Fluid Desktop"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Fluid Layout</span>
        </button>
      </aside>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 min-h-screen flex flex-col ${
          isPhoneFrame
            ? 'max-w-[420px] my-4 rounded-3xl border border-white/[0.12] shadow-2xl overflow-hidden bg-[#09090b]'
            : 'max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl'
        }`}
      >
        <Header />

        <main className="flex-1 px-4 sm:px-6">
          {activeTab === 'home' && <HomeDashboard />}
          {activeTab === 'health' && <HealthView />}
          {activeTab === 'nutrition' && <NutritionView />}
          {activeTab === 'fitness' && <FitnessView />}
          {activeTab === 'myday' && <MyDayView />}
          {activeTab === 'progress' && <ProgressView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        <BottomNav />
        <QuickAddModal />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <WellnessProvider>
      <MainContent />
    </WellnessProvider>
  );
}
