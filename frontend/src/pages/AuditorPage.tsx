import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import { TopNavbar } from '../components/layout/TopNavbar';
import { Toast } from '../components/layout/Toast';
import { DocumentViewer } from '../components/viewer/DocumentViewer';
import { AuditForm } from '../components/audit/AuditForm';
import { UploadDropzoneModal } from '../components/upload/UploadDropzoneModal';
import { useToast } from '../hooks/useToast';
import { applyDemoState, baseInvoice, initialMetrics } from '../lib/mockData';
import { AuditState, InvoiceRecord } from '../types/invoice';

interface AuditorPageProps {
  onBackToSite: () => void;
}

/** Live split-screen invoice auditor: document canvas + structured audit form. */
export function AuditorPage({ onBackToSite }: AuditorPageProps) {
  const [invoice, setInvoice] = useState<InvoiceRecord>(baseInvoice);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [metrics, setMetrics] = useState(initialMetrics);
  const { message: toastMessage, showToast } = useToast();

  function handleDemoStateChange(state: AuditState) {
    setInvoice(applyDemoState(state));
    const labels: Record<AuditState, string> = {
      ok: '🟢 Green state active: fully reconciled invoice.',
      warning: '🟡 Yellow state active: arithmetic mismatch detected.',
      critical: '🔴 Red state active: duplicate invoice blocked.',
    };
    showToast(labels[state]);
  }

  function handleSaveTemplate() {
    showToast(`💾 Vendor template saved for "${invoice.issuerName}". Future invoices process in < 2ms.`);
  }

  function handleApproveAndExport() {
    if (invoice.auditState === 'critical') return;
    setMetrics((prev) => ({
      ...prev,
      invoicesToday: prev.invoicesToday + 1,
      batchReadyCount: Math.max(0, prev.batchReadyCount - 1),
    }));
    showToast(`✅ Invoice ${invoice.invoiceNumber} approved and exported to ERP.`);
  }

  function handleFilesUploaded(count: number) {
    setMetrics((prev) => ({
      ...prev,
      invoicesToday: prev.invoicesToday + count,
      batchReadyCount: prev.batchReadyCount + count,
    }));
    showToast(`📥 ${count} invoices received and indexed with instant deterministic triage.`);
  }

  function handleBatchApprove() {
    showToast(`⚡ 1-Click batch approval complete: ${metrics.batchReadyCount} invoices approved.`);
    setMetrics((prev) => ({ ...prev, batchReadyCount: 0 }));
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#080B11] font-sans text-slate-100 selection:bg-cyan-500/30">
      <AmbientBackground />

      <div className="relative z-10 mx-4 mt-3">
        <button
          type="button"
          onClick={onBackToSite}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md transition-all hover:bg-white/[0.08]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to site</span>
        </button>
      </div>

      <TopNavbar
        metrics={metrics}
        auditState={invoice.auditState}
        onDemoStateChange={handleDemoStateChange}
        onOpenUpload={() => setIsUploadOpen(true)}
        onBatchApprove={handleBatchApprove}
      />

      <main className="relative z-10 mx-auto grid h-[calc(100vh-128px)] w-full max-w-[1720px] flex-1 grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-2">
        <section className="h-full">
          <DocumentViewer invoice={invoice} activeFieldKey={activeFieldKey} onSelectField={setActiveFieldKey} />
        </section>

        <section className="h-full">
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

      <UploadDropzoneModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onFilesUploaded={handleFilesUploaded} />

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}
