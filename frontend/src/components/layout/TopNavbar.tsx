import React from 'react';
import { Zap, Coins, Clock, Sparkles } from 'lucide-react';
import { LiveMetrics, AuditState } from '../../types/invoice';

interface TopNavbarProps {
  metrics?: LiveMetrics;
  auditState?: AuditState;
  onDemoStateChange?: (state: AuditState) => void;
  onOpenUpload?: () => void;
  onBatchApprove?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  metrics,
  auditState,
  onDemoStateChange,
  onOpenUpload,
  onBatchApprove,
}) => {
  return (
    <header className="h-16 px-6 flex items-center justify-between z-20 border-b border-white/5 bg-titanium-950/40 backdrop-blur-xl">
      {/* Left: View Breadcrumbs / Title */}
      <div className="flex items-center space-x-3">
        <h2 className="text-sm font-semibold tracking-tight text-alabaster-100 uppercase font-mono">
          Workspace Principal
        </h2>
        <span className="text-zinc-500">/</span>
        <span className="text-xs text-zinc-400 font-medium">Reconciliación Determinista</span>
      </div>

      {/* Center/Right: Live System KPI Badges */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl liquid-glass-card border border-white/10 text-xs text-alabaster-200">
          <Zap className="w-3.5 h-3.5 text-kono-gold" />
          <span className="font-mono font-medium">{metrics?.invoicesToday || 482} Procesadas</span>
        </div>

        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-400">
          <Coins className="w-3.5 h-3.5" />
          <span className="font-mono font-semibold">$0.00 Tokens (95% Determinista)</span>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl liquid-glass-card border border-white/10 text-xs text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-kono-silver" />
          <span className="font-mono">{metrics?.avgLatencyMs || '11.4'} ms Latencia</span>
        </div>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <button
          onClick={onBatchApprove}
          className="px-3.5 py-1.5 rounded-xl bg-alabaster-100 text-titanium-950 font-medium text-xs hover:bg-white transition shadow-sm flex items-center space-x-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-titanium-950" />
          <span>Aprobación 1-Click</span>
        </button>
      </div>
    </header>
  );
};
