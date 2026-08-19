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
    { name: 'Configuración & Sistema', path: '/settings', icon: IconSettings },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative h-screen transition-all duration-300 ease-in-out z-40 p-3 flex flex-col ${
        isHovered ? 'w-64' : 'w-20'
      }`}
    >
      {/* Liquid Glass Container */}
      <div className="h-full w-full liquid-glass rounded-3xl p-4 flex flex-col justify-between border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-300">
        {/* Subtle Ambient Light Highlight */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-slate-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top: Brand & Workspace with Mascot */}
        <div>
          {/* Header & Mascot */}
          <div className="flex items-center space-x-3 pb-4 border-b border-white/10 overflow-hidden">
            {/* Animated Silver Kono Mascot Badge */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-200 via-slate-400 to-zinc-600 p-0.5 shrink-0 shadow-lg group cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="w-full h-full rounded-2xl bg-titanium-900 flex flex-col items-center justify-center border border-white/40">
                <div className="flex space-x-1 mb-0.5">
                  <div className="w-1.5 h-1.5 bg-alabaster-100 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-alabaster-100 rounded-full animate-bounce delay-75" />
                </div>
                <div className="w-3 h-1 bg-emerald-400 rounded-full" />
              </div>
            </div>

            {isHovered && (
              <div className="flex flex-col truncate animate-fade-in">
                <span className="text-base font-bold tracking-tight text-alabaster-100 font-sans">
                  Kono<span className="text-kono-chrome font-light">.ai</span>
                </span>
                <span className="text-[10px] text-zinc-400 tracking-wider uppercase font-mono">
                  Financial Auditor
                </span>
              </div>
            )}
          </div>

          {/* Workspace Pill */}
          {isHovered && (
            <div className="mt-4 liquid-glass-card rounded-xl p-2.5 flex items-center space-x-2.5 text-xs text-alabaster-200 border border-white/5 animate-fade-in">
              <IconBuildingSkyscraper className="w-4 h-4 text-kono-silver shrink-0" />
              <div className="truncate">
                <p className="font-medium truncate">Finanzas Corporativas</p>
                <p className="text-[10px] text-zinc-400 font-mono">900.123.456-1</p>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center ${
                      !isHovered ? 'justify-center px-0' : 'justify-between px-3'
                    } py-2.5 rounded-xl text-sm font-medium transition duration-200 ${
                      isActive
                        ? 'bg-white/10 text-alabaster-50 border border-white/20 shadow-sm'
                        : 'text-zinc-400 hover:text-alabaster-200 hover:bg-white/[0.04]'
                    }`
                  }
                  title={item.name}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {isHovered && <span>{item.name}</span>}
                  </div>

                  {isHovered && item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Live Connection & User Profile */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          {/* Live WebSocket Status Pill */}
          <div
            className={`flex items-center ${
              !isHovered ? 'justify-center' : 'justify-between'
            } px-2.5 py-2 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400`}
          >
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {isHovered && <span className="font-mono text-[11px]">Stream Activo</span>}
            </div>
            {isHovered && <IconBroadcast className="w-3.5 h-3.5 text-emerald-400/70" />}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-zinc-700 to-slate-500 flex items-center justify-center text-xs font-bold text-alabaster-50 shrink-0 shadow">
                {user?.name?.slice(0, 2) || 'DY'}
              </div>
              {isHovered && (
                <div className="truncate text-xs">
                  <p className="font-medium text-alabaster-100 truncate">{user?.name || 'Dylan P.'}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{user?.role || 'Auditor'}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Cerrar Sesión"
            >
              <IconLogout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
