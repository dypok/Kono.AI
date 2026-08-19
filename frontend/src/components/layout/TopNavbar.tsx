import { Zap, DollarSign, Clock, UploadCloud, CheckCheck } from 'lucide-react';
import { AuditState, LiveMetrics } from '../../types/invoice';
import { KonoCoin } from '../mascot/KonoCoin';
import { cn } from '../../lib/cn';

interface TopNavbarProps {
  metrics: LiveMetrics;
  auditState: AuditState;
  onDemoStateChange: (state: AuditState) => void;
  onOpenUpload: () => void;
  onBatchApprove: () => void;
}

const DEMO_BUTTONS: { state: AuditState; label: string; emoji: string; activeClass: string }[] = [
  { state: 'ok', label: 'Green', emoji: '🟢', activeClass: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  { state: 'warning', label: 'Yellow', emoji: '🟡', activeClass: 'border-amber-500/40 bg-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  { state: 'critical', label: 'Red', emoji: '🔴', activeClass: 'border-rose-500/40 bg-rose-500/20 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]' },
];

/** Floating frosted-glass top navigation bar with live KPIs and primary actions. */
export function TopNavbar({ metrics, auditState, onDemoStateChange, onOpenUpload, onBatchApprove }: TopNavbarProps) {
  return (
    <header className="sticky top-3 z-40 mx-4 my-3">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-3 shadow-glass backdrop-blur-2xl">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <KonoCoin state={auditState} size="sm" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                Kono<span className="text-cyan-400">.ai</span>
              </span>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-400">
                AUDITOR
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">Financial extraction &amp; zero-token reconciliation</p>
          </div>
        </div>

        {/* KPI pills */}
        <div className="hidden items-center gap-3 font-mono text-xs lg:flex">
          <KpiPill icon={<Zap className="h-3.5 w-3.5 text-amber-400" />} value={metrics.invoicesToday} label="Invoices Processed Today" valueClass="text-white" />
          <KpiPill
            icon={<DollarSign className="h-3.5 w-3.5 text-emerald-400" />}
            value={`$${metrics.tokenCost.toFixed(2)}`}
            label={`Token Cost (${metrics.deterministicRate}% Deterministic)`}
            valueClass="text-emerald-400"
          />
          <KpiPill icon={<Clock className="h-3.5 w-3.5 text-cyan-400" />} value={`${metrics.avgLatencyMs} ms`} label="Avg Latency" valueClass="text-cyan-400" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-1 text-xs sm:flex">
            {DEMO_BUTTONS.map((btn) => (
              <button
                key={btn.state}
                type="button"
                onClick={() => onDemoStateChange(btn.state)}
                title={btn.label}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-all',
                  auditState === btn.state ? btn.activeClass : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {btn.emoji} <span className="hidden md:inline">{btn.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-slate-200 backdrop-blur-md transition-all hover:bg-white/[0.09] active:scale-95"
          >
            <UploadCloud className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">Dropzone Upload</span>
          </button>

          <button
            type="button"
            onClick={onBatchApprove}
            disabled={metrics.batchReadyCount === 0}
            className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-xs font-medium text-white shadow-glass-glow-emerald transition-all hover:from-emerald-500 hover:to-teal-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck className="h-4 w-4" />
            <span>1-Click Batch Approve ({metrics.batchReadyCount} Ready)</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function KpiPill({ icon, value, label, valueClass }: { icon: JSX.Element; value: string | number; label: string; valueClass: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-slate-300 backdrop-blur-md">
      {icon}
      <span className={cn('font-semibold', valueClass)}>{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}
