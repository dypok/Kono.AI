import { CheckCircle2, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';
import { AuditState, InvoiceRecord } from '../../types/invoice';
import { cn } from '../../lib/cn';

interface AuditSpeechBubbleProps {
  invoice: InvoiceRecord;
}

const STATE_CONFIG: Record<
  AuditState,
  { badgeClass: string; icon: JSX.Element; title: string }
> = {
  ok: {
    badgeClass: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />,
    title: 'Fully reconciled',
  },
  warning: {
    badgeClass: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
    icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />,
    title: 'Needs a quick look',
  },
  critical: {
    badgeClass: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
    icon: <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />,
    title: 'Blocked — possible duplicate',
  },
};

/** Translucent speech bubble next to Kono, showing the audit verdict + math check pill. */
export function AuditSpeechBubble({ invoice }: AuditSpeechBubbleProps) {
  const config = STATE_CONFIG[invoice.auditState];
  const itemsSum = invoice.lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <div className="relative flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-glass backdrop-blur-xl">
      <span className="absolute -left-2 top-6 h-3 w-3 rotate-45 border-b border-l border-white/10 bg-slate-900/80" aria-hidden />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>{config.title}</span>
          </div>

          <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium', config.badgeClass)}>
            {config.icon}
            <span>{invoice.auditState === 'critical' ? invoice.duplicateFlag : `Δ = $${Math.abs(invoice.deltaAmount).toFixed(2)}`}</span>
          </div>
        </div>

        <p className="text-sm font-medium leading-relaxed text-slate-200">&ldquo;{invoice.auditMessage}&rdquo;</p>

        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-1.5 pt-1.5 font-mono text-xs',
            invoice.auditState === 'ok' && 'border-emerald-500/20 bg-emerald-950/30 text-emerald-300/90',
            invoice.auditState === 'warning' && 'border-amber-500/20 bg-amber-950/30 text-amber-300/90',
            invoice.auditState === 'critical' && 'border-rose-500/20 bg-rose-950/30 text-rose-300/90',
          )}
        >
          <span>
            Σ Items (${itemsSum.toFixed(2)}) + Tax (${invoice.taxAmount.toFixed(2)}) = ${invoice.grandTotal.toFixed(2)}
            {invoice.auditState === 'ok' ? ' [Exact Match Δ = $0.00]' : ` [Header shows $${invoice.subtotal.toFixed(2)}]`}
          </span>
        </div>
      </div>
    </div>
  );
}
