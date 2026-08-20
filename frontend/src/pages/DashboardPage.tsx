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
  IconTrash,
} from '@tabler/icons-react';
import { documentsApi, DocumentListItem } from '../services/documentsApi';
import { useAuthStore } from '../store/authStore';
import { KonoCyclingLoader } from '../components/common/KonoCyclingLoader';
import { DeleteConfirmationModal } from '../components/common/DeleteConfirmationModal';

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
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await documentsApi.listDocuments({
        scope: 'inbox',
        kono_state: activeTab === 'all' ? undefined : activeTab,
        q: searchQuery.trim() || undefined,
        year: selectedYear === 'all' ? undefined : parseInt(selectedYear, 10),
        page: currentPage,
        pageSize: pageSize,
      });
      setDocuments(res.items || []);
      setTotalPages(res.total_pages || 1);
      setCounts(res.counts || { all: 0, green: 0, yellow: 0, red: 0 });
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDocuments();
    }, 250); // Debounce de 250ms para búsqueda rápida y fluida
    return () => clearTimeout(handler);
  }, [activeTab, searchQuery, selectedYear, currentPage]);

  const handleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);

    // ⚡ Optimistic UI Update: remover los elementos seleccionados inmediatamente (0ms)
    setShowBulkDeleteModal(false);
    setSelectedIds(new Set());
    setDocuments((prev) => prev.filter((d) => !idsToDelete.includes(d.id)));
    setCounts((prev) => ({
      ...prev,
      all: Math.max(0, prev.all - idsToDelete.length),
    }));
    setToastMsg(`🗑️ Eliminando ${idsToDelete.length} comprobantes...`);
    setTimeout(() => setToastMsg(null), 3000);

    setDeletingIds((prev) => new Set([...prev, ...idsToDelete]));
    try {
      setIsBulkDeleting(true);
      await documentsApi.bulkDeleteDocuments(idsToDelete);
      setToastMsg(`✅ ${idsToDelete.length} comprobantes eliminados con éxito.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      alert(`Error en eliminación masiva: ${err.message}`);
      fetchDocuments();
    } finally {
      setIsBulkDeleting(false);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      setUploadSuccessMsg(null);
      const fileList = Array.from(files);
      if (fileList.length === 1) {
        const res = await documentsApi.uploadDocument(fileList[0]);
        setUploadSuccessMsg(`Comprobante ${res.invoice_number || fileList[0].name} extraído y procesado con éxito.`);
      } else {
        const res = await documentsApi.batchUploadDocuments(fileList);
        setUploadSuccessMsg(`Lote procesado: ${res.processed_count || fileList.length} facturas extraídas exitosamente.`);
      }
      fetchDocuments();
      setTimeout(() => setUploadSuccessMsg(null), 4500);
    } catch (err: any) {
      alert(`Error al procesar lote: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    const toDeleteId = docToDelete.id;

    // ⚡ Optimistic UI: Cierra el modal de inmediato y remueve de la vista en 0ms
    setDocToDelete(null);
    setDocuments((prev) => prev.filter((d) => d.id !== toDeleteId));
    setCounts((prev) => ({
      ...prev,
      all: Math.max(0, prev.all - 1),
    }));

    setDeletingIds((prev) => new Set(prev).add(toDeleteId));
    try {
      await documentsApi.deleteDocument(toDeleteId);
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
      fetchDocuments();
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(toDeleteId);
        return next;
      });
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
      {/* Hidden File Input (Multiple files) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.png,.jpg,.jpeg"
        multiple
        className="hidden"
      />

      {/* Hidden Folder Input (Directory scan) */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFileUpload}
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
      />

      {/* Header Banner */}
      <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-alabaster-100">Bandeja de Auditoría Financiera</h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
              Bandeja Activa
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Comprobantes de {user?.email || 'tu cuenta'} pendientes de revisión y exportación contable.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => navigate('/history')}
            className="px-4 py-2.5 rounded-xl liquid-glass-card hover:bg-white/5 border border-white/10 text-xs text-alabaster-200 flex items-center space-x-2 transition"
            title="Ver facturas aprobadas y asientos contables exportados"
          >
            <IconFileText className="w-4 h-4 text-emerald-400" />
            <span>Ver Historial ERP</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl liquid-glass-card hover:bg-white/5 border border-white/10 text-xs text-alabaster-200 flex items-center space-x-2 transition disabled:opacity-50"
            title="Sube uno o varios archivos PDF"
          >
            {isUploading ? (
              <IconLoader2 className="w-4 h-4 text-kono-silver animate-spin" />
            ) : (
              <IconUpload className="w-4 h-4 text-kono-silver" />
            )}
            <span>{isUploading ? 'Subiendo...' : 'Cargar Comprobantes'}</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs flex items-center space-x-2 transition shadow disabled:opacity-50"
            title="Escanea una carpeta completa con facturas"
          >
            <IconInbox className="w-4 h-4 text-titanium-950" />
            <span>Escanear Carpeta</span>
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

      {/* Year Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* State Filter Pills with dynamic counts */}
        <div className="flex items-center space-x-2 p-1.5 liquid-glass-card rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `Todas (${counts.all})` },
            { id: 'green', label: `🟢 Exactas (${counts.green})` },
            { id: 'yellow', label: `🟡 Alertas (${counts.yellow})` },
            { id: 'red', label: `🔴 Duplicadas (${counts.red})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white/10 text-alabaster-50 border border-white/15'
                  : 'text-zinc-400 hover:text-alabaster-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Year Filter & Search Input */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Year Filter Selector */}
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setCurrentPage(1);
            }}
            className="liquid-glass-input px-3 py-2 rounded-xl text-xs text-alabaster-200 bg-titanium-950/80 border border-white/10"
            title="Filtrar por año contable"
          >
            <option value="all" className="bg-titanium-900 text-white">Todos los Años</option>
            <option value="2026" className="bg-titanium-900 text-white">Año 2026</option>
            <option value="2025" className="bg-titanium-900 text-white">Año 2025</option>
            <option value="2024" className="bg-titanium-900 text-white">Año 2024</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <IconSearch className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por NIT, emisor..."
              className="w-full liquid-glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Floating Multi-Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="p-3 px-5 rounded-2xl bg-titanium-900/90 border border-rose-500/30 flex items-center justify-between shadow-2xl backdrop-blur-md animate-fade-in">
          <div className="flex items-center space-x-3 text-xs text-alabaster-100">
            <span className="font-semibold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono">
              {selectedIds.size} seleccionada(s)
            </span>
            <span className="text-zinc-400">Acciones masivas sobre el lote:</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs transition"
            >
              Desmarcar
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition shadow-lg shadow-rose-500/20 flex items-center space-x-1.5"
            >
              <IconTrash className="w-4 h-4" />
              <span>Eliminar Selección ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 px-4 rounded-2xl bg-titanium-900/95 border border-white/20 text-xs text-white shadow-2xl backdrop-blur-md animate-fade-in flex items-center space-x-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Structured Invoices Datagrid Table */}
      <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {isLoading ? (
          <KonoCyclingLoader 
            message="Consultando y auditando facturas en tiempo real..." 
            size="md" 
          />
        ) : documents.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
              <IconInbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-alabaster-100">No hay facturas por procesar</h3>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === documents.length && documents.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-0 cursor-pointer"
                      title="Seleccionar todas las facturas de la página"
                    />
                  </th>
                  <th className="py-3.5 px-4">Comprobante</th>
                  <th className="py-3.5 px-6">Emisor & NIT</th>
                  <th className="py-3.5 px-6">Fecha</th>
                  <th className="py-3.5 px-6">Total Extraído</th>
                  <th className="py-3.5 px-6">Estado & Diagnóstico</th>
                  <th className="py-3.5 px-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-alabaster-200">
                {documents.map((doc) => {
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => navigate(`/audit/${doc.id}`)}
                      className={`hover:bg-white/[0.04] transition duration-150 group cursor-pointer ${
                        isSelected ? 'bg-rose-500/[0.05]' : ''
                      }`}
                    >
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(doc.id, e as any)}
                          className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-4 font-mono font-medium text-alabaster-100 flex items-center space-x-2.5">
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
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/audit/${doc.id}`)}
                            className="px-3.5 py-1.5 rounded-xl liquid-glass-card hover:bg-white/10 text-alabaster-100 text-xs transition border border-white/10 font-medium shadow-sm flex items-center space-x-1"
                          >
                            <span>Auditar Visor</span>
                          </button>
                          <button
                            onClick={() => {
                              setDocToDelete({
                                id: doc.id,
                                name: doc.invoice_number || doc.file_name || 'Comprobante',
                              });
                            }}
                            disabled={deletingIds.has(doc.id)}
                            className="p-1.5 rounded-xl hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition disabled:opacity-40"
                            title="Eliminar factura"
                          >
                            {deletingIds.has(doc.id) ? (
                              <IconLoader2 className="w-4 h-4 animate-spin text-rose-400" />
                            ) : (
                              <IconTrash className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 bg-white/[0.01]">
            <span>Página {currentPage} de {totalPages}</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg liquid-glass-card hover:bg-white/5 border border-white/10 text-zinc-300 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg liquid-glass-card hover:bg-white/5 border border-white/10 text-zinc-300 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Single Delete Confirmation Liquid Glass Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar comprobante?"
        itemIdentifier={docToDelete?.name}
        description="Esta acción es irreversible y eliminará permanentemente el comprobante y todos sus registros."
        isDeleting={Boolean(docToDelete && deletingIds.has(docToDelete.id))}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleConfirmBulkDelete}
        title="¿Eliminar lote de comprobantes?"
        itemIdentifier={`${selectedIds.size} facturas seleccionadas`}
        description="Esta acción eliminará permanentemente todos los comprobantes seleccionados de la base de datos."
        isDeleting={isBulkDeleting}
      />
    </div>
  );
};
