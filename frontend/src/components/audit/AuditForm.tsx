import React, { useState } from 'react';
import { Save, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle, Mail, Loader2 } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';
import { KonoCoin } from '../mascot/KonoCoin';
import { MetadataSection } from './MetadataSection';
import { LineItemsTable } from './LineItemsTable';
import { TotalsBreakdown } from './TotalsBreakdown';
import { cn } from '../../lib/cn';
import { documentsApi } from '../../services/documentsApi';

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
  const [isExportingEmail, setIsExportingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

  const handleConfirmEmailExport = async () => {
    try {
      setIsExportingEmail(true);
      const res = await documentsApi.exportDocumentToEmail(invoice.id);
      setShowEmailModal(false);
      setEmailSuccessMsg(`✓ Factura exportada y clasificada como "${res.label}"`);
      setTimeout(() => setEmailSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error al exportar al correo: ${err.message}`);
    } finally {
      setIsExportingEmail(false);
    }
  };

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
                {emailSuccessMsg 
                  ? emailSuccessMsg
                  : isExported 
                  ? '✓ Asiento contable registrado inmutablemente en el historial.' 
                  : invoice.issuerName || 'Proveedor General'}
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <button
            type="button"
            onClick={onSaveTemplate}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 text-xs font-semibold text-alabaster-100 transition shadow-sm flex items-center justify-center space-x-1.5 active:scale-95"
            title="Guardar plantilla de extracción"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Guardar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 text-xs font-semibold text-alabaster-100 transition shadow-sm flex items-center justify-center space-x-1.5 active:scale-95"
            title="Exportar al correo con clasificación Empresa→Tipo"
          >
            <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Exportar Correo</span>
          </button>

          {isExported ? (
            <div
              className="flex-1 px-3.5 py-2 rounded-lg text-xs font-bold bg-white/5 text-zinc-400 border border-white/10 flex items-center justify-center space-x-1.5 cursor-default select-none shadow-sm"
              title="Este comprobante ya fue auditado, aprobado y archivado en el Historial ERP"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Exportada a ERP</span>
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

      {/* Email Export Confirmation Modal (US-REQ-006) */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-titanium-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md liquid-glass rounded-3xl p-6 border border-purple-500/30 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-purple-400">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-alabaster-100">Exportar al Correo (Gmail)</h3>
                <p className="text-[11px] text-zinc-400 font-mono">Clasificación Contable Automática</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <p className="text-zinc-300">
                Este comprobante será enviado a tu bandeja y organizado automáticamente bajo la jerarquía:
              </p>
              <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/20 font-mono text-purple-300 text-xs">
                KONO_INVOICE/{invoice.issuerName ? invoice.issuerName.split(' ')[0] : 'General'}/Debito
              </div>
              <p className="text-[10px] text-zinc-400 pt-1">
                Facilita la declaración de renta organizando tus facturas y comprobantes en carpetas aisladas por empresa.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                disabled={isExportingEmail}
                className="flex-1 px-4 py-2.5 rounded-xl liquid-glass-card hover:bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEmailExport}
                disabled={isExportingEmail}
                className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/25 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isExportingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Mail className="w-4 h-4 text-white" />
                )}
                <span>{isExportingEmail ? 'Exportando...' : 'Confirmar & Enviar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
