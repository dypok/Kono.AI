import React from 'react';
import { Server, Activity, ShieldAlert, Key } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-alabaster-100">Configuración del Sistema & Conectores</h1>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          Estado del clúster Dual-Backend, servidor n8n y credenciales de acceso.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-4">
          <h3 className="font-semibold text-sm text-alabaster-100 flex items-center space-x-2">
            <Server className="w-4 h-4 text-kono-silver" />
            <span>Servicios del Mono-Docker Container</span>
          </h3>
          <div className="space-y-2.5 text-xs">
            {[
              { name: '🦀 Rust Core (Ingestion & Triage)', status: 'Active (Daemon Mode)', port: 'Redis 6379' },
              { name: '🐍 Python FastAPI Engine', status: 'Active (Port 8000)', port: 'Local 8000' },
              { name: '⚡ Redis Event Streams', status: 'Active', port: 'Port 6379' },
              { name: '🤖 n8n Automation Engine', status: 'Connected', port: 'Port 5678' },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-alabaster-200">{s.name}</span>
                <span className="text-emerald-400 font-mono text-[11px]">{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-4">
          <h3 className="font-semibold text-sm text-alabaster-100 flex items-center space-x-2">
            <Key className="w-4 h-4 text-kono-silver" />
            <span>Claves de Webhooks & Fallback IA</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-mono">X-Kono-Webhook-Secret (n8n)</label>
              <input
                type="password"
                value="kono_secret_n8n_key_2026"
                readOnly
                className="w-full liquid-glass-input px-3 py-2 rounded-xl font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 font-mono">OpenAI Fallback API Key (Opcional)</label>
              <input
                type="password"
                placeholder="sk-proj-••••••••••••••••"
                className="w-full liquid-glass-input px-3 py-2 rounded-xl font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
