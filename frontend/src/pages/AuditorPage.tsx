import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconCircleCheck, IconLoader2, IconSparkles } from '@tabler/icons-react';
import { DocumentViewer } from '../components/viewer/DocumentViewer';
import { AuditForm } from '../components/audit/AuditForm';
import { Toast } from '../components/layout/Toast';
import { useToast } from '../hooks/useToast';
import { documentsApi } from '../services/documentsApi';
import { baseInvoice } from '../lib/mockData';
import { InvoiceRecord, AuditState } from '../types/invoice';

interface AuditorPageProps {
  onBackToSite?: () => void;
}

/** Live split-screen invoice auditor: Left: PDF stream / Canvas | Right: Structured audit summary & extracted data. */
export function AuditorPage({ onBackToSite }: AuditorPageProps) {
  const { documentId } = useParams<{ documentId?: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceRecord>(baseInvoice);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { message: toastMessage, showToast } = useToast();

  useEffect(() => {
    async function loadDocumentData() {
      if (!documentId) {
        // Si no hay id específico, buscar el documento más reciente del usuario
        try {
          setIsLoading(true);
          const listRes = await documentsApi.listDocuments({ pageSize: 1 });
          if (listRes.items && listRes.items.length > 0) {
            const firstDoc = listRes.items[0];
            await fetchAndMapDocument(firstDoc.id);
          }
        } catch (err) {
          console.warn('No se encontraron comprobantes previos:', err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      await fetchAndMapDocument(documentId);
    }

    async function fetchAndMapDocument(id: string) {
      try {
        setIsLoading(true);
        const doc = await documentsApi.getDocument(id);
        if (doc) {
          const mappedAuditState: AuditState =
            doc.kono_state === 'RED' ? 'critical' : doc.kono_state === 'YELLOW' ? 'warning' : 'ok';

          // Mapear items
          const lineItems = (doc.items || []).map((it: any, idx: number) => ({
            id: `item_${idx + 1}`,
            description: it.description || 'Ítem de factura',
            quantity: it.quantity || 1,
            unitPrice: it.unit_price || 0,
            lineTotal: it.total_price || (it.quantity || 1) * (it.unit_price || 0),
            verified: it.is_math_valid !== false,
          }));

          // Mapear campos con bounding boxes
          const rawBboxes = doc.bounding_boxes || {};
          const fields = Object.entries(rawBboxes).map(([key, box]: [string, any], idx) => ({
            id: `field_${idx}`,
            fieldKey: key,
            label: key.replace(/_/g, ' ').toUpperCase(),
            value: String(doc[key] || ''),
            confidence: 0.99,
            color: (key.includes('total') ? 'blue' : key.includes('tax') ? 'emerald' : 'violet') as any,
            page: 1,
            box: (Array.isArray(box) && box.length === 4 ? box : [40, 40 + idx * 30, 200, 22]) as [number, number, number, number],
          }));

          const record: InvoiceRecord = {
            id: doc.id,
            invoiceNumber: doc.invoice_number || 'SIN-FOLIO',
            issuerName: doc.vendor_name || 'Proveedor General',
            issuerTaxId: doc.vendor_tax_id || 'NIT Pendiente',
            customerName: doc.user_id ? 'Auditor / Cliente' : 'Empresa Cliente',
            customerTaxId: '900.123.456-1',
            issueDate: doc.issue_date || new Date().toISOString().split('T')[0],
            dueDate: doc.issue_date || new Date().toISOString().split('T')[0],
            currency: doc.currency || 'COP',
            subtotal: doc.subtotal || 0,
            taxRate: 0.19,
            taxAmount: doc.tax_total || 0,
            grandTotal: doc.grand_total || 0,
            lineItems: lineItems.length > 0 ? lineItems : baseInvoice.lineItems,
            fields: fields.length > 0 ? fields : baseInvoice.fields,
            auditState: mappedAuditState,
            deltaAmount: 0,
            auditMessage:
              mappedAuditState === 'ok'
                ? 'Extracción determinista y comprobación matemática 100% cuadrada.'
                : 'Se detectaron discrepancias que requieren revisión humana.',
          };

          setInvoice(record);
          setPdfUrl(`/api/v1/documents/${doc.id}/file`);
        }
      } catch (err: any) {
        showToast(`Error al cargar documento: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadDocumentData();
  }, [documentId]);

  async function handleSaveTemplate() {
    try {
      if (!invoice.issuerTaxId) {
        showToast('⚠️ No se puede guardar plantilla sin NIT del emisor.');
        return;
      }
      await documentsApi.saveVendorTemplate({
        vendor_tax_id: invoice.issuerTaxId,
        vendor_name: invoice.issuerName,
        spatial_anchors: {
          invoice_number: invoice.invoiceNumber,
          tax_rate: invoice.taxRate,
          subtotal: invoice.subtotal,
          fields_count: invoice.fields.length,
          deterministic_mode: true,
        },
      });
      showToast(`💾 Plantilla para "${invoice.issuerName}" guardada en base de datos con éxito.`);
    } catch (err: any) {
      showToast(`Error al guardar plantilla: ${err.message}`);
    }
  }

  async function handleApproveAndExport() {
    if (invoice.auditState === 'critical') return;
    try {
      setIsApproving(true);
      if (invoice.id && invoice.id !== 'inv-001') {
        await documentsApi.approveDocument(invoice.id);
        await documentsApi.exportToErp(invoice.id, 'generic');
      }
      showToast(`✅ Factura ${invoice.invoiceNumber} aprobada y exportada al ERP contable.`);
      setTimeout(() => {
        if (onBackToSite) onBackToSite();
        else navigate('/dashboard');
      }, 1200);
    } catch (err: any) {
      showToast(`Error al aprobar: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              if (onBackToSite) onBackToSite();
              else navigate('/dashboard');
            }}
            className="p-2 rounded-xl liquid-glass-card hover:bg-white/10 text-alabaster-200 border border-white/10 transition flex items-center space-x-1.5 text-xs"
          >
            <IconArrowLeft className="w-4 h-4 text-kono-silver" />
            <span>Volver a Facturas</span>
          </button>

          <div>
            <h1 className="text-base font-bold text-alabaster-100 flex items-center space-x-2">
              <span>Auditor Visor & Resumen</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 font-mono">
                {invoice.invoiceNumber}
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono">
              Comprobante: <strong className="text-zinc-200">{invoice.issuerName}</strong> • {invoice.issuerTaxId}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleApproveAndExport}
            disabled={isApproving || invoice.auditState === 'critical'}
            className="px-4 py-2 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition shadow flex items-center space-x-1.5 disabled:opacity-50"
          >
            {isApproving ? (
              <IconLoader2 className="w-4 h-4 text-titanium-950 animate-spin" />
            ) : (
              <IconCircleCheck className="w-4 h-4 text-titanium-950" />
            )}
            <span>Aprobar Comprobante</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 liquid-glass rounded-3xl border border-white/10">
          <IconLoader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-zinc-400 font-mono">Cargando PDF y datos extraídos del comprobante...</p>
        </div>
      ) : (
        /* Split Screen: Left: PDF Viewer | Right: Audit Summary & Extracted Data */
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0">
          {/* Left Panel: PDF Canvas */}
          <section className="h-full overflow-hidden">
            <DocumentViewer
              invoice={invoice}
              activeFieldKey={activeFieldKey}
              onSelectField={setActiveFieldKey}
              pdfUrl={pdfUrl}
            />
          </section>

          {/* Right Panel: Extracted Summary & Fields */}
          <section className="h-full overflow-y-auto">
            <AuditForm
              invoice={invoice}
              activeFieldKey={activeFieldKey}
              onSelectField={setActiveFieldKey}
              onUpdateInvoice={setInvoice}
              onSaveTemplate={handleSaveTemplate}
              onApproveAndExport={handleApproveAndExport}
            />
          </section>
        </main>
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}
