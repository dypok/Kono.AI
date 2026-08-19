import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LiquidSidebar } from './LiquidSidebar';
import { TopNavbar } from './TopNavbar';
import { ConnectGmailModal } from '../onboarding/ConnectGmailModal';
import { useAuthStore } from '../../store/authStore';

export const AppLayout: React.FC = () => {
  const { user } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user?.email) {
      const userDismissKey = `kono_onboarding_dismissed_${user.email}`;
      const hasDismissed = localStorage.getItem(userDismissKey);
      const isNew = localStorage.getItem('kono_new_signup') === 'true';

      if (isNew || !hasDismissed) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const handleCloseOnboarding = () => {
    if (user?.email) {
      localStorage.setItem(`kono_onboarding_dismissed_${user.email}`, 'true');
    }
    localStorage.removeItem('kono_new_signup');
    setShowOnboarding(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-titanium-950 text-alabaster-100 relative">
      {/* Background Ambient Radial Gradients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-slate-800/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-zinc-800/15 rounded-full blur-3xl pointer-events-none" />

      {/* Sleek Collapsible Liquid Sidebar */}
      <LiquidSidebar />

      {/* Main Content Area with Top Navbar */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Global Onboarding Modal */}
      <ConnectGmailModal
        isOpen={showOnboarding}
        onClose={handleCloseOnboarding}
      />
    </div>
  );
};
