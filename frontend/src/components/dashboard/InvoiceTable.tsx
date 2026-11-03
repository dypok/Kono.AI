import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { DocumentListItem } from '../../services/documentsApi';

interface InvoiceTableProps {
  documents: DocumentListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e: React.MouseEvent | React.ChangeEvent<any>) => void;
  onSelectAll: () => void;
  onNavigate: (id: string) => void;
  formatDate: (dateStr?: string) => string;
  formatCurrency: (amount?: number, curr?: string) => string;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  documents,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onNavigate,
  formatDate,
  formatCurrency,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            <th className="py-3.5 px-4 w-10 text-center">
              <input
                type="checkbox"
                checked={selectedIds.size === documents.length && documents.length > 0}
                onChange={onSelectAll}
                className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-0 cursor-pointer"
                title="Seleccionar todas las facturas de la página"
              />
            </th>
            <th className="py-3.5 px-4">Comprobante</th>
            <th className="py-3.5 px-6">Emisor & NIT</th>
            <th className="py-3.5 px-6">Fecha</th>
            <th className="py-3.5 px-6">Total Extraído</th>
            <th className="py-3.5 px-6">Estado & Diagnóstico</th>
            <th className="py-3.5 px-6 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-xs text-alabaster-200">
          {documents.map((doc) => {
            const isSelected = selectedIds.has(doc.id);
            return (
              <tr
                key={doc.id}
                onClick={() => onNavigate(doc.id)}
                className={`hover:bg-white/[0.04] transition duration-150 group cursor-pointer ${
                  isSelected ? 'bg-rose-500/[0.05]' : ''
                }`}
              >
                <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggleSelect(doc.id, e)}
                    className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-0 cursor-pointer"
                  />
                </td>
                <td className="py-4 px-4 font-mono font-medium text-alabaster-100 flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
                  <span className={doc.invoice_number ? 'text-alabaster-100' : 'text-rose-400 italic'}>
                    {doc.invoice_number || 'Folio No Encontrado'}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <p className={`font-medium ${doc.vendor_name ? 'text-alabaster-100' : 'text-rose-400 italic'}`}>
                    {doc.vendor_name || 'Emisor No Encontrado'}
                  </p>
                  <p className={`text-[10px] font-mono ${doc.vendor_tax_id ? 'text-zinc-400' : 'text-rose-400/80 italic'}`}>
                    {doc.vendor_tax_id || 'NIT No Detectado'}
                  </p>
                </td>
                <td className="py-4 px-6 font-mono text-zinc-300">
                  {doc.issue_date ? (
                    formatDate(doc.issue_date)
                  ) : (
                    <span className="text-rose-400/80 text-[11px] italic">Fecha no detectada</span>
                  )}
                </td>
                <td className="py-4 px-6 font-mono">
                  {(doc.grand_total || 0) > 0 ? (
                    <div>
                      <span className="font-bold text-alabaster-100">{formatCurrency(doc.grand_total || 0, 'COP')}</span>
                      {doc.currency === 'USD' && (
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                            USD conv.
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            ${(doc.bounding_boxes?.conversion?.original_total_usd || ((doc.grand_total || 0) / (doc.bounding_boxes?.conversion?.exchange_rate_cop || 4150))).toFixed(2)} USD
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-rose-400 text-xs font-medium">Sin total detectado</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {doc.kono_state === 'GREEN' && doc.vendor_name && doc.vendor_tax_id && (doc.grand_total || 0) > 0 && doc.invoice_number ? (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>100% Auditada y Cuadrada</span>
                    </span>
                  ) : (doc.kono_state === 'RED' || !doc.vendor_name || !doc.vendor_tax_id || !(doc.grand_total || 0) || !doc.invoice_number) ? (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Campos Críticos Faltantes</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Alerta Matemática / Discrepancia</span>
                    </span>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="inline-flex items-center space-x-1 text-zinc-400 group-hover:text-white font-mono text-[11px] font-medium transition">
                    <span>Revisar</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
