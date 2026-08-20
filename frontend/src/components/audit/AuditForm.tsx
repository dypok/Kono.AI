import { Save, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';
import { KonoCoin } from '../mascot/KonoCoin';
import { MetadataSection } from './MetadataSection';
import { LineItemsTable } from './LineItemsTable';
import { TotalsBreakdown } from './TotalsBreakdown';
import { cn } from '../../lib/cn';

interface AuditFormProps {
  invoice: InvoiceRecord;
  activeFieldKey: string | null;
  onSelectField: (fieldKey: string) => void;
  onUpdateInvoice: (invoice: InvoiceRecord) => void;
  onSaveTemplate: () => void;
  onApproveAndExport: () => void;
}

/** Right panel: structured financial audit form with direct top action controls next to Kono mascot. */
export function AuditForm({ invoice, activeFieldKey, onSelectField, onUpdateInvoice, onSaveTemplate, onApproveAndExport }: AuditFormProps) {
  const isCritical = invoice.auditState === 'critical';
  const isExported = invoice.processingStatus === 'EXPORTED' || invoice.processingStatus === 'APPROVED';

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 liquid-glass shadow-glass backdrop-blur-2xl overflow-hidden relative">
      {/* Static / Sticky Top Mini-Header: Invoice Status Info + Dedicated Action Buttons Row Below */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-titanium-950/85 backdrop-blur-xl p-4 shadow-md space-y-3">
        {/* Row 1: Invoice Folio & Kono Mascot Status Info */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <KonoCoin state={invoice.auditState} size="sm" pulse={true} />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-alabaster-100 font-mono tracking-tight truncate">
                  {invoice.invoiceNumber || 'DOC-ORIGINAL'}
                </h3>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border shrink-0',
                  isExported && 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                  !isExported && invoice.auditState === 'ok' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  !isExported && invoice.auditState === 'warning' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  !isExported && invoice.auditState === 'critical' && 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                )}>
                  {isExported ? (
                    <span className="flex items-center space-x-1"><ShieldCheck className="w-3 h-3 text-cyan-400" /><span>Sincronizada ERP</span></span>
                  ) : invoice.auditState === 'ok' ? (
                    <span className="flex items-center space-x-1"><ShieldCheck className="w-3 h-3" /><span>Cuadrada</span></span>
                  ) : invoice.auditState === 'warning' ? (
                    <span className="flex items-center space-x-1"><AlertCircle className="w-3 h-3" /><span>Revisión</span></span>
                  ) : (
                    <span>Bloqueada</span>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                {isExported 
                  ? '✓ Asiento contable registrado inmutablemente en el historial.' 
                  : invoice.issuerName || 'Proveedor General'}
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Static Action Buttons Placed Below */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <button
            type="button"
            onClick={onSaveTemplate}
            className="flex-1 px-3 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 text-xs font-semibold text-alabaster-100 transition shadow-sm flex items-center justify-center space-x-1.5 active:scale-95"
            title="Guardar coordenadas vectoriales para futuras extracciones a $0 tokens"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Guardar Plantilla</span>
          </button>

          {isExported ? (
            <div
              className="flex-1 px-3.5 py-2 rounded-lg text-xs font-bold bg-white/5 text-zinc-400 border border-white/10 flex items-center justify-center space-x-1.5 cursor-default select-none shadow-sm"
              title="Este comprobante ya fue auditado, aprobado y archivado en el Historial ERP"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Exportada a ERP (Bloqueada)</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onApproveAndExport}
              disabled={isCritical}
              className={cn(
                'flex-1 px-3.5 py-2 rounded-lg text-xs font-bold shadow-lg transition flex items-center justify-center space-x-1.5 active:scale-95',
                isCritical
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-titanium-950 shadow-emerald-500/20 cursor-pointer'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-titanium-950 shrink-0" />
              <span>Aprobar &amp; Exportar ERP</span>
              <ArrowRight className="w-3.5 h-3.5 text-titanium-950 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <MetadataSection invoice={invoice} activeFieldKey={activeFieldKey} onSelectField={onSelectField} onUpdateInvoice={onUpdateInvoice} />
        <LineItemsTable invoice={invoice} onUpdateInvoice={onUpdateInvoice} />
        <TotalsBreakdown invoice={invoice} activeFieldKey={activeFieldKey} onSelectField={onSelectField} />
      </div>
    </div>
  );
}
