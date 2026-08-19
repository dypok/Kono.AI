import React, { useState } from 'react';
import { Mail, CheckCircle2, RefreshCw, Plus, ShieldCheck, Key, Server, Sparkles, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [integrations, setIntegrations] = useState([
    {
      id: 'int_1',
      provider: 'gmail',
      email: user?.email || 'facturas@empresa.com',
      status: 'ACTIVE',
      lastSync: 'Hace 2 minutos',
      syncedCount: 148,
    },
  ]);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGmail = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIntegrations((prev) => [
        ...prev,
        {
          id: `int_${Date.now()}`,
          provider: 'gmail',
          email: 'contabilidad@tuempresa.com',
          status: 'ACTIVE',
          lastSync: 'Recién conectado',
          syncedCount: 0,
        },
      ]);
      setIsConnecting(false);
    }, 1200);
  };

  const handleDisconnect = (id: string) => {
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-alabaster-100">Configuración & Integraciones de Cuenta</h1>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          Vincula tu correo Gmail o ERP para procesar facturas desatendidas vinculadas a tu usuario.
        </p>
      </div>

      {/* 📧 Section 1: Inbound Email Connections (Gmail 1-Click Connect) */}
      <div className="liquid-glass rounded-3xl p-6 md:p-8 border border-white/10 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-alabaster-100">Conexión de Correos (Gmail / IMAP)</h2>
              <p className="text-xs text-zinc-400">
                Kono vigila tu bandeja y extrae facturas automáticamente a tu nombre.
              </p>
            </div>
          </div>

          <button
            onClick={handleConnectGmail}
            disabled={isConnecting}
            className="px-4 py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition duration-200 shadow-sm flex items-center space-x-2 shrink-0 disabled:opacity-50"
          >
            {isConnecting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-titanium-950" />
            ) : (
              <>
                <Plus className="w-4 h-4 text-titanium-950" />
                <span>Vincular Cuenta de Gmail</span>
              </>
            )}
          </button>
        </div>

        {/* Connected Accounts List */}
        <div className="space-y-3">
          {integrations.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-rose-400 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-alabaster-100">{item.email}</p>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Sincronizando</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    {item.syncedCount} comprobantes auditados • {item.lastSync}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center">
                <button
                  onClick={() => handleDisconnect(item.id)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Desvincular cuenta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ⚙️ Section 2: Infrastructure & API Keys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supabase & Services Status */}
        <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl">
          <h3 className="font-semibold text-sm text-alabaster-100 flex items-center space-x-2">
            <Server className="w-4 h-4 text-kono-silver" />
            <span>Estado de Servicios & Base de Datos</span>
          </h3>
          <div className="space-y-2.5 text-xs">
            {[
              { name: '⚡ Supabase PostgreSQL (Cloud)', status: 'Conectado (avkxhplapmibhyleywzd)', port: 'Port 5432' },
              { name: '🔐 Supabase Auth (JWT & Roles)', status: 'Activo (public.profiles)', port: 'Auth v1' },
              { name: '🦀 Rust Core (Ingesta & Deduplicador)', status: 'Daemon Activo (< 1 ms)', port: 'Redis 6379' },
              { name: '🐍 Python Spatial Engine', status: 'Activo (FastAPI)', port: 'Port 80' },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-alabaster-200 font-medium">{s.name}</span>
                <span className="text-emerald-400 font-mono text-[11px]">{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Secrets & Webhook Inbound */}
        <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl">
          <h3 className="font-semibold text-sm text-alabaster-100 flex items-center space-x-2">
            <Key className="w-4 h-4 text-kono-silver" />
            <span>Claves de Acceso & Webhook Inbound</span>
          </h3>
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-mono">Endpoint Inbound Directo</label>
              <input
                type="text"
                value="http://localhost:80/api/v1/inbound/webhook"
                readOnly
                className="w-full liquid-glass-input px-3.5 py-2.5 rounded-xl font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 font-mono">X-Kono-Webhook-Secret</label>
              <input
                type="password"
                value="kono_secret_key_2026"
                readOnly
                className="w-full liquid-glass-input px-3.5 py-2.5 rounded-xl font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
