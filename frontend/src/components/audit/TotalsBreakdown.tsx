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
  const hasTotals = (invoice.grandTotal > 0 || invoice.subtotal > 0);

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-glass">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs font-semibold text-zinc-300">
        <span>Desglose de Totales e Impuestos</span>
        <span className="font-mono text-[11px] text-zinc-400">
          {hasTotals ? 'Tolerancia ±$0.02' : 'Sin totales detectados'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TotalTile
          label="Subtotal Extraído"
          value={invoice.subtotal > 0 ? `$${invoice.subtotal.toFixed(2)}` : '$0.00'}
          hint={invoice.subtotal > 0 ? "🔵 Campo Mapeado" : "⚪ Sin detectar"}
          hintClass={invoice.subtotal > 0 ? "text-zinc-400" : "text-zinc-500"}
          isActive={activeFieldKey === 'subtotal'}
          activeClass="border-white/40 bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.1)]"
          onClick={() => onSelectField('subtotal')}
        />

        <TotalTile
          label={
            <span className="flex items-center justify-between">
              <span>IVA ({(invoice.taxRate * 100).toFixed(0)}%)</span>
              <Percent className="h-3 w-3 text-emerald-400" />
            </span>
          }
          value={invoice.taxAmount > 0 ? `$${invoice.taxAmount.toFixed(2)}` : '$0.00'}
          valueClass={invoice.taxAmount > 0 ? "text-emerald-400 font-mono" : "text-zinc-400 font-mono"}
          hint={invoice.taxAmount > 0 ? "🟢 Tarifa Determinada" : "⚪ Sin calcular"}
          hintClass={invoice.taxAmount > 0 ? "text-emerald-400" : "text-zinc-500"}
          isActive={activeFieldKey === 'taxAmount'}
          activeClass="border-emerald-400/50 bg-emerald-950/30 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
          onClick={() => onSelectField('taxAmount')}
        />

        <TotalTile
          label="Gran Total"
          value={invoice.grandTotal > 0 ? `$${invoice.grandTotal.toFixed(2)}` : '$0.00'}
          labelClass="text-alabaster-100"
          valueClass={invoice.grandTotal > 0 ? "text-alabaster-50 text-xl font-extrabold font-mono" : "text-zinc-400 text-lg font-bold font-mono"}
          hint={invoice.grandTotal > 0 ? "✓ Conciliación Exacta" : "⚠️ Requiere IA"}
          hintClass={invoice.grandTotal > 0 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}
          isActive={activeFieldKey === 'grandTotal'}
          activeClass="border-white/50 bg-white/15 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          defaultClass="border-white/10 bg-white/[0.04] hover:border-white/20"
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
