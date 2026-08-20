import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Trash2, CheckCircle, Loader2, UploadCloud, ArrowRight, ScanLine } from 'lucide-react';
import { documentsApi } from '../services/documentsApi';
import { KonoCyclingLoader } from '../components/common/KonoCyclingLoader';
import { DeleteConfirmationModal } from '../components/common/DeleteConfirmationModal';

interface TemplateItem {
  id: string;
  vendor_name: string;
  vendor_tax_id: string;
  spatial_anchors?: Record<string, any>;
  total_matched_count?: number;
}

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

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

  const handleConfirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setDeletingId(templateToDelete.id);
      await documentsApi.deleteVendorTemplate(templateToDelete.id);
      setToastMsg(`🗑️ Plantilla de "${templateToDelete.name}" eliminada.`);
      setTemplateToDelete(null);
      fetchTemplates();
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
          <h1 className="text-xl font-bold text-alabaster-100 flex items-center space-x-2">
            <span>Plantillas Espaciales de Proveedor</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Vector Learning
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Auto-aprendizaje de coordenadas y vectores espaciales para extracción determinista instantánea (&lt; 2 ms) a $0 tokens.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-xl bg-alabaster-100 text-titanium-950 font-semibold text-xs hover:bg-white transition flex items-center space-x-2 shadow"
        >
          <ScanLine className="w-4 h-4" />
          <span>Escanear Facturas</span>
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
        <div className="py-16 text-center liquid-glass rounded-3xl p-8 border border-white/10 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-alabaster-100">No hay plantillas registradas</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Las plantillas se generan automáticamente al escanear y aprobar facturas en el Visor de Auditoría, aprendiendo las coordenadas vectoriales de cada proveedor para futuras extracciones a cero costo de tokens.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-3 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-alabaster-100 border border-white/15 transition shadow inline-flex items-center space-x-2"
          >
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>Escanear Primera Factura</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
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
                    <span>Vector Anclado</span>
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
                  onClick={() => setTemplateToDelete({
                    id: t.id,
                    name: t.vendor_name || t.vendor_tax_id,
                  })}
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

      {/* Delete Confirmation Liquid Glass Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(templateToDelete)}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleConfirmDeleteTemplate}
        title="¿Eliminar plantilla de extracción?"
        itemIdentifier={templateToDelete?.name}
        description="Esta acción eliminará las reglas de auto-aprendizaje y los vectores espaciales de este proveedor en PostgreSQL."
        isDeleting={Boolean(deletingId)}
      />
    </div>
  );
};

