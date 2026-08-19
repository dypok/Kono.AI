import React from 'react';
import { Outlet } from 'react-router-dom';
import { LiquidSidebar } from './LiquidSidebar';
import { TopNavbar } from './TopNavbar';

export const AppLayout: React.FC = () => {
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
    </div>
  );
};
