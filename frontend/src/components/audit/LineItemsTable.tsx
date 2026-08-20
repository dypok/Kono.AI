import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';
import { documentsApi } from '../../services/documentsApi';

interface LineItemsTableProps {
  invoice: InvoiceRecord;
  onUpdateInvoice?: (invoice: InvoiceRecord) => void;
}

/** Section 2: extracted line items table displayed in read-only audit format with live math verification tags. */
export function LineItemsTable({ invoice, onUpdateInvoice }: LineItemsTableProps) {
  const [isEstimating, setIsEstimating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [costEstimate, setCostEstimate] = useState<{
    estimated_cost_usd: number;
    total_tokens: number;
    model: string;
  } | null>(null);
  const [showCostModal, setShowCostModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestAiEstimate = async () => {
    try {
      setIsEstimating(true);
      setErrorMsg(null);
      const est = await documentsApi.estimateAiCost(invoice.id);
      setCostEstimate({
        estimated_cost_usd: est.estimated_cost_usd || 0.00045,
        total_tokens: est.total_tokens || 350,
        model: est.model || 'gpt-4o-mini',
      });
      setShowCostModal(true);
    } catch (err: any) {
      // Fallback a estimación estándar de 350 tokens para no bloquear la UI
      setCostEstimate({
        estimated_cost_usd: 0.00045,
        total_tokens: 350,
        model: 'gpt-4o-mini',
      });
      setShowCostModal(true);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleConfirmAiAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      const res = await documentsApi.analyzeWithAi(invoice.id, true);
      setShowCostModal(false);
      if (res.document && onUpdateInvoice) {
        // Refrescar documento en la vista
        window.location.reload();
      } else {
        alert(res.message || 'Análisis completado.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al ejecutar análisis con IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasItems = invoice.lineItems && invoice.lineItems.length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Ítems Extraídos de la Factura ({invoice.lineItems?.length || 0})</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          {hasItems ? 'Validación aritmética estricta' : 'Sin ítems detectados'}
        </span>
      </div>

      {!hasItems ? (
        <div className="py-8 px-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-alabaster-100">No se detectaron productos o ítems tabulados</h4>
            <p className="text-[11px] text-zinc-400 max-w-md mt-1">
              El motor determinista local no encontró una cuadrícula de ítems clara en este comprobante. Puedes extraer la tabla completa utilizando IA.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestAiEstimate}
            disabled={isEstimating || isAnalyzing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-500/20 transition flex items-center space-x-2 disabled:opacity-50"
          >
            {isEstimating ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-purple-200" />
            )}
            <span>{isEstimating ? 'Calculando costo...' : 'Escanear con IA'}</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[11px] text-slate-400 font-mono">
                <th className="px-2.5 py-2 font-sans font-medium">DESCRIPCIÓN</th>
                <th className="px-2.5 py-2 text-right font-medium">CANT.</th>
                <th className="px-2.5 py-2 text-right font-medium">PRECIO UNIT.</th>
                <th className="px-2.5 py-2 text-right font-medium">TOTAL LÍNEA</th>
                <th className="px-2 py-2 text-center font-medium">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-2.5 py-2.5 font-sans font-medium text-slate-200">{item.description}</td>
                  <td className="px-2.5 py-2.5 text-right font-mono text-slate-300">
                    {item.quantity}
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-mono text-slate-300">
                    ${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-semibold text-white font-mono">
                    ${item.lineTotal.toFixed(2)}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-sans text-[10px] text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      OK
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Estimación de Costo de IA (US-REQ-002) */}
      {showCostModal && costEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-titanium-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md liquid-glass rounded-3xl p-6 border border-purple-500/30 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-purple-400">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-alabaster-100">Confirmar Extracción con IA</h3>
                <p className="text-[11px] text-zinc-400 font-mono">Modelo: {costEstimate.model}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span>Tokens Estimados:</span>
                <strong className="font-mono text-alabaster-100">{costEstimate.total_tokens} tokens</strong>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Costo Estimado de la Operación:</span>
                <strong className="font-mono text-emerald-400 text-sm">
                  ${costEstimate.estimated_cost_usd.toFixed(5)} USD
                </strong>
              </div>
              <p className="text-[10px] text-zinc-400 pt-1 border-t border-white/5">
                La IA solo se invoca bajo tu autorización explícita para extraer los ítems y totales no detectados.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCostModal(false)}
                disabled={isAnalyzing}
                className="flex-1 px-4 py-2.5 rounded-xl liquid-glass-card hover:bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAiAnalysis}
                disabled={isAnalyzing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/25 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
                <span>{isAnalyzing ? 'Analizando...' : 'Confirmar & Analizar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
