import React from 'react';
import { KonoMascot } from '../mascot/KonoMascot';
import { KonoStatus, AuditMetrics } from '../../types/invoice';
import { Zap, DollarSign, Clock, UploadCloud, CheckCheck } from 'lucide-react';

interface NavbarProps {
  metrics: AuditMetrics;
  currentStatus: KonoStatus;
  onStatusChange: (status: KonoStatus) => void;
  onOpenDropzone: () => void;
  onBatchApprove: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  metrics,
  currentStatus,
  onStatusChange,
  onOpenDropzone,
  onBatchApprove,
}) => {
  return (
    <header className="sticky top-3 z-40 mx-4 my-3">
      <div className="flex items-center justify-between gap-4 px-6 py-3 rounded-2xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-glass transition-all">
        
        {/* Brand & Animated Silver Coin */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <KonoMascot status={currentStatus} size="sm" showPulse={true} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Kono<span className="text-cyan-400">.ai</span>
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                AUDITOR PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Financial Extraction & Zero-Token Reconciliation
            </p>
          </div>
        </div>

        {/* Center: Translucent Pill KPI Badges */}
        <div className="hidden lg:flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-white">{metrics.processedToday}</span>
            <span className="text-slate-400">Facturas Hoy</span>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-slate-300">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-emerald-400">${metrics.tokenCost.toFixed(2)}</span>
            <span className="text-slate-400">Costo Tokens ({metrics.zeroTokenRate}% Determinista)</span>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-cyan-400">{metrics.avgLatencyMs} ms</span>
            <span className="text-slate-400">Latencia Media</span>
          </div>
        </div>

        {/* Right Actions & Status Switcher */}
        <div className="flex items-center gap-3">
          {/* Quick Demo State Switcher */}
          <div className="hidden sm:flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => onStatusChange('green')}
              className={`px-2.5 py-1 rounded-lg transition-all font-medium flex items-center gap-1 ${
                currentStatus === 'green'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Factura 100% Cuadrada"
            >
              🟢 <span className="hidden md:inline">Verde</span>
            </button>
            <button
              onClick={() => onStatusChange('yellow')}
              className={`px-2.5 py-1 rounded-lg transition-all font-medium flex items-center gap-1 ${
                currentStatus === 'yellow'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Descuadre Aritmético"
            >
              🟡 <span className="hidden md:inline">Alerta</span>
            </button>
            <button
              onClick={() => onStatusChange('red')}
              className={`px-2.5 py-1 rounded-lg transition-all font-medium flex items-center gap-1 ${
                currentStatus === 'red'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Duplicado Crítico"
            >
              🔴 <span className="hidden md:inline">Duplicado</span>
            </button>
          </div>

          {/* Dropzone Upload Button */}
          <button
            onClick={onOpenDropzone}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] active:scale-95 text-slate-200 border border-white/10 transition-all text-xs font-medium backdrop-blur-md"
          >
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Subir Lote</span>
          </button>

          {/* 1-Click Batch Approval Glowing Button */}
          <button
            onClick={onBatchApprove}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white font-medium text-xs shadow-glass-glow-emerald border border-emerald-400/30 transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            <span>1-Click Aprobar ({metrics.batchReadyCount})</span>
          </button>
        </div>

      </div>
    </header>
  );
};
