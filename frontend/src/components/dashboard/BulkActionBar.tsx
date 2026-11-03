import React from 'react';
import { Trash2, Sparkles, X } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkAiEstimate: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkAiEstimate,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-titanium-900/90 border border-white/20 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center space-x-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center space-x-2 pr-3 border-r border-white/10">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <span className="text-xs font-mono font-medium text-white">
          {selectedCount} seleccionada{selectedCount > 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onBulkAiEstimate}
          className="px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-xs font-medium transition flex items-center space-x-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Calcular Costo IA</span>
        </button>

        <button
          onClick={onBulkDelete}
          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-medium transition flex items-center space-x-1.5"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>Eliminar ({selectedCount})</span>
        </button>

        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition"
          title="Deseleccionar todas"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
