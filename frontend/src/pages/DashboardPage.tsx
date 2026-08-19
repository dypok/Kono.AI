import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconFileText,
  IconCircleCheck,
  IconAlertTriangle,
  IconCircleX,
  IconSearch,
  IconUpload,
  IconLoader2,
  IconInbox,
  IconCheck,
} from '@tabler/icons-react';
import { documentsApi, DocumentListItem } from '../services/documentsApi';
import { useAuthStore } from '../store/authStore';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, green: 0, yellow: 0, red: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isApprovingBulk, setIsApprovingBulk] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await documentsApi.listDocuments({
        kono_state: activeTab === 'all' ? undefined : activeTab,
        q: searchQuery.trim() || undefined,
      });
      setDocuments(res.items || []);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (err) {
      console.error('Error fetching real documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeTab, searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const file = files[0];
      await documentsApi.uploadDocument(file);
      setUploadSuccessMsg(`Comprobante "${file.name}" cargado y procesado.`);
      setTimeout(() => setUploadSuccessMsg(null), 4000);
      fetchDocuments();
    } catch (err: any) {
      alert(`Error al subir: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBulkApprove = async () => {
    try {
      setIsApprovingBulk(true);
      const res = await documentsApi.bulkApprove();
      alert(res.message);
      fetchDocuments();
    } catch (err: any) {
      alert(`Error al aprobar: ${err.message}`);
    } finally {
      setIsApprovingBulk(false);
    }
  };

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
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-alabaster-100">Bandeja de Auditoría Financiera</h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
              Motor Activo
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Comprobantes de {user?.email || 'tu cuenta'} auditados en tiempo real con motor determinista y Supabase.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl liquid-glass-card hover:bg-white/5 border border-white/10 text-xs text-alabaster-200 flex items-center space-x-2 transition disabled:opacity-50"
          >
            {isUploading ? (
              <IconLoader2 className="w-4 h-4 text-kono-silver animate-spin" />
            ) : (
              <IconUpload className="w-4 h-4 text-kono-silver" />
            )}
            <span>{isUploading ? 'Subiendo...' : 'Cargar Comprobante'}</span>
          </button>

          <button
            onClick={handleBulkApprove}
            disabled={isApprovingBulk || counts.all === 0}
            className="px-4 py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition shadow flex items-center space-x-2 disabled:opacity-40"
          >
            {isApprovingBulk ? (
              <IconLoader2 className="w-4 h-4 text-titanium-950 animate-spin" />
            ) : (
              <IconCircleCheck className="w-4 h-4 text-titanium-950" />
            )}
            <span>Aprobar Todo ({counts.all})</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {uploadSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
          <IconCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{uploadSuccessMsg}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* State Filter Pills with dynamic counts */}
        <div className="flex items-center space-x-2 p-1.5 liquid-glass-card rounded-2xl border border-white/5 w-full sm:w-auto">
          {[
            { id: 'all', label: `Todas las Facturas (${counts.all})` },
            { id: 'green', label: `🟢 Exactas (${counts.green})` },
            { id: 'yellow', label: `🟡 Alertas (${counts.yellow})` },
            { id: 'red', label: `🔴 Duplicadas (${counts.red})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                activeTab === tab.id
                  ? 'bg-white/10 text-alabaster-50 border border-white/15'
                  : 'text-zinc-400 hover:text-alabaster-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <IconSearch className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por NIT, emisor o folio..."
            className="w-full liquid-glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Structured Invoices Datagrid Table */}
      <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <IconLoader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-zinc-400 font-mono">Consultando facturas de la base de datos...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
              <IconInbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-alabaster-100">No hay facturas procesadas aún</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Sube tus comprobantes en PDF o imagen para procesarlos inmediatamente con extracción determinista, o vincula tu bandeja de Gmail en Configuración.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-alabaster-100 transition shadow flex items-center space-x-2"
            >
              <IconUpload className="w-4 h-4 text-kono-silver" />
              <span>Cargar primer PDF / Comprobante</span>
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                <th className="py-3.5 px-6">Comprobante</th>
                <th className="py-3.5 px-6">Emisor & NIT</th>
                <th className="py-3.5 px-6">Fecha</th>
                <th className="py-3.5 px-6">Total Extraído</th>
                <th className="py-3.5 px-6">Estado & Diagnóstico</th>
                <th className="py-3.5 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-alabaster-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/[0.03] transition duration-150 group">
                  <td className="py-4 px-6 font-mono font-medium text-alabaster-100 flex items-center space-x-2.5">
                    <IconFileText className="w-4 h-4 text-kono-silver group-hover:text-white transition" />
                    <span>{doc.invoice_number || doc.file_name || 'DOC-PENDING'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-medium text-alabaster-100">{doc.vendor_name || 'Proveedor General'}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{doc.vendor_tax_id || 'NIT Pendiente'}</p>
                  </td>
                  <td className="py-4 px-6 font-mono text-zinc-300">
                    {formatDate(doc.issue_date || doc.created_at)}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-alabaster-100">
                    {formatCurrency(doc.grand_total, doc.currency)}
                  </td>
                  <td className="py-4 px-6">
                    {doc.kono_state === 'GREEN' && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
                        <IconCircleCheck className="w-3.5 h-3.5" />
                        <span>100% Auditada y Cuadrada</span>
                      </span>
                    )}
                    {doc.kono_state === 'YELLOW' && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px]">
                        <IconAlertTriangle className="w-3.5 h-3.5" />
                        <span>Revisión Pendiente</span>
                      </span>
                    )}
                    {doc.kono_state === 'RED' && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
                        <IconCircleX className="w-3.5 h-3.5" />
                        <span>Alerta de Descuadre / Duplicado</span>
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => navigate('/audit')}
                      className="px-3 py-1 rounded-lg liquid-glass-card hover:bg-white/10 text-alabaster-100 text-xs transition border border-white/10"
                    >
                      Auditar Visor
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
