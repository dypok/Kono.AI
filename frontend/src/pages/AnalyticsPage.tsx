import React, { useState, useEffect } from 'react';
import { 
  Download, 
  TrendingUp, 
  DollarSign, 
  Cpu, 
  CheckCircle2, 
  Building2, 
  Send, 
  Loader2, 
  FileSpreadsheet, 
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { documentsApi } from '../services/documentsApi';
import { KonoCyclingLoader } from '../components/common/KonoCyclingLoader';

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | null>(null);
  const [selectedErp, setSelectedErp] = useState<'siigo' | 'alegra' | 'sap' | 'generic'>('siigo');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const data = await documentsApi.getReconciliationSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching reconciliation summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleDownload = async (format: 'csv' | 'json') => {
    try {
      setExportFormat(format);
      setIsExporting(true);
      await documentsApi.downloadExport(format);
    } catch (err) {
      console.error('Error downloading export:', err);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const handleSingleErpExport = async (docId: string, invoiceNumber: string) => {
    try {
      setExportingId(docId);
      const res = await documentsApi.exportToErp(docId, selectedErp);
      setExportSuccessMsg(`Asiento de ${invoiceNumber} sincronizado con ${selectedErp.toUpperCase()}`);
      await fetchSummary();
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error exporting to ERP:', err);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-alabaster-100 flex items-center space-x-2">
            <span>Conciliación & Conectores ERP</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Postgres
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Reportes contables sincronizados y listos para exportar a Siigo, Alegra, SAP y Excel.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleDownload('csv')}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl liquid-glass-card hover:bg-white/5 border border-white/10 text-xs text-alabaster-200 flex items-center space-x-2 transition disabled:opacity-50"
          >
            {isExporting && exportFormat === 'csv' ? (
              <Loader2 className="w-4 h-4 animate-spin text-kono-silver" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-kono-silver" />
            )}
            <span>Exportar CSV (Excel)</span>
          </button>

          <button
            onClick={() => handleDownload('json')}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-alabaster-100 text-titanium-950 font-semibold text-xs hover:bg-white transition flex items-center space-x-2 shadow disabled:opacity-50"
          >
            {isExporting && exportFormat === 'json' ? (
              <Loader2 className="w-4 h-4 animate-spin text-titanium-950" />
            ) : (
              <Download className="w-4 h-4 text-titanium-950" />
            )}
            <span>Exportar Asientos JSON</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {exportSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="liquid-glass rounded-3xl p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Facturado Conciliado</span>
            <DollarSign className="w-4 h-4 text-kono-silver" />
          </div>
          <p className="text-2xl font-bold text-alabaster-100 font-mono mt-2">
            ${(summary?.total_invoiced || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 text-xs text-zinc-400 flex items-center justify-between font-mono">
            <span>Base: ${(summary?.total_subtotal || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            <span>IVA: ${(summary?.total_tax || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div className="liquid-glass rounded-3xl p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Ahorro en Tokens IA (Cero-Costo)</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-2">
            ${summary?.token_savings_usd || '0.00'} USD
          </p>
          <p className="text-xs text-zinc-400 mt-2 font-mono flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
            <span>{summary?.zero_token_percentage || 100}% procesado determinísticamente</span>
          </p>
        </div>

        <div className="liquid-glass rounded-3xl p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Tasa de Aprobación & Exportación</span>
            <TrendingUp className="w-4 h-4 text-kono-gold" />
          </div>
          <p className="text-2xl font-bold text-alabaster-100 font-mono mt-2">
            {summary?.approval_rate || 100}%
          </p>
          <p className="text-xs text-zinc-400 mt-2 font-mono">
            {summary?.exported_count || 0} de {summary?.total_count || 0} comprobantes sincronizados
          </p>
        </div>
      </div>

      {/* ERP Target Selector & Reconciliation Datagrid */}
      <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-alabaster-100">Bandeja de Sincronización ERP</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Envía asientos contables estructurados directamente al software contable de destino.
            </p>
          </div>

          {/* ERP Selector Tabs */}
          <div className="flex items-center space-x-2 p-1.5 liquid-glass-card rounded-2xl border border-white/5">
            {[
              { id: 'siigo', label: 'Siigo Cloud' },
              { id: 'alegra', label: 'Alegra' },
              { id: 'sap', label: 'SAP B1' },
              { id: 'generic', label: 'JSON Estándar' },
            ].map((erp) => (
              <button
                key={erp.id}
                onClick={() => setSelectedErp(erp.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  selectedErp === erp.id
                    ? 'bg-white/10 text-alabaster-50 border border-white/15'
                    : 'text-zinc-400 hover:text-alabaster-200'
                }`}
              >
                {erp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Reconciled Invoices Table */}
        {isLoading ? (
          <KonoCyclingLoader 
            message="Calculando balances y asientos contables en PostgreSQL..." 
            size="md" 
          />
        ) : !summary?.reconciled_items || summary.reconciled_items.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-xs">
            No hay comprobantes pendientes por sincronizar en la base de datos.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4">Tercero / Proveedor</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Estado ERP</th>
                <th className="py-3 px-4 text-right">Integración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-alabaster-200">
              {summary.reconciled_items.map((item: any) => (
                <tr key={item.id} className="hover:bg-white/[0.03] transition group">
                  <td className="py-3.5 px-4 font-mono font-medium text-alabaster-100">
                    {item.invoice_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-alabaster-100">{item.vendor_name}</div>
                    <div className="text-[11px] text-zinc-400 font-mono">{item.vendor_tax_id}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-400">{item.issue_date || '—'}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-alabaster-100">
                    ${(item.grand_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${
                      item.processing_status === 'EXPORTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {item.processing_status === 'EXPORTED' ? 'Sincronizado' : 'Listo para exportar'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleSingleErpExport(item.id, item.invoice_number)}
                      disabled={exportingId === item.id}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-alabaster-100 transition shadow inline-flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {exportingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>Enviar a {selectedErp.toUpperCase()}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
