import { Percent } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';
import { cn } from '../../lib/cn';

interface TotalsBreakdownProps {
  invoice: InvoiceRecord;
  activeFieldKey: string | null;
  onSelectField: (fieldKey: string) => void;
}

/** Section 3: totals & tax breakdown glass card, with the Grand Total in glowing large type. */
export function TotalsBreakdown({ invoice, activeFieldKey, onSelectField }: TotalsBreakdownProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-4 shadow-glass">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs font-semibold text-slate-300">
        <span>Totals &amp; Tax Breakdown</span>
        <span className="font-mono text-[11px] text-cyan-400">Tolerance ±$0.02</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TotalTile
          label="Subtotal"
          value={`$${invoice.subtotal.toFixed(2)}`}
          hint="🔵 Mapped Field"
          hintClass="text-sky-400"
          isActive={activeFieldKey === 'subtotal'}
          activeClass="border-sky-400/50 bg-sky-950/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
          onClick={() => onSelectField('subtotal')}
        />

        <TotalTile
          label={
            <span className="flex items-center justify-between">
              <span>VAT ({(invoice.taxRate * 100).toFixed(0)}%)</span>
              <Percent className="h-3 w-3 text-emerald-400" />
            </span>
          }
          value={`$${invoice.taxAmount.toFixed(2)}`}
          valueClass="text-emerald-400"
          hint="🟢 Rate Determined"
          hintClass="text-emerald-400"
          isActive={activeFieldKey === 'taxAmount'}
          activeClass="border-emerald-400/50 bg-emerald-950/30 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
          onClick={() => onSelectField('taxAmount')}
        />

        <TotalTile
          label="Grand Total"
          value={`$${invoice.grandTotal.toFixed(2)}`}
          labelClass="text-cyan-300"
          valueClass="text-cyan-300 text-xl font-extrabold"
          hint="✓ Exact Match"
          hintClass="text-cyan-400 font-semibold"
          isActive={activeFieldKey === 'grandTotal'}
          activeClass="border-cyan-400/60 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          defaultClass="border-cyan-500/20 bg-cyan-950/20 hover:border-cyan-400/30"
          onClick={() => onSelectField('grandTotal')}
        />
      </div>
    </div>
  );
}

interface TotalTileProps {
  label: React.ReactNode;
  value: string;
  hint: string;
  isActive: boolean;
  activeClass: string;
  onClick: () => void;
  labelClass?: string;
  valueClass?: string;
  hintClass?: string;
  defaultClass?: string;
}

function TotalTile({ label, value, hint, isActive, activeClass, onClick, labelClass, valueClass, hintClass, defaultClass }: TotalTileProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-xl border p-3 transition-all',
        isActive ? activeClass : defaultClass ?? 'border-white/5 bg-white/[0.02] hover:border-white/15',
      )}
    >
      <div className={cn('text-[11px] font-medium text-slate-400', labelClass)}>{label}</div>
      <div className={cn('mt-0.5 font-mono text-lg font-bold text-white', valueClass)}>{value}</div>
      <div className={cn('mt-1 text-[10px]', hintClass)}>{hint}</div>
    </div>
  );
}
