/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { WellnessProvider, useWellness } from './context/WellnessContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { Sidebar } from './components/navigation/Sidebar';
import { QuickAddModal } from './components/common/QuickAddModal';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { HealthView } from './components/health/HealthView';
import { NutritionView } from './components/nutrition/NutritionView';
import { FitnessView } from './components/fitness/FitnessView';
import { MyDayView } from './components/myday/MyDayView';
import { ProgressView } from './components/progress/ProgressView';
import { SettingsView } from './components/settings/SettingsView';
import { Smartphone, Monitor } from 'lucide-react';

const SIDEBAR_COLLAPSED_KEY = 'lifeos_sidebar_collapsed_v1';

const MainShell: React.FC = () => {
  const { activeTab } = useWellness();
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Desktop Device View Switcher (Discreet developer helper for verifying mobile & fluid desktop layouts) */}
      <aside
        aria-label="Layout view controls"
        className="hidden xl:flex fixed bottom-4 right-4 z-50 items-center gap-1 bg-[var(--card-surface)]/90 backdrop-blur-md border border-[var(--card-border)] p-1 rounded-2xl shadow-lg text-xs"
      >
        <button
          onClick={() => setIsPhoneFrame(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            isPhoneFrame
              ? 'bg-[#00F2A9]/15 text-[#00F2A9] font-medium'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="Simulate Mobile View (420px max)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Frame</span>
        </button>
        <button
          onClick={() => setIsPhoneFrame(false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            !isPhoneFrame
              ? 'bg-[#00F2A9]/15 text-[#00F2A9] font-medium'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="Responsive Fluid Desktop"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Fluid Desktop</span>
        </button>
      </aside>

      {/* When isPhoneFrame is active on desktop, simulate a standalone mobile viewport */}
      {isPhoneFrame ? (
        <div className="flex justify-center p-4 min-h-screen items-center">
          <div className="w-full max-w-[420px] h-[880px] max-h-[92vh] rounded-[40px] border-4 border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col bg-[var(--bg-main)] relative">
            <Header />
            <main className="flex-1 overflow-y-auto px-3.5 pb-36 pt-1.5 no-scrollbar">
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
      ) : (
        /* Full Responsive Adaptive App Shell */
        <div className="flex min-h-screen">
          {/* Desktop Left Sidebar */}
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
          />

          {/* Main Content Column */}
          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
            }`}
          >
            {/* Header */}
            <Header />

            {/* Scrollable Viewport Content with Android/iOS safe bottom clearance */}
            <main className="flex-1 px-3 sm:px-6 md:px-8 py-3.5 sm:py-5 max-w-7xl w-full mx-auto pb-36 sm:pb-32 lg:pb-12">
              {activeTab === 'home' && <HomeDashboard />}
              {activeTab === 'health' && <HealthView />}
              {activeTab === 'nutrition' && <NutritionView />}
              {activeTab === 'fitness' && <FitnessView />}
              {activeTab === 'myday' && <MyDayView />}
              {activeTab === 'progress' && <ProgressView />}
              {activeTab === 'settings' && <SettingsView />}
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />

            {/* Global Modal */}
            <QuickAddModal />
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <WellnessProvider>
        <MainShell />
      </WellnessProvider>
    </ThemeProvider>
  );
}
