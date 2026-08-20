import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemIdentifier?: string;
  description?: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Eliminar comprobante?',
  itemIdentifier,
  description = 'Esta acción es irreversible y eliminará el archivo fuente, las comprobaciones contables y los registros asociados de la base de datos.',
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in">
      <div className="w-full max-w-md bg-titanium-950/95 border border-rose-500/20 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-alabaster-100 space-y-5">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-alabaster-100">{title}</h3>
            {itemIdentifier && (
              <p className="text-xs font-mono text-rose-400/90 mt-0.5 truncate max-w-[240px]">
                {itemIdentifier}
              </p>
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs text-zinc-300 leading-relaxed">
          {description}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition shadow-lg shadow-rose-500/20 flex items-center space-x-2 disabled:opacity-50 active:scale-95"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Trash2 className="w-4 h-4 text-white" />
            )}
            <span>{isDeleting ? 'Eliminando...' : 'Eliminar Definitivamente'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
