import React from 'react';
import { Layers, Plus, ExternalLink, CheckCircle } from 'lucide-react';

export const TemplatesPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-alabaster-100">Plantillas de Proveedor Guardadas</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Auto-aprendizaje de coordenadas fijas para extracción instantánea (&lt; 2 ms) a $0 tokens.
          </p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-alabaster-100 text-titanium-950 font-medium text-xs hover:bg-white transition flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Nueva Plantilla</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { name: 'Amazon Web Services', nit: '900.111.222-3', matches: 342, accuracy: '100%' },
          { name: 'Google Cloud Platform', nit: '800.555.444-1', matches: 128, accuracy: '99.8%' },
          { name: 'Microsoft Azure SAS', nit: '901.888.777-5', matches: 84, accuracy: '100%' },
        ].map((t) => (
          <div key={t.nit} className="liquid-glass rounded-3xl p-5 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-kono-silver">
                <Layers className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>{t.accuracy}</span>
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-alabaster-100">{t.name}</h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">NIT: {t.nit}</p>
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
              <span>{t.matches} comprobantes pareados</span>
              <button className="text-kono-silver hover:text-white flex items-center space-x-1">
                <span>Editar</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
