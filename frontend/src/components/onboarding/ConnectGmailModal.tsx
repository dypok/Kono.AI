import React, { useState } from 'react';
import { Mail, Sparkles, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface ConnectGmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (email: string) => void;
}

export const ConnectGmailModal: React.FC<ConnectGmailModalProps> = ({ isOpen, onClose, onConnected }) => {
  const { user } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncedStats, setSyncedStats] = useState<{ count: number; scanned: number } | null>(null);

  if (!isOpen) return null;

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
            Conecta tu cuenta de Gmail con 1-Click para escanear facturas automáticamente en segundo plano.
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
                Se escanearon <span className="text-alabaster-100 font-bold">{syncedStats.scanned}</span> correos y se detectaron <span className="text-emerald-400 font-bold font-mono">{syncedStats.count} facturas</span> etiquetadas como <span className="text-alabaster-200 font-mono">KONO_INVOICE</span> en tu Gmail.
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
          <div className="space-y-4">
            {/* 🌟 1-Click Google OAuth Button */}
            <button
              type="button"
              onClick={async () => {
                try {
                  setIsSyncing(true);
                  setErrorMessage(null);
                  const { signInWithGoogle } = useAuthStore.getState();
                  await signInWithGoogle();
                } catch (err: any) {
                  setErrorMessage(err?.message || 'Error al conectar con Google OAuth');
                  setIsSyncing(false);
                }
              }}
              disabled={isSyncing}
              className="w-full py-3.5 px-4 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition duration-200 flex items-center justify-center space-x-2.5 shadow-lg shadow-white/5 disabled:opacity-50"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-titanium-950" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-3.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.7C3.7 20.4 7.5 23.5 12 23.5z"
                    />
                  </svg>
                  <span>Conectar Gmail con 1-Click (Google OAuth)</span>
                </>
              )}
            </button>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs leading-relaxed">
                {errorMessage}
              </div>
            )}

            {/* Feature Note */}
            <div className="liquid-glass-card rounded-2xl p-4 text-xs text-zinc-400 border border-white/5 space-y-1.5">
              <div className="flex items-center space-x-2 text-alabaster-200 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-kono-silver" />
                <span>Escaneo histórico y etiquetado nativo automático</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Kono se conectará de forma segura vía Google OAuth, analizará tus correos con facturas y les colocará automáticamente la etiqueta <strong className="text-zinc-300 font-mono">KONO_INVOICE</strong>.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl liquid-glass-card text-xs text-zinc-400 hover:text-white transition"
              >
                Configurar más tarde
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
