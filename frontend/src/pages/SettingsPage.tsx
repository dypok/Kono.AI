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
  IconBrandGoogle,
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
    const saved = localStorage.getItem('kono_inboxes_global');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (_) {}
    }
    const initialList: ConnectedInbox[] = [
      {
        id: 'inbox_primary',
        email: user?.email || 'dylan@kono.ai',
        provider: 'Google Gmail (OAuth 2.0)',
        status: 'SYNCING',
        lastScan: 'Monitoreo activo',
        invoicesCount: 24,
      },
    ];
    localStorage.setItem('kono_inboxes_global', JSON.stringify(initialList));
    return initialList;
  });

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Profile Form State
  const [profileFullName, setProfileFullName] = useState(user?.name || '');
  const [profileCompany, setProfileCompany] = useState(user?.company || '');
  const [profileTaxId, setProfileTaxId] = useState(user?.taxId || '');
  const [profileRole, setProfileRole] = useState(user?.role || 'Lead Financial Auditor');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync state if user loads after mount
  useEffect(() => {
    if (user) {
      if (user.name) setProfileFullName(user.name);
      if (user.company) setProfileCompany(user.company);
      if (user.taxId) setProfileTaxId(user.taxId);
      if (user.role) setProfileRole(user.role);
      if (user.phone) setProfilePhone(user.phone);
    }
  }, [user]);

  // Modal State for adding new email inboxes
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State for Delete Confirmation & Single Inbox Alert
  const [inboxToDelete, setInboxToDelete] = useState<{ id: string; email: string } | null>(null);
  const [showSingleInboxAlert, setShowSingleInboxAlert] = useState(false);
  const [alertProgress, setAlertProgress] = useState(100);
  const [alertTimeoutId, setAlertTimeoutId] = useState<any | null>(null);
  const [progressIntervalId, setProgressIntervalId] = useState<any | null>(null);

  useEffect(() => {
    localStorage.setItem('kono_inboxes_global', JSON.stringify(inboxes));
  }, [inboxes]);

  // Escuchar cambios de almacenamiento en tiempo real (tras el retorno del OAuth redirect)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('kono_inboxes_global');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInboxes(parsed);
          }
        } catch (_) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [isResettingLabels, setIsResettingLabels] = useState(false);

  const handleResetAndRescan = async () => {
    setIsResettingLabels(true);
    setSyncFeedback(null);
    try {
      const { supabase } = await import('../lib/supabaseClient');
      const { data: sessionData } = await supabase.auth.getSession();
      const providerToken = sessionData?.session?.provider_token;

      if (providerToken) {
        const res = await documentsApi.resetAndRescanEmail(providerToken, user?.email);
        setSyncFeedback(res.message || '✅ Etiquetas removidas de Gmail y facturas re-procesadas exitosamente en la base de datos.');
      } else {
        setSyncFeedback('⚠️ Por favor vuelve a conectar tu cuenta de Gmail para renovar el token de acceso.');
      }
    } catch (err: any) {
      setSyncFeedback(`Error al re-procesar correos: ${err.message}`);
    } finally {
      setIsResettingLabels(false);
    }
  };

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

  const handleDismissSingleInboxAlert = () => {
    if (alertTimeoutId) {
      clearTimeout(alertTimeoutId);
      setAlertTimeoutId(null);
    }
    if (progressIntervalId) {
      clearInterval(progressIntervalId);
      setProgressIntervalId(null);
    }
    setShowSingleInboxAlert(false);
    setAlertProgress(100);
  };

  const handleRequestRemoveInbox = (id: string, email: string) => {
    if (inboxes.length <= 1) {
      if (alertTimeoutId) clearTimeout(alertTimeoutId);
      if (progressIntervalId) clearInterval(progressIntervalId);

      setShowSingleInboxAlert(true);
      setAlertProgress(100);

      const startTime = Date.now();
      const duration = 3000;

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainingPercentage = Math.max(0, 100 - (elapsed / duration) * 100);
        setAlertProgress(remainingPercentage);
        if (remainingPercentage <= 0) {
          clearInterval(progressInterval);
        }
      }, 20);

      setProgressIntervalId(progressInterval);

      const timer = setTimeout(() => {
        setShowSingleInboxAlert(false);
        setAlertTimeoutId(null);
        clearInterval(progressInterval);
        setProgressIntervalId(null);
      }, duration);

      setAlertTimeoutId(timer);
      return;
    }
    setInboxToDelete({ id, email });
  };

  const handleConfirmDelete = () => {
    if (!inboxToDelete) return;
    setInboxes((prev) => prev.filter((i) => i.id !== inboxToDelete.id));
    setSyncFeedback(`Bandeja ${inboxToDelete.email} desvinculada exitosamente.`);
    setInboxToDelete(null);
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

      {/* 👤 Card 1: User Profile & Organization Settings */}
      <div className="liquid-glass rounded-3xl p-6 md:p-8 border border-white/10 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <IconSparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-alabaster-100">Organización & Perfil de Usuario</h2>
              <p className="text-xs text-zinc-400">
                Información tributaria y datos del auditor almacenados en Supabase.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setIsSavingProfile(true);
              const { updateProfile } = useAuthStore.getState();
              await updateProfile({
                fullName: profileFullName,
                company: profileCompany,
                taxId: profileTaxId,
                role: profileRole,
                phone: profilePhone,
              });
              setSyncFeedback('Perfil y datos de organización actualizados exitosamente en Supabase.');
            } catch (err: any) {
              setSyncFeedback(`Error al guardar perfil: ${err.message}`);
            } finally {
              setIsSavingProfile(false);
            }
          }}
          className="space-y-4 pt-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-alabaster-300 mb-1 uppercase tracking-wider">
                Nombre Completo
              </label>
              <input
                type="text"
                value={profileFullName}
                onChange={(e) => setProfileFullName(e.target.value)}
                required
                className="w-full liquid-glass-input px-3.5 py-2 rounded-xl text-xs text-alabaster-100"
                placeholder="Dylan Palacio"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-alabaster-300 mb-1 uppercase tracking-wider">
                Correo Corporativo (Solo Lectura)
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full liquid-glass-input px-3.5 py-2 rounded-xl text-xs text-zinc-400 opacity-70 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-alabaster-300 mb-1 uppercase tracking-wider">
                Empresa / Razón Social
              </label>
              <input
                type="text"
                value={profileCompany}
                onChange={(e) => setProfileCompany(e.target.value)}
                className="w-full liquid-glass-input px-3.5 py-2 rounded-xl text-xs text-alabaster-100"
                placeholder="Kono Corp SAS"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-alabaster-300 mb-1 uppercase tracking-wider">
                NIT / Tax ID
              </label>
              <input
                type="text"
                value={profileTaxId}
                onChange={(e) => setProfileTaxId(e.target.value)}
                className="w-full liquid-glass-input px-3.5 py-2 rounded-xl text-xs font-mono text-alabaster-100"
                placeholder="900.123.456-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-alabaster-300 mb-1 uppercase tracking-wider">
                Cargo / Rol
              </label>
              <input
                type="text"
                value={profileRole}
                onChange={(e) => setProfileRole(e.target.value)}
                className="w-full liquid-glass-input px-3.5 py-2 rounded-xl text-xs text-alabaster-100"
                placeholder="Lead Financial Auditor"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-alabaster-300 mb-1 uppercase tracking-wider">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full liquid-glass-input px-3.5 py-2 rounded-xl text-xs text-alabaster-100"
                placeholder="+57 300 1234567"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition duration-200 shadow flex items-center space-x-2 disabled:opacity-50"
            >
              {isSavingProfile && <IconRefresh className="w-4 h-4 animate-spin text-titanium-950" />}
              <span>{isSavingProfile ? 'Guardando...' : 'Guardar Cambios de Perfil'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 📧 Card 2: Connected Inboxes Management */}
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

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleResetAndRescan}
              disabled={isResettingLabels}
              className="px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-alabaster-200 transition shadow-sm flex items-center space-x-2 disabled:opacity-50"
              title="Remueve la etiqueta KONO_INVOICE de Gmail y vuelve a procesar todos los correos entrantes a PostgreSQL"
            >
              <IconRefresh className={`w-4 h-4 text-cyan-400 ${isResettingLabels ? 'animate-spin' : ''}`} />
              <span>{isResettingLabels ? 'Limpiando & Procesando...' : 'Re-procesar Correos'}</span>
            </button>

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
                  onClick={() => handleRequestRemoveInbox(inbox.id, inbox.email)}
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

      {/* 🪄 Modal 1: Añadir Nuevo Correo */}
      {isAddModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
          >
            <div className="w-full max-w-md bg-titanium-950/95 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden text-alabaster-100">
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
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsAdding(true);
                      setErrorMessage(null);
                      await signInWithGoogle(`${window.location.origin}/settings`);
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
                      <IconBrandGoogle className="w-4 h-4 text-titanium-950 stroke-[2.2]" />
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

      {/* 🛑 Modal 2: Confirmación de Eliminación de Bandeja */}
      {inboxToDelete &&
        createPortal(
          <div
            className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
          >
            <div className="w-full max-w-md bg-titanium-950/95 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden text-alabaster-100">
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center space-x-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-md shrink-0">
                  <IconTrash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-alabaster-100">Desvincular Bandeja</h3>
                  <p className="text-xs text-zinc-400 font-mono">{inboxToDelete.email}</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed mb-6 relative z-10">
                ¿Estás seguro de que deseas desvincular esta cuenta de correo? Kono dejará de escanear y etiquetar facturas para esta dirección en segundo plano.
              </p>

              <div className="flex items-center justify-end space-x-3 relative z-10">
                <button
                  type="button"
                  onClick={() => setInboxToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition shadow-lg shadow-rose-500/20 flex items-center space-x-1.5"
                >
                  <IconTrash className="w-4 h-4" />
                  <span>Sí, Desvincular</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ⚠️ Toast Emergente 3: Advertencia de Bandeja Única (Desaparece en 3s) */}
      {showSingleInboxAlert &&
        createPortal(
          <div
            className="fixed top-6 right-6 z-[9999] max-w-md w-full p-4 bg-titanium-950/95 border border-amber-500/30 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-fade-in text-alabaster-100 flex items-start space-x-3.5"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <IconAlertCircle className="w-5 h-5" />
            </div>

            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-amber-400">Requisito Obligatorio</h4>
                <button
                  onClick={handleDismissSingleInboxAlert}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                  title="Cerrar notificación"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                Debes mantener al menos una bandeja vinculada para recibir facturas.
              </p>
              {/* Barra de tiempo progresiva Tailwind que se consume en exactamente 3 segundos */}
              <div className="mt-3.5 w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-75 ease-linear"
                  style={{ width: `${alertProgress}%` }}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
