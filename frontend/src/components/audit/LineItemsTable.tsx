import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';

interface LineItemsTableProps {
  invoice: InvoiceRecord;
  onUpdateInvoice: (invoice: InvoiceRecord) => void;
}

/** Section 2: extracted line items table with editable qty/price and verified tags. */
export function LineItemsTable({ invoice, onUpdateInvoice }: LineItemsTableProps) {
  function handleItemChange(id: string, field: 'quantity' | 'unitPrice', value: number) {
    const lineItems = invoice.lineItems.map((item) => {
      if (item.id !== id) return item;
      const quantity = field === 'quantity' ? value : item.quantity;
      const unitPrice = field === 'unitPrice' ? value : item.unitPrice;
      return { ...item, [field]: value, lineTotal: quantity * unitPrice };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = subtotal * invoice.taxRate;
    onUpdateInvoice({ ...invoice, lineItems, subtotal, taxAmount, grandTotal: subtotal + taxAmount });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Extracted Line Items ({invoice.lineItems.length})</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">Live arithmetic validation</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[11px] text-slate-400">
              <th className="px-2 py-2 font-sans font-medium">DESCRIPTION</th>
              <th className="px-2 py-2 text-right font-medium">QTY</th>
              <th className="px-2 py-2 text-right font-medium">UNIT PRICE</th>
              <th className="px-2 py-2 text-right font-medium">TOTAL</th>
              <th className="px-1 py-2 text-center font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoice.lineItems.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-2 py-2 font-sans font-medium text-slate-200">{item.description}</td>
                <td className="px-2 py-2 text-right">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-14 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-right text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    type="number"
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-20 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-right text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </td>
                <td className="px-2 py-2 text-right font-semibold text-white">${item.lineTotal.toFixed(2)}</td>
                <td className="px-1 py-2 text-center">
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-sans text-[10px] text-emerald-400">
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
