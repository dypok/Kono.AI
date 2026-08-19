import React, { useState } from 'react';
import { Mail, Sparkles, X, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface ConnectGmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (email: string) => void;
}

export const ConnectGmailModal: React.FC<ConnectGmailModalProps> = ({ isOpen, onClose, onConnected }) => {
  const { user } = useAuthStore();
  const [email, setEmail] = useState(user?.email || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncedStats, setSyncedStats] = useState<{ count: number; scanned: number } | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSyncing(true);
    setErrorMessage(null);

    try {
      // Get current Supabase session token
      const { supabase } = await import('../../lib/supabaseClient');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || 'mock-dev-token';

      // Call native FastAPI integration endpoint
      const response = await fetch('/api/v1/integrations/email/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: 'gmail',
          account_email: email.trim(),
          app_password: password.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'No se pudo conectar con el servidor de correo');
      }

      const data = await response.json();
      if (data.details?.status === 'ERROR') {
        throw new Error(data.details?.error_message || 'Error de autenticación IMAP en Gmail');
      }

      const count = data.details?.invoices_found ?? 0;
      const scanned = data.details?.emails_scanned ?? 0;
      setSyncedStats({ count, scanned });
      if (onConnected) onConnected(email.trim());
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al conectar con Gmail');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-titanium-950/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-lg liquid-glass rounded-3xl p-6 md:p-8 border border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-slate-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Animated Silver Mascot */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-zinc-600 p-0.5 mb-3 shadow-lg">
            <div className="w-full h-full rounded-full bg-titanium-900 flex flex-col items-center justify-center border border-white/40">
              <div className="flex space-x-1.5 mb-0.5">
                <div className="w-1.5 h-2 bg-alabaster-100 rounded-full animate-bounce" />
                <div className="w-1.5 h-2 bg-alabaster-100 rounded-full animate-bounce delay-75" />
              </div>
              <div className="w-3 h-1 bg-kono-silver rounded-full" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-alabaster-100">
            ¡Bienvenido a Kono<span className="text-kono-chrome font-light">.ai</span>!
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            Conecta tu cuenta de correo para escanear facturas automáticamente en segundo plano.
          </p>
        </div>

        {syncedStats ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-alabaster-100">¡Bandeja Sincronizada!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Se detectaron y etiquetaron <span className="text-emerald-400 font-bold font-mono">{syncedStats.count} facturas</span> como <span className="text-alabaster-200 font-mono">KONO_INVOICE</span> en tu Gmail.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-alabaster-100 text-titanium-950 font-semibold text-xs hover:bg-white transition"
            >
              Ir a mi Bandeja de Auditoría
            </button>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-alabaster-300 mb-1.5 uppercase tracking-wider">
                Correo Electrónico a Monitorear
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. mi.empresa@gmail.com"
                  className="w-full liquid-glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-alabaster-300 uppercase tracking-wider">
                  Contraseña de Aplicación (Gmail App Password)
                </label>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-zinc-400 hover:text-white underline font-mono"
                >
                  ¿Cómo generar una?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full liquid-glass-input px-4 py-2.5 rounded-xl text-sm"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs leading-relaxed">
                {errorMessage}
              </div>
            )}

            {/* Feature Note */}
            <div className="liquid-glass-card rounded-2xl p-3.5 text-xs text-zinc-400 border border-white/5 space-y-1">
              <div className="flex items-center space-x-2 text-alabaster-200 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-kono-silver" />
                <span>Escaneo histórico y etiquetado nativo</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Al conectar, Kono analizará los correos con adjuntos PDF e imágenes y les colocará la etiqueta <strong className="text-zinc-300">KONO_INVOICE</strong> en tu correo.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={isSyncing || !email.trim()}
                className="w-full sm:flex-1 py-3 rounded-xl bg-gradient-to-r from-slate-200 via-alabaster-100 to-zinc-300 text-titanium-950 font-semibold text-xs hover:opacity-95 transition shadow flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Conectar y Escanear Facturas</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-3 rounded-xl liquid-glass-card text-xs text-zinc-400 hover:text-white transition"
              >
                Configurar más tarde
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
