import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Cpu,
  Layers,
  FileSearch,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-titanium-950 text-alabaster-100 relative overflow-hidden font-sans selection:bg-white/10 selection:text-white">
      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-slate-800/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-[600px] h-[600px] bg-zinc-800/15 rounded-full blur-[160px] pointer-events-none" />

      {/* Floating Liquid Glass Top Navigation */}
      <nav className="relative z-20 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-zinc-600 p-0.5 shadow-md">
            <div className="w-full h-full rounded-full bg-titanium-900 flex items-center justify-center border border-white/40">
              <div className="w-4 h-4 rounded-full border border-kono-silver/60 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-alabaster-100 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-alabaster-100">
            Kono<span className="text-kono-chrome font-light">.ai</span>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-medium text-xs transition duration-200 shadow-sm flex items-center space-x-2"
          >
            <span>{isAuthenticated ? 'Ir al Workspace' : 'Iniciar Sesión'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-20 text-center flex flex-col items-center">
        {/* Floating Pill Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full liquid-glass-card border border-white/10 text-xs text-alabaster-200 mb-8 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-kono-silver" />
          <span className="font-mono">Motor Determinista Zero-Token & Dual-Backend</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-alabaster-50 max-w-4xl leading-[1.1]">
          Cero digitación, <span className="text-zinc-400 font-light italic">cero descuadres.</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl font-normal leading-relaxed">
          Kono procesa, audita y concilia tus facturas en milisegundos con verificación aritmética exacta antes de que toquen tus libros contables.
        </p>

        {/* Call to Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-slate-200 via-alabaster-100 to-zinc-300 text-titanium-950 font-semibold text-sm hover:opacity-95 transition shadow-xl shadow-white/5 flex items-center justify-center space-x-2.5"
          >
            <span>Comenzar Ahora</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2 text-xs text-zinc-400 px-4 py-3">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sin tarjeta requerida — Demo 100% interactiva</span>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="liquid-glass rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold font-mono text-alabaster-100">&lt; 15 ms</p>
            <p className="text-xs text-zinc-400 mt-1 uppercase font-mono tracking-wider">Latencia Promedio</p>
          </div>
          <div className="liquid-glass rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold font-mono text-emerald-400">$0.00 USD</p>
            <p className="text-xs text-zinc-400 mt-1 uppercase font-mono tracking-wider">Costo por Factura (95%)</p>
          </div>
          <div className="liquid-glass rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold font-mono text-alabaster-100">±0.00</p>
            <p className="text-xs text-zinc-400 mt-1 uppercase font-mono tracking-wider">Descuadre Aritmético</p>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="liquid-glass rounded-3xl p-8 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-kono-silver">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-alabaster-100">Ingesta & Triage Flash en Rust</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deduplicación SHA-256 instantánea, triage de PDFs digitales y deskewing de imágenes de alta velocidad en memoria compartida.
            </p>
          </div>

          <div className="liquid-glass rounded-3xl p-8 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-alabaster-100">Auditoría Determinista Espacial</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Motor de Ray-Casting que extrae tablas y totales matemáticamente sin costo de tokens, con fallback selectivo de IA solo cuando es necesario.
            </p>
          </div>

          <div className="liquid-glass rounded-3xl p-8 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-amber-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-alabaster-100">Mascota Kono & Visor Split-Screen</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Auditoría visual con bounding boxes interactivos y la mascota Kono que te alerta ante inconsistencias o aprueba en 1-Click.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
        <div className="flex items-center space-x-2">
          <span>🪙 Kono.ai Platform</span>
          <span>•</span>
          <span>Arquitectura Dual-Backend</span>
        </div>
        <p className="font-mono">© 2026 Kono.ai — Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};
