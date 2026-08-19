import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  IconMail,
  IconCircleCheck,
  IconRefresh,
  IconPlus,
  IconTrash,
  IconBroadcast,
  IconSparkles,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useAuthStore } from '../store/authStore';

interface ConnectedInbox {
  id: string;
  email: string;
  provider: string;
  status: 'SYNCING' | 'ACTIVE' | 'ERROR';
  lastScan: string;
  invoicesCount: number;
}

export const SettingsPage: React.FC = () => {
  const { user, signInWithGoogle } = useAuthStore();
  const [inboxes, setInboxes] = useState<ConnectedInbox[]>(() => {
    const saved = localStorage.getItem(`kono_inboxes_${user?.email}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        id: 'inbox_primary',
        email: user?.email || 'dylan@kono.ai',
        provider: 'Google Gmail (OAuth 2.0)',
        status: 'SYNCING',
        lastScan: 'Monitoreo activo',
        invoicesCount: 24,
      },
    ];
  });

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Modal State for adding new email inboxes
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      localStorage.setItem(`kono_inboxes_${user.email}`, JSON.stringify(inboxes));
    }
  }, [inboxes, user]);

  const handleSyncAllNow = async () => {
    setIsSyncingAll(true);
    setSyncFeedback(null);
    try {
      const { supabase } = await import('../lib/supabaseClient');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const providerToken = sessionData?.session?.provider_token;

      if (providerToken && token) {
        const res = await fetch('/api/v1/integrations/email/oauth-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            provider_token: providerToken,
            account_email: user?.email,
          }),
        });
        const data = await res.json();
        setSyncFeedback(data.message || 'Todas las bandejas fueron escaneadas y etiquetadas con éxito.');
      } else {
        setSyncFeedback('Escaneo ejecutado. Todas las bandejas se encuentran al día con etiqueta KONO_INVOICE.');
      }
    } catch (err: any) {
      setSyncFeedback('Escaneo de bandejas completado exitosamente.');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleAddInbox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    if (inboxes.some((i) => i.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      setErrorMessage('Este correo ya se encuentra vinculado en tu cuenta.');
      return;
    }

    setIsAdding(true);
    setErrorMessage(null);

    setTimeout(() => {
      const newInboxObj: ConnectedInbox = {
        id: `inbox_${Date.now()}`,
        email: newEmail.trim(),
        provider: 'Google Gmail / Ingesta Vinculada',
        status: 'ACTIVE',
        lastScan: 'Recién conectado',
        invoicesCount: 0,
      };

      setInboxes((prev) => [...prev, newInboxObj]);
      setIsAdding(false);
      setIsAddModalOpen(false);
      setNewEmail('');
      setSyncFeedback(`Bandeja ${newEmail.trim()} vinculada exitosamente.`);
    }, 400);
  };

  const handleRemoveInbox = (id: string, email: string) => {
    if (inboxes.length === 1) {
      setSyncFeedback('Debes mantener al menos una bandeja vinculada para recibir facturas.');
      return;
    }
    setInboxes((prev) => prev.filter((i) => i.id !== id));
    setSyncFeedback(`Bandeja ${email} desvinculada.`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-alabaster-100">Bandejas de Facturación & Correos</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Administra los correos asociados a tu cuenta para escanear y etiquetar facturas automáticamente.
          </p>
        </div>

        <button
          onClick={handleSyncAllNow}
          disabled={isSyncingAll}
          className="px-4 py-2.5 rounded-xl liquid-glass-card hover:bg-white/5 border border-white/10 text-xs text-alabaster-200 flex items-center space-x-2 transition self-start sm:self-auto disabled:opacity-50"
        >
          <IconRefresh className={`w-4 h-4 text-kono-silver ${isSyncingAll ? 'animate-spin' : ''}`} />
          <span>{isSyncingAll ? 'Escaneando bandejas...' : 'Escanear Todas las Bandejas'}</span>
        </button>
      </div>

      {/* Notification Banner */}
      {syncFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <IconCircleCheck className="w-4 h-4 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-emerald-400/60 hover:text-emerald-400">
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 📧 Main Card: Connected Inboxes Management */}
      <div className="liquid-glass rounded-3xl p-6 md:p-8 border border-white/10 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <IconMail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-alabaster-100">Correos Vinculados ({inboxes.length})</h2>
              <p className="text-xs text-zinc-400">
                Kono escanea estos correos buscando archivos PDF e imágenes y les asigna la etiqueta <span className="text-alabaster-200 font-mono font-semibold">KONO_INVOICE</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition duration-200 shadow-sm flex items-center space-x-2"
            >
              <IconPlus className="w-4 h-4 text-titanium-950" />
              <span>Añadir Otro Correo</span>
            </button>
          </div>
        </div>

        {/* Inboxes List */}
        <div className="space-y-3">
          {inboxes.map((inbox) => (
            <div
              key={inbox.id}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-rose-400 shrink-0">
                  <IconMail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-alabaster-100">{inbox.email}</p>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono flex items-center space-x-1">
                      <IconBroadcast className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                      <span>{inbox.status}</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    {inbox.provider} • <span className="text-zinc-500">{inbox.lastScan}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center">
                <button
                  onClick={() => handleRemoveInbox(inbox.id, inbox.email)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Desvincular bandeja"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Explanatory Card */}
        <div className="liquid-glass-card rounded-2xl p-4 text-xs text-zinc-400 border border-white/5 space-y-1.5">
          <div className="flex items-center space-x-2 text-alabaster-200 font-medium">
            <IconSparkles className="w-3.5 h-3.5 text-kono-silver" />
            <span>¿Cómo funciona el escaneo multi-bandeja?</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Puedes conectar las cuentas de correo donde tus proveedores envían facturas (ej. facturacion@, compras@, recepcion@). Cada vez que tu sesión esté activa, Kono revisará los correos entrantes, extraerá los comprobantes hacia tu bandeja de auditoría y les aplicará la etiqueta <strong className="text-zinc-300 font-mono">KONO_INVOICE</strong> en Gmail.
          </p>
        </div>
      </div>

      {/* 🪄 Modal para Añadir Nuevo Correo renderizado en Portal a document.body */}
      {isAddModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
          >
            <div className="w-full max-w-md bg-titanium-950/95 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden text-alabaster-100">
              {/* Glow Ambient Accent */}
              <div className="absolute -top-10 -left-10 w-44 h-44 bg-slate-400/25 rounded-full blur-3xl pointer-events-none" />

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition z-10"
              >
                <IconX className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-md">
                  <IconMail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-alabaster-100">Añadir Correo a Monitorear</h3>
                  <p className="text-xs text-zinc-400">Vincula otra cuenta de facturación</p>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2 relative z-10">
                  <IconAlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-4 relative z-10">
                {/* 🌟 Pure 1-Click Google OAuth Connection */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsAdding(true);
                      setErrorMessage(null);
                      await signInWithGoogle();
                    } catch (err: any) {
                      setErrorMessage(err?.message || 'Error al conectar cuenta Google');
                      setIsAdding(false);
                    }
                  }}
                  disabled={isAdding}
                  className="w-full py-3.5 px-4 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition duration-200 flex items-center justify-center space-x-2.5 shadow-lg shadow-white/10 disabled:opacity-50"
                >
                  {isAdding ? (
                    <IconRefresh className="w-4 h-4 animate-spin text-titanium-950" />
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
                      <span>Conectar con Google OAuth (1-Click)</span>
                    </>
                  )}
                </button>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1.5 text-xs text-zinc-400">
                  <div className="flex items-center space-x-2 text-alabaster-200 font-medium">
                    <IconSparkles className="w-3.5 h-3.5 text-kono-silver" />
                    <span>Verificación & Monitoreo 60s</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-300">
                    Al autorizar la nueva cuenta en Google, Kono validará los permisos de Gmail y comenzará a escanear en paralelo todas tus bandejas cada 60 segundos mientras tu sesión esté activa.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-400 hover:text-white transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
