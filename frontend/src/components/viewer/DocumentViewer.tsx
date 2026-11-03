import React, { useState } from 'react';
import { FileText, Download, ExternalLink, Lock, KeyRound, Check } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';
import { documentsApi } from '../../services/documentsApi';

interface DocumentViewerProps {
  invoice: InvoiceRecord;
  activeFieldKey?: string | null;
  onSelectField?: (fieldKey: string) => void;
  pdfUrl?: string | null;
  onUnlocked?: () => void;
}

/** Left panel: Dedicated Original Document Viewer streaming authentic PDF / scanned binary file with Auto-Unlocker overlay. */
export function DocumentViewer({ invoice, pdfUrl, onUnlocked }: DocumentViewerProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const rawUrl = pdfUrl || (invoice?.id ? `/api/v1/documents/${invoice.id}/file` : null);
  // Disable all browser PDF chrome, sidebars, page thumbs and fit width seamlessly
  const cleanPdfUrl = rawUrl ? `${rawUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width` : null;

  const isPasswordProtected = invoice.auditMessage?.includes('contraseña') || invoice.auditState === 'critical' && !invoice.subtotal;

  const handleManualUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim() || !invoice.id) return;
    try {
      setIsUnlocking(true);
      setUnlockError(null);
      await documentsApi.unlockDocument(invoice.id, passwordInput.trim());
      if (onUnlocked) onUnlocked();
    } catch (err: any) {
      setUnlockError(err.message || 'Contraseña incorrecta');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 liquid-glass p-3 shadow-glass backdrop-blur-2xl">
      {/* Viewer Header */}
      <div className="mb-2.5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-zinc-300 backdrop-blur-md shrink-0">
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
      <div className="relative flex-1 w-full h-full overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl">
        {cleanPdfUrl ? (
          <iframe
            src={cleanPdfUrl}
            title={`Factura Original ${invoice.invoiceNumber || invoice.id}`}
            className="w-full h-full border-none rounded-xl bg-white block"
          />
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center text-zinc-500 text-xs">
            Cargando archivo original del comprobante...
          </div>
        )}

        {/* 🔓 Password Unlocker Fallback Overlay (if manual key is needed) */}
        {isPasswordProtected && (
          <div className="absolute inset-0 bg-titanium-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-alabaster-100">Factura Protegida con Contraseña</h3>
            <p className="text-xs text-zinc-400 max-w-xs mt-1 mb-4 leading-relaxed">
              El proveedor protegió este PDF. Kono intentó desbloquearlo automáticamente con NIT y fecha; ingresa la contraseña para abrirlo:
            </p>

            <form onSubmit={handleManualUnlock} className="w-full max-w-xs space-y-3">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="NIT del emisor, clave o cédula..."
                  className="w-full liquid-glass-input pl-9 pr-3 py-2 rounded-xl text-xs text-alabaster-100 font-mono"
                  autoFocus
                />
              </div>

              {unlockError && (
                <p className="text-[11px] text-rose-400 font-mono">{unlockError}</p>
              )}

              <button
                type="submit"
                disabled={isUnlocking || !passwordInput.trim()}
                className="w-full py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition shadow flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{isUnlocking ? 'Desbloqueando...' : 'Desbloquear & Extraer Factura'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
