import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, CheckCircle, Loader2, Sparkles, X } from 'lucide-react';
import { documentsApi } from '../services/documentsApi';
import { KonoCyclingLoader } from '../components/common/KonoCyclingLoader';

interface TemplateItem {
  id: string;
  vendor_name: string;
  vendor_tax_id: string;
  spatial_anchors?: Record<string, any>;
  total_matched_count?: number;
}

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [vendorName, setVendorName] = useState('');
  const [vendorTaxId, setVendorTaxId] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await documentsApi.listVendorTemplates();
      if (Array.isArray(data)) {
        setTemplates(data);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorTaxId.trim()) return;

    try {
      setIsSaving(true);
      await documentsApi.saveVendorTemplate({
        vendor_name: vendorName.trim() || 'Proveedor General',
        vendor_tax_id: vendorTaxId.trim(),
        spatial_anchors: {
          subtotal_offset: [0, -10],
          tax_offset: [0, -25],
          total_offset: [0, -40],
          deterministic_mode: true,
        },
      });

      setToastMsg(`✅ Plantilla para "${vendorName || vendorTaxId}" creada exitosamente.`);
      setIsModalOpen(false);
      setVendorName('');
      setVendorTaxId('');
      fetchTemplates();
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      alert(`Error al guardar plantilla: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    const confirmed = window.confirm(`¿Deseas eliminar la plantilla de extracción de "${name}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await documentsApi.deleteVendorTemplate(id);
      fetchTemplates();
      setToastMsg(`🗑️ Plantilla de "${name}" eliminada.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-alabaster-100">Plantillas de Proveedor Guardadas</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Auto-aprendizaje de coordenadas fijas para extracción instantánea (&lt; 2 ms) a $0 tokens.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-alabaster-100 text-titanium-950 font-semibold text-xs hover:bg-white transition flex items-center space-x-2 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Plantilla</span>
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {isLoading ? (
        <KonoCyclingLoader 
          message="Sincronizando plantillas espaciales de proveedores..." 
          size="md" 
        />
      ) : templates.length === 0 ? (
        <div className="py-16 text-center liquid-glass rounded-3xl p-8 border border-white/10 space-y-3">
          <Layers className="w-10 h-10 text-zinc-500 mx-auto" />
          <h3 className="text-sm font-semibold text-alabaster-100">No hay plantillas registradas</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Puedes guardar plantillas desde el Visor de Auditoría al aprobar una factura o registrar manualmente un proveedor recurrente.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-alabaster-100 border border-white/15 transition"
          >
            Registrar Primera Plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div key={t.id} className="liquid-glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between group hover:border-white/20 transition duration-150">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-kono-silver">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>100% Determinista</span>
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-alabaster-100">{t.vendor_name || 'Proveedor Registrado'}</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">NIT: {t.vendor_tax_id}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono">{t.total_matched_count || 1} comprobante(s) pareados</span>
                <button
                  onClick={() => handleDeleteTemplate(t.id, t.vendor_name || t.vendor_tax_id)}
                  disabled={deletingId === t.id}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-40"
                  title="Eliminar plantilla"
                >
                  {deletingId === t.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear Nueva Plantilla */}
      {isModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in">
          <div className="w-full max-w-md bg-titanium-950/95 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-alabaster-100">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-alabaster-100">Nueva Plantilla de Proveedor</h3>
                <p className="text-xs text-zinc-400">Extracción espacial sin costo de tokens</p>
              </div>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-alabaster-300 mb-1 uppercase tracking-wider">
                  Razón Social / Nombre del Proveedor
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Ej: Claro Colombia SA"
                  required
                  className="w-full liquid-glass-input px-3.5 py-2 rounded-xl text-xs text-alabaster-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-alabaster-300 mb-1 uppercase tracking-wider">
                  NIT / Tax ID
                </label>
                <input
                  type="text"
                  value={vendorTaxId}
                  onChange={(e) => setVendorTaxId(e.target.value)}
                  placeholder="Ej: 800.153.993-7"
                  required
                  className="w-full liquid-glass-input px-3.5 py-2 rounded-xl text-xs font-mono text-alabaster-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition shadow flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin text-titanium-950" />}
                  <span>{isSaving ? 'Guardando...' : 'Guardar Plantilla'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
