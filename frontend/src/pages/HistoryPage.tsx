import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconHistory,
  IconSearch,
  IconExternalLink,
  IconCheck,
  IconBuildingSkyscraper,
  IconDownload,
  IconFileText,
  IconArrowRight,
  IconInbox,
} from '@tabler/icons-react';
import { documentsApi, DocumentListItem } from '../services/documentsApi';
import { KonoCyclingLoader } from '../components/common/KonoCyclingLoader';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedErp, setSelectedErp] = useState<string>('all');

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const res = await documentsApi.listDocuments({
        scope: 'history',
        q: searchQuery.trim() || undefined,
      });
      setDocuments(res.items || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [searchQuery]);

  const formatCurrency = (val?: number, currency = 'COP') => {
    if (val === undefined || val === null) return '$0.00';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const totalExportedAmount = documents.reduce((sum, doc) => sum + (doc.grand_total || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Summary Banner */}
      <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-alabaster-100 flex items-center space-x-2">
              <IconHistory className="w-6 h-6 text-cyan-400" />
              <span>Historial de Facturas &amp; Asientos ERP</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
              Sincronizado
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Registro inmutable de comprobantes aprobados, contabilizados y exportados al ERP contable.
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex items-center space-x-4 shrink-0 font-mono">
          <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-right">
            <span className="text-[10px] text-zinc-400 block uppercase">Total Exportado</span>
            <span className="text-sm font-bold text-emerald-400">{formatCurrency(totalExportedAmount)}</span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-right">
            <span className="text-[10px] text-zinc-400 block uppercase">Comprobantes</span>
            <span className="text-sm font-bold text-alabaster-100">{documents.length}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por NIT, folio, proveedor o nombre de archivo..."
            className="w-full liquid-glass-input pl-10 pr-4 py-2.5 rounded-2xl text-xs text-alabaster-100 placeholder:text-zinc-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition flex items-center space-x-1.5"
          >
            <IconInbox className="w-4 h-4 text-zinc-400" />
            <span>Ir a Bandeja Activa</span>
          </button>
        </div>
      </div>

      {/* Main Content Table / Empty State */}
      <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="py-20">
            <KonoCyclingLoader message="Consultando histórico contable..." size="md" />
          </div>
        ) : documents.length === 0 ? (
          <div className="py-20 text-center space-y-4 p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mx-auto">
              <IconHistory className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-alabaster-100">No hay facturas en el historial</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Las facturas que apruebes en el Visor de Auditoría con el botón &quot;Aprobar &amp; Exportar ERP&quot; se archivarán aquí automáticamente para su trazabilidad y descarga contable.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-2 px-5 py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition shadow inline-flex items-center space-x-2"
            >
              <span>Ir a Auditar Facturas</span>
              <IconArrowRight className="w-4 h-4 text-titanium-950" />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6 font-semibold">Folio / Documento</th>
                  <th className="py-3.5 px-6 font-semibold">Proveedor &amp; NIT</th>
                  <th className="py-3.5 px-6 font-semibold">Fecha Emisión</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Total Facturado</th>
                  <th className="py-3.5 px-6 font-semibold text-center">Estado ERP</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <IconFileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-alabaster-100 block">
                            {doc.invoice_number || 'SIN-FOLIO'}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono truncate max-w-[160px] block">
                            {doc.file_name?.split('/').pop() || doc.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div>
                        <span className="text-alabaster-100 font-medium block">
                          {doc.vendor_name || 'Proveedor Registrado'}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          NIT: {doc.vendor_tax_id || '900.000.000-0'}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono text-zinc-400">
                      {doc.issue_date || '—'}
                    </td>

                    <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(doc.grand_total, doc.currency)}
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
                        <IconCheck className="w-3.5 h-3.5" />
                        <span>Exportado ERP</span>
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/audit/${doc.id}`)}
                          className="px-3 py-1.5 rounded-xl liquid-glass-card hover:bg-white/10 text-alabaster-100 text-xs transition border border-white/10 font-medium shadow-sm flex items-center space-x-1"
                        >
                          <IconExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Ver Auditoría</span>
                        </button>
                        <a
                          href={`/api/v1/documents/${doc.id}/file`}
                          download={doc.invoice_number ? `factura_${doc.invoice_number}.pdf` : 'factura.pdf'}
                          className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white border border-transparent hover:border-white/10 transition"
                          title="Descargar PDF original"
                        >
                          <IconDownload className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
