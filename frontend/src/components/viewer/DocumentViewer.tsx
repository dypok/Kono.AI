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
  const rawUrl = pdfUrl || (invoice?.id ? `/api/v1/documents/${invoice.id}/file` : null);
  // Disable all browser PDF chrome, sidebars, page thumbs and fit width seamlessly
  const cleanPdfUrl = rawUrl ? `${rawUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width` : null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 liquid-glass p-3 shadow-glass backdrop-blur-2xl">
      {/* Viewer Header */}
      <div className="mb-2.5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-zinc-300 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-kono-silver shrink-0" />
          <span className="font-semibold text-alabaster-100 text-xs">Comprobante Fuente</span>
        </div>

        {rawUrl && (
          <div className="flex items-center space-x-2">
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-alabaster-100 border border-white/15 transition flex items-center space-x-1.5 shadow-sm"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pantalla Completa</span>
            </a>
            <a
              href={rawUrl}
              download={invoice.invoiceNumber ? `factura_${invoice.invoiceNumber}.pdf` : 'factura.pdf'}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition"
              title="Descargar archivo"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Main Authentic PDF Stream View - Clean 100% full coverage */}
      <div className="relative flex-1 w-full h-full overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
        {cleanPdfUrl ? (
          <iframe
            src={cleanPdfUrl}
            title={`Factura Original ${invoice.invoiceNumber || invoice.id}`}
            className="w-full h-full border-none rounded-2xl bg-white block"
          />
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center text-zinc-500 text-xs">
            Cargando archivo original del comprobante...
          </div>
        )}
      </div>
    </div>
  );
}
