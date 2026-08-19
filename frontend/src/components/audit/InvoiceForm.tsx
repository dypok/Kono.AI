import React from 'react';
import { InvoiceData } from '../../types/invoice';
import { KonoMascot } from '../mascot/KonoMascot';
import { MascotDialogue } from '../mascot/MascotDialogue';
import {
  Building2,
  Calendar,
  Hash,
  CheckCircle2,
  Save,
  ArrowRight,
  ShieldCheck,
  Percent,
  Plus,
  Trash2,
} from 'lucide-react';

interface InvoiceFormProps {
  invoice: InvoiceData;
  activeFieldKey: string | null;
  onSelectField: (fieldKey: string) => void;
  onUpdateInvoice: (updated: InvoiceData) => void;
  onSaveTemplate: () => void;
  onApproveAndExport: () => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  activeFieldKey,
  onSelectField,
  onUpdateInvoice,
  onSaveTemplate,
  onApproveAndExport,
}) => {
  // Handlers for item modifications
  const handleItemChange = (id: string, field: 'quantity' | 'unitPrice', val: number) => {
    const updatedItems = invoice.items.map((item) => {
      if (item.id === id) {
        const qty = field === 'quantity' ? val : item.quantity;
        const price = field === 'unitPrice' ? val : item.unitPrice;
        return {
          ...item,
          [field]: val,
          lineTotal: qty * price,
        };
      }
      return item;
    });

    const newSubtotal = updatedItems.reduce((acc, it) => acc + it.lineTotal, 0);
    const newTax = newSubtotal * invoice.taxRate;
    const newGrandTotal = newSubtotal + newTax;

    onUpdateInvoice({
      ...invoice,
      items: updatedItems,
      subtotal: newSubtotal,
      taxAmount: newTax,
      grandTotal: newGrandTotal,
    });
  };

  const getInputClass = (fieldKey: string) => {
    const isFocused = activeFieldKey === fieldKey;
    return `w-full px-3 py-1.5 rounded-xl bg-white/[0.03] backdrop-blur-md border text-xs font-mono text-slate-100 transition-all ${
      isFocused
        ? 'border-cyan-400 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)] bg-cyan-950/20'
        : 'border-white/[0.08] hover:border-white/20 focus:border-cyan-400/50'
    }`;
  };

  return (
    <div className="flex flex-col h-full rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-glass overflow-y-auto space-y-5">
      
      {/* Top Audit Status Card with Silver Kono Mascot */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10 shadow-inner">
        <div className="shrink-0 flex flex-col items-center">
          <KonoMascot status={invoice.status} size="md" showPulse={true} />
          <span className="mt-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
            Kono AI
          </span>
        </div>

        <MascotDialogue
          status={invoice.status}
          message={invoice.statusMessage}
          mathDiscrepancy={invoice.mathDiscrepancy}
          duplicateWarning={invoice.duplicateWarning}
        />
      </div>

      {/* Section 1: Issuer & Customer Metadata */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Cabecera & Metadatos Fiscales</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            ✓ OCR Verificado
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Factura N° */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1 font-medium">
              <Hash className="w-3 h-3 text-violet-400" /> Factura N°
            </label>
            <input
              type="text"
              value={invoice.invoiceNumber}
              onFocus={() => onSelectField('invoice_number')}
              onChange={(e) => onUpdateInvoice({ ...invoice, invoiceNumber: e.target.value })}
              className={getInputClass('invoice_number')}
            />
          </div>

          {/* NIT Emisor */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">
              🏢 NIT Emisor
            </label>
            <input
              type="text"
              value={invoice.issuerNit}
              onFocus={() => onSelectField('issuer_nit')}
              onChange={(e) => onUpdateInvoice({ ...invoice, issuerNit: e.target.value })}
              className={getInputClass('issuer_nit')}
            />
          </div>

          {/* Razón Social Emisor */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">
              Razón Social Proveedor
            </label>
            <input
              type="text"
              value={invoice.issuerName}
              onFocus={() => onSelectField('issuer_name')}
              onChange={(e) => onUpdateInvoice({ ...invoice, issuerName: e.target.value })}
              className={getInputClass('issuer_name')}
            />
          </div>

          {/* Fecha Emisión */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-violet-400" /> Fecha Emisión
            </label>
            <input
              type="text"
              value={invoice.issueDate}
              onFocus={() => onSelectField('issue_date')}
              onChange={(e) => onUpdateInvoice({ ...invoice, issueDate: e.target.value })}
              className={getInputClass('issue_date')}
            />
          </div>

          {/* Fecha Vencimiento */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-violet-400" /> Fecha Vencimiento
            </label>
            <input
              type="text"
              value={invoice.dueDate}
              onFocus={() => onSelectField('due_date')}
              onChange={(e) => onUpdateInvoice({ ...invoice, dueDate: e.target.value })}
              className={getInputClass('due_date')}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Extracted Line Items Table */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ítems y Conceptos Facturados ({invoice.items.length} líneas)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Validación Dinámica Aritmética
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-white/10 text-[11px]">
                <th className="py-2 px-2 font-medium font-sans">DESCRIPCIÓN</th>
                <th className="py-2 px-2 text-right font-medium">CANT</th>
                <th className="py-2 px-2 text-right font-medium">VR. UNIT</th>
                <th className="py-2 px-2 text-right font-medium">TOTAL</th>
                <th className="py-2 px-1 text-center font-medium">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoice.items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="py-2 px-2 font-sans text-slate-200 font-medium">
                    {item.description}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={item.quantity}
                      min="1"
                      onChange={(e) =>
                        handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      className="w-14 text-right bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={item.unitPrice}
                      step="0.01"
                      onChange={(e) =>
                        handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 text-right bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2 text-right text-white font-semibold">
                    ${item.lineTotal.toFixed(2)}
                  </td>
                  <td className="py-2 px-1 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans">
                      <CheckCircle2 className="w-3 h-3" />
                      OK
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Totals & Tax Breakdown Glass Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-white/10 shadow-glass space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-white/5 pb-2">
          <span>Liquidación y Totales</span>
          <span className="text-cyan-400 font-mono text-[11px]">Tolerancia ±$0.02</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Subtotal */}
          <div
            onClick={() => onSelectField('subtotal')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeFieldKey === 'subtotal'
                ? 'bg-sky-950/30 border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                : 'bg-white/[0.02] border-white/5 hover:border-white/15'
            }`}
          >
            <div className="text-[11px] text-slate-400 font-medium">Subtotal</div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              ${invoice.subtotal.toFixed(2)}
            </div>
            <div className="text-[10px] text-sky-400 mt-1 flex items-center gap-1">
              🔵 Campo Mapeado
            </div>
          </div>

          {/* IVA / Tax */}
          <div
            onClick={() => onSelectField('tax_amount')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeFieldKey === 'tax_amount'
                ? 'bg-emerald-950/30 border-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                : 'bg-white/[0.02] border-white/5 hover:border-white/15'
            }`}
          >
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              <span>IVA ({invoice.taxRate * 100}%)</span>
              <Percent className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              ${invoice.taxAmount.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
              🟢 Tasa Determinada
            </div>
          </div>

          {/* Gran Total */}
          <div
            onClick={() => onSelectField('grand_total')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeFieldKey === 'grand_total'
                ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-cyan-950/20 border-cyan-500/20 hover:border-cyan-400/30'
            }`}
          >
            <div className="text-[11px] text-cyan-300 font-medium">Gran Total a Pagar</div>
            <div className="text-xl font-extrabold font-mono text-cyan-300 mt-0.5">
              ${invoice.grandTotal.toFixed(2)}
            </div>
            <div className="text-[10px] text-cyan-400 mt-1 font-semibold">
              ✓ Exact Match
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={onSaveTemplate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] active:scale-95 text-slate-200 border border-white/10 font-medium text-xs backdrop-blur-md transition-all shadow-sm"
        >
          <Save className="w-4 h-4 text-cyan-400" />
          <span>Guardar Plantilla Proveedor</span>
        </button>

        <button
          onClick={onApproveAndExport}
          disabled={invoice.status === 'red'}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-glass ${
            invoice.status === 'red'
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-white shadow-glass-glow-emerald border border-emerald-300/40'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Aprobar & Exportar a ERP (1-Click)</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>

    </div>
  );
};
