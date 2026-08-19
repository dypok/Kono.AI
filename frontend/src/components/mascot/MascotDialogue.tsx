import React from 'react';
import { KonoStatus } from '../../types/invoice';
import { CheckCircle2, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';

interface MascotDialogueProps {
  status: KonoStatus;
  message: string;
  mathDiscrepancy?: number;
  duplicateWarning?: string;
}

export const MascotDialogue: React.FC<MascotDialogueProps> = ({
  status,
  message,
  mathDiscrepancy = 0,
  duplicateWarning,
}) => {
  const statusConfig = {
    green: {
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      pillText: 'Exact Match Δ = $0.00',
      title: 'Auditoría 100% Cuadrada',
    },
    yellow: {
      badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      pillText: `Descuadre Aritmético Δ = $${Math.abs(mathDiscrepancy).toFixed(2)}`,
      title: 'Revisión por Excepción Requerida',
    },
    red: {
      badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />,
      pillText: duplicateWarning || 'Alerta Crítica: Bloqueo Preventivo',
      title: 'Posible Duplicado Detectado',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="relative flex-1 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 shadow-glass transition-all duration-300">
      {/* Speech Bubble Arrow Tail pointing left towards Mascot */}
      <div className="absolute -left-2 top-6 w-3 h-3 bg-slate-900/80 border-l border-b border-white/10 rotate-45" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-xs tracking-wider uppercase text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kono Auditor Feed</span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-mono font-medium ${config.badgeBg}`}>
            {config.icon}
            <span>{config.pillText}</span>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-200 leading-relaxed">
          "{message}"
        </p>

        {status === 'green' && (
          <div className="flex items-center gap-2 pt-1 text-xs font-mono text-emerald-300/90 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <span>Σ Ítems ($1,500.00) + IVA 19% ($285.00) = Gran Total $1,785.00</span>
          </div>
        )}

        {status === 'yellow' && (
          <div className="flex items-center gap-2 pt-1 text-xs font-mono text-amber-300/90 bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <span>⚠️ Subtotal calculado ($1,500.00) difiere de la cabecera ($1,540.00)</span>
          </div>
        )}

        {status === 'red' && (
          <div className="flex items-center gap-2 pt-1 text-xs font-mono text-rose-300/90 bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-500/20">
            <span>🚫 Hash SHA-256 coincide con factura registrada el 14/08/2026</span>
          </div>
        )}
      </div>
    </div>
  );
};
