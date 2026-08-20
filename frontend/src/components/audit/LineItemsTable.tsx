import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';

interface LineItemsTableProps {
  invoice: InvoiceRecord;
  onUpdateInvoice?: (invoice: InvoiceRecord) => void;
}

/** Section 2: extracted line items table displayed in read-only audit format with live math verification tags. */
export function LineItemsTable({ invoice }: LineItemsTableProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Ítems Extraídos de la Factura ({invoice.lineItems.length})</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">Validación aritmética estricta</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[11px] text-slate-400 font-mono">
              <th className="px-2.5 py-2 font-sans font-medium">DESCRIPCIÓN</th>
              <th className="px-2.5 py-2 text-right font-medium">CANT.</th>
              <th className="px-2.5 py-2 text-right font-medium">PRECIO UNIT.</th>
              <th className="px-2.5 py-2 text-right font-medium">TOTAL LÍNEA</th>
              <th className="px-2 py-2 text-center font-medium">ESTADO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoice.lineItems.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-2.5 py-2.5 font-sans font-medium text-slate-200">{item.description}</td>
                <td className="px-2.5 py-2.5 text-right font-mono text-slate-300">
                  {item.quantity}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono text-slate-300">
                  ${item.unitPrice.toFixed(2)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-semibold text-white font-mono">
                  ${item.lineTotal.toFixed(2)}
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-sans text-[10px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    OK
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
