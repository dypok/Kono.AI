import React, { useState } from 'react';
import { Navbar } from './components/navbar/Navbar';
import { PdfViewer } from './components/audit/PdfViewer';
import { InvoiceForm } from './components/audit/InvoiceForm';
import { DropzoneModal } from './components/dashboard/DropzoneModal';
import { InvoiceData, KonoStatus, AuditMetrics, BoundingBox } from './types/invoice';
import { CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';

// Mock high-fidelity dataset with precise BBox coordinates aligned with the rendered PDF document
const mockInvoiceGreen: InvoiceData = {
  id: 'INV-2026-8891',
  invoiceNumber: 'INV-2026-8891',
  issuerName: 'CLOUD SERVICES SAS',
  issuerNit: '900.123.456-1',
  customerName: 'ACME FINANCIAL CORP',
  customerNit: '800.987.654-3',
  issueDate: '15/08/2026',
  dueDate: '30/08/2026',
  currency: 'USD',
  subtotal: 1500.0,
  taxRate: 0.19,
  taxAmount: 285.0,
  grandTotal: 1785.0,
  items: [
    {
      id: 'it-1',
      description: 'Servidores Dedicados Cloud Enterprise (Nodo A)',
      quantity: 1,
      unitPrice: 1200.0,
      lineTotal: 1200.0,
      isVerified: true,
    },
    {
      id: 'it-2',
      description: 'Base de Datos Administrada PostgreSQL HA',
      quantity: 1,
      unitPrice: 300.0,
      lineTotal: 300.0,
      isVerified: true,
    },
  ],
  boundingBoxes: [
    {
      id: 'bb-inv-no',
      fieldKey: 'invoice_number',
      label: 'Factura N°',
      bbox: [415, 52, 595, 78],
      page: 1,
      confidence: 0.998,
      colorType: 'violet',
      value: 'INV-2026-8891',
    },
    {
      id: 'bb-issuer-name',
      fieldKey: 'issuer_name',
      label: 'Proveedor',
      bbox: [32, 28, 280, 56],
      page: 1,
      confidence: 0.995,
      colorType: 'amber',
      value: 'CLOUD SERVICES SAS',
    },
    {
      id: 'bb-issuer-nit',
      fieldKey: 'issuer_nit',
      label: 'NIT Emisor',
      bbox: [32, 56, 170, 75],
      page: 1,
      confidence: 0.999,
      colorType: 'amber',
      value: '900.123.456-1',
    },
    {
      id: 'bb-issue-date',
      fieldKey: 'issue_date',
      label: 'Fecha Emisión',
      bbox: [480, 84, 590, 102],
      page: 1,
      confidence: 0.994,
      colorType: 'violet',
      value: '15/08/2026',
    },
    {
      id: 'bb-due-date',
      fieldKey: 'due_date',
      label: 'Fecha Vencimiento',
      bbox: [500, 103, 590, 120],
      page: 1,
      confidence: 0.992,
      colorType: 'violet',
      value: '30/08/2026',
    },
    {
      id: 'bb-subtotal',
      fieldKey: 'subtotal',
      label: 'Subtotal',
      bbox: [485, 742, 590, 762],
      page: 1,
      confidence: 0.998,
      colorType: 'blue',
      value: '$1,500.00',
    },
    {
      id: 'bb-tax-amount',
      fieldKey: 'tax_amount',
      label: 'IVA (19%)',
      bbox: [485, 764, 590, 784],
      page: 1,
      confidence: 0.997,
      colorType: 'emerald',
      value: '$285.00',
    },
    {
      id: 'bb-grand-total',
      fieldKey: 'grand_total',
      label: 'Gran Total',
      bbox: [470, 792, 595, 818],
      page: 1,
      confidence: 0.999,
      colorType: 'blue',
      value: '$1,785.00',
    },
  ],
  status: 'green',
  mathDiscrepancy: 0.0,
  statusMessage: '¡Factura íntegra! Todo cuadra al centavo exacto. Lista para exportación contable en 1-Click.',
};

export default function App() {
  const [invoice, setInvoice] = useState<InvoiceData>(mockInvoiceGreen);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [isDropzoneOpen, setIsDropzoneOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<AuditMetrics>({
    processedToday: 482,
    zeroTokenRate: 95,
    tokenCost: 0.0,
    avgLatencyMs: 11.4,
    batchReadyCount: 482,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // State switcher demo for Kono mascot
  const handleStatusChange = (newStatus: KonoStatus) => {
    if (newStatus === 'green') {
      setInvoice({
        ...mockInvoiceGreen,
        status: 'green',
        mathDiscrepancy: 0.0,
        statusMessage: '¡Factura íntegra! Todo cuadra al centavo exacto. Lista para exportación contable en 1-Click.',
        duplicateWarning: undefined,
      });
      showToast('🟢 Modo Estado Verde activado: Auditoría 100% Cuadrada.');
    } else if (newStatus === 'yellow') {
      setInvoice({
        ...mockInvoiceGreen,
        status: 'yellow',
        mathDiscrepancy: 40.0,
        subtotal: 1540.0,
        statusMessage: 'Atención: Hay un descuadre aritmético de $40.00 en el Subtotal respecto a la suma de ítems.',
        duplicateWarning: undefined,
      });
      showToast('🟡 Modo Estado Amarillo activado: Descuadre detectado.');
    } else if (newStatus === 'red') {
      setInvoice({
        ...mockInvoiceGreen,
        status: 'red',
        mathDiscrepancy: 0.0,
        statusMessage: 'Alerta crítica: Comprobante duplicado identificado por Hash SHA-256 (Coincide con INV-2026-8891 anterior).',
        duplicateWarning: 'Duplicado SHA-256 Detectado',
      });
      showToast('🔴 Modo Estado Rojo activado: Bloqueo preventivo por duplicidad.');
    }
  };

  const handleSaveTemplate = () => {
    showToast(`💾 Plantilla para "${invoice.issuerName}" guardada en base de datos. Próximas facturas se procesarán en < 2ms.`);
  };

  const handleApproveAndExport = () => {
    if (invoice.status === 'red') return;
    setMetrics((prev) => ({
      ...prev,
      processedToday: prev.processedToday + 1,
      batchReadyCount: Math.max(0, prev.batchReadyCount - 1),
    }));
    showToast(`✅ Factura ${invoice.invoiceNumber} aprobada y exportada con éxito al sistema contable ERP.`);
  };

  const handleFilesUploaded = (count: number) => {
    setMetrics((prev) => ({
      ...prev,
      processedToday: prev.processedToday + count,
      batchReadyCount: prev.batchReadyCount + count,
    }));
    showToast(`📥 ${count} facturas recibidas e indexadas por el Core de Rust con triage instantáneo.`);
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30 overflow-hidden font-sans">
      
      {/* Background Ambient Glowing Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-indigo-950/40 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-cyan-950/30 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-emerald-950/20 rounded-full blur-[160px]" />
      </div>

      {/* Floating Top Navigation & Live Metrics Bar */}
      <Navbar
        metrics={metrics}
        currentStatus={invoice.status}
        onStatusChange={handleStatusChange}
        onOpenDropzone={() => setIsDropzoneOpen(true)}
        onBatchApprove={() => {
          showToast(`⚡ 1-Click Batch Approval completado: ${metrics.batchReadyCount} facturas aprobadas.`);
          setMetrics((prev) => ({ ...prev, batchReadyCount: 0 }));
        }}
      />

      {/* Main Workspace (50/50 Split-Screen Containers) */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 pb-4 max-w-[1720px] mx-auto w-full h-[calc(100vh-88px)]">
        
        {/* Left Panel: Frosted Glass PDF / Image Auditor Viewer (50% Width) */}
        <section className="h-full">
          <PdfViewer
            invoice={invoice}
            activeFieldKey={activeFieldKey}
            onSelectField={(key) => setActiveFieldKey(key)}
          />
        </section>

        {/* Right Panel: Structured Financial Audit Form & Items Table (50% Width) */}
        <section className="h-full">
          <InvoiceForm
            invoice={invoice}
            activeFieldKey={activeFieldKey}
            onSelectField={(key) => setActiveFieldKey(key)}
            onUpdateInvoice={(upd) => setInvoice(upd)}
            onSaveTemplate={handleSaveTemplate}
            onApproveAndExport={handleApproveAndExport}
          />
        </section>

      </main>

      {/* Dropzone Upload Modal */}
      <DropzoneModal
        isOpen={isDropzoneOpen}
        onClose={() => setIsDropzoneOpen(false)}
        onFilesUploaded={handleFilesUploaded}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/20 shadow-2xl text-xs font-medium text-white animate-in slide-in-from-bottom-5 duration-200">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
