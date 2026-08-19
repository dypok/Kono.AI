import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck, ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isSignUp) {
        // Sign up with Supabase Auth
        const { supabase } = await import('../lib/supabaseClient');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: 'Lead Financial Auditor' },
          },
        });

        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }

        // Auto login after sign up and trigger onboarding
        localStorage.setItem('kono_new_signup', 'true');
        localStorage.removeItem('kono_onboarding_dismissed');
        await login(email, password);
      } else {
        await login(email, password);
      }

      setIsLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al autenticar con Supabase');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-titanium-950 px-4">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-slate-800/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Liquid Glass Login Card */}
      <div className="w-full max-w-md liquid-glass rounded-3xl p-8 md:p-10 border border-white/10 relative z-10 shadow-2xl">
        {/* Brand Header with Silver Kono Coin Mascot */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 group cursor-pointer" onClick={() => navigate('/')}>
            {/* Mascot Glowing Halo */}
            <div className="absolute -inset-2 bg-gradient-to-r from-slate-400 to-zinc-200 rounded-full blur-md opacity-30 group-hover:opacity-60 transition duration-500" />
            
            {/* Animated Silver Kono Mascot SVG */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-zinc-600 p-1 flex items-center justify-center shadow-lg relative">
              <div className="w-full h-full rounded-full bg-titanium-900 flex flex-col items-center justify-center border border-white/40">
                <div className="flex space-x-1.5 items-center mb-1">
                  <div className="w-1.5 h-2.5 bg-alabaster-100 rounded-full animate-bounce" />
                  <div className="w-1.5 h-2.5 bg-alabaster-100 rounded-full animate-bounce delay-100" />
                </div>
                <div className="w-3.5 h-1 bg-kono-silver rounded-full" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-alabaster-100">
            Kono<span className="text-kono-chrome font-light">.ai</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">
            Auditoría Financiera & Conciliación
          </p>
        </div>

        {/* Tab Toggle: Iniciar Sesión vs Crear Cuenta */}
        <div className="flex items-center p-1 liquid-glass-card rounded-2xl border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              !isSignUp ? 'bg-white/10 text-alabaster-50 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              isSignUp ? 'bg-white/10 text-alabaster-50 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* 🌟 1-Click Google OAuth Button */}
        <button
          type="button"
          onClick={async () => {
            try {
              setIsLoading(true);
              setErrorMessage(null);
              const { signInWithGoogle } = useAuthStore.getState();
              await signInWithGoogle();
            } catch (err: any) {
              setErrorMessage(err?.message || 'Error al conectar con Google OAuth');
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
          className="w-full py-2.5 px-4 mb-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-alabaster-100 border border-white/10 font-medium text-xs transition duration-200 flex items-center justify-center space-x-2.5 shadow-sm disabled:opacity-50"
        >
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
          <span>Continuar con Google (Gmail Auto-Sync)</span>
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] text-zinc-500 font-mono uppercase">o con correo</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-alabaster-300 mb-1.5 uppercase tracking-wider">
                Nombre Completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full liquid-glass-input px-4 py-2.5 rounded-xl text-sm"
                placeholder="Dylan Palacio"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-alabaster-300 mb-1.5 uppercase tracking-wider">
              Correo Corporativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full liquid-glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                placeholder="analista@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-alabaster-300 mb-1.5 uppercase tracking-wider">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full liquid-glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                placeholder="Tu contraseña secreta"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-slate-200 via-alabaster-100 to-zinc-300 text-titanium-950 font-medium text-sm hover:opacity-95 transition duration-200 shadow-lg shadow-white/5 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-titanium-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Completar Registro' : 'Ingresar al Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Badge */}
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center space-x-2 text-zinc-500 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
          <span>Motor Determinista Zero-Token Encriptado</span>
        </div>
      </div>
    </div>
  );
};
