import { FileText, Download, ExternalLink } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';

interface DocumentViewerProps {
  invoice: InvoiceRecord;
  activeFieldKey?: string | null;
  onSelectField?: (fieldKey: string) => void;
  pdfUrl?: string | null;
}

/** Left panel: Dedicated Original Document Viewer streaming authentic PDF / scanned binary file. */
export function DocumentViewer({ invoice, pdfUrl }: DocumentViewerProps) {
  const currentPdfUrl = pdfUrl || (invoice?.id ? `/api/v1/documents/${invoice.id}/file` : null);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 liquid-glass p-4 shadow-glass backdrop-blur-2xl">
      {/* Viewer Header with Direct Actions */}
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-zinc-300 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-kono-silver" />
          <span className="font-semibold text-alabaster-100">Factura Original (Archivo Fuente)</span>
          {invoice.invoiceNumber && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {invoice.invoiceNumber}
            </span>
          )}
        </div>

        {currentPdfUrl && (
          <div className="flex items-center space-x-2">
            <a
              href={currentPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-medium text-alabaster-100 border border-white/15 transition flex items-center space-x-1.5 shadow-sm"
              title="Abrir factura en pestaña completa"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ver Factura Completa</span>
            </a>
            <a
              href={currentPdfUrl}
              download={invoice.invoiceNumber ? `factura_${invoice.invoiceNumber}.pdf` : 'factura.pdf'}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition"
              title="Descargar archivo original"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Main Authentic PDF Stream View */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/5 bg-titanium-950/90 shadow-2xl flex items-center justify-center">
        {currentPdfUrl ? (
          <iframe
            src={`${currentPdfUrl}#toolbar=1&navpanes=0`}
            title={`Factura Original ${invoice.invoiceNumber || invoice.id}`}
            className="w-full h-full min-h-[650px] border-none rounded-2xl bg-titanium-950"
          />
        ) : (
          <div className="p-8 text-center text-zinc-400 text-xs">
            Cargando archivo original del comprobante...
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="mt-3 flex items-center justify-between border-t border-white/5 px-2 pt-3 text-[11px] text-zinc-400">
        <span className="font-mono text-zinc-400 truncate max-w-xs">
          Emisor: {invoice.issuerName} ({invoice.issuerTaxId})
        </span>
        <span className="font-mono text-[10px] text-emerald-400 shrink-0">
          ✓ Archivo original indexado por SHA-256
        </span>
      </div>
    </div>
  );
}
