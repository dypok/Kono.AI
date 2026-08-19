import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  IconFileSearch,
  IconLayersLinked,
  IconChartBar,
  IconSettings,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
  IconBroadcast,
  IconBuildingSkyscraper,
} from '@tabler/icons-react';

export const LiquidSidebar: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Auditoría & Facturas', path: '/dashboard', icon: IconFileSearch, badge: 'Live' },
    { name: 'Plantillas Proveedor', path: '/templates', icon: IconLayersLinked, badge: 'Auto' },
    { name: 'Conciliación & ERP', path: '/analytics', icon: IconChartBar },
    { name: 'Configuración', path: '/settings', icon: IconSettings },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative h-screen transition-[width] duration-300 ease-in-out z-40 p-3 flex flex-col ${
        isHovered ? 'w-64' : 'w-20'
      }`}
    >
      {/* Liquid Glass Container */}
      <div className="h-full w-full liquid-glass rounded-3xl p-2.5 flex flex-col justify-between border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Light Highlight */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-slate-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top: Brand & Workspace with Mascot */}
        <div>
          {/* Header & Mascot */}
          <div className={`flex items-center pb-4 border-b border-white/10 h-16 w-full ${!isHovered ? 'justify-center' : 'justify-start'}`}>
            {/* Mascot Container - Centered */}
            <div
              className="w-10 h-10 rounded-2xl p-0.5 bg-gradient-to-br from-slate-200 via-slate-400 to-zinc-600 shrink-0 shadow-lg group cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate('/dashboard')}
              title="Kono AI Mascot"
            >
              <div className="w-full h-full rounded-2xl bg-titanium-900 flex flex-col items-center justify-center border border-white/40">
                <div className="flex space-x-1 mb-0.5">
                  <div className="w-1.5 h-1.5 bg-alabaster-100 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-alabaster-100 rounded-full animate-bounce delay-75" />
                </div>
                <div className="w-3 h-1 bg-emerald-400 rounded-full" />
              </div>
            </div>

            {/* Brand text */}
            <div
              className={`flex flex-col truncate transition-all duration-300 ${
                isHovered ? 'opacity-100 translate-x-0 ml-3 w-auto' : 'opacity-0 -translate-x-4 w-0 pointer-events-none'
              }`}
            >
              <span className="text-base font-bold tracking-tight text-alabaster-100 font-sans whitespace-nowrap">
                Kono<span className="text-kono-chrome font-light">.ai</span>
              </span>
              <span className="text-[10px] text-zinc-400 tracking-wider uppercase font-mono whitespace-nowrap">
                Financial Auditor
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center h-11 rounded-xl text-sm font-medium transition-colors duration-150 ${
                      !isHovered ? 'justify-center px-0' : 'justify-start px-2.5'
                    } ${
                      isActive
                        ? 'bg-white/10 text-alabaster-50 border border-white/20 shadow-sm'
                        : 'text-zinc-400 hover:text-alabaster-200 hover:bg-white/[0.04]'
                    }`
                  }
                  title={item.name}
                >
                  {/* Icon */}
                  <Icon className="w-5 h-5 shrink-0" stroke={1.8} />

                  {/* Label */}
                  <div
                    className={`flex-1 flex items-center justify-between truncate transition-all duration-300 ${
                      isHovered ? 'opacity-100 translate-x-0 ml-3' : 'opacity-0 -translate-x-4 pointer-events-none w-0'
                    }`}
                  >
                    <span className="whitespace-nowrap font-medium text-xs">{item.name}</span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Live Connection & User Profile */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          {/* Live WebSocket Status Pill */}
          <div
            className={`flex items-center h-10 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400 overflow-hidden ${
              !isHovered ? 'justify-center px-0' : 'justify-between px-2.5'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            <div
              className={`flex-1 flex items-center justify-between transition-all duration-300 ${
                isHovered ? 'opacity-100 translate-x-0 ml-2.5' : 'opacity-0 -translate-x-4 pointer-events-none w-0'
              }`}
            >
              <span className="font-mono text-[11px] whitespace-nowrap">Stream Activo</span>
              <IconBroadcast className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
            </div>
          </div>

          {/* User Profile & Logout */}
          <div
            className={`flex items-center h-11 overflow-hidden ${
              !isHovered ? 'justify-center px-0' : 'justify-between px-1'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-zinc-700 to-slate-500 flex items-center justify-center text-xs font-bold text-alabaster-50 shadow shrink-0">
              {user?.name?.slice(0, 2) || 'DY'}
            </div>

            <div
              className={`flex-1 flex items-center justify-between transition-all duration-300 ${
                isHovered ? 'opacity-100 translate-x-0 ml-2.5' : 'opacity-0 -translate-x-4 pointer-events-none w-0'
              }`}
            >
              <div className="truncate text-xs">
                <p className="font-medium text-alabaster-100 truncate">{user?.name || 'Dylan P.'}</p>
                <p className="text-[10px] text-zinc-400 truncate">{user?.role || 'Auditor'}</p>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 ml-1"
                title="Cerrar Sesión"
              >
                <IconLogout className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
