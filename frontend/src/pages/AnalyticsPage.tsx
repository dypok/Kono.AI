import React from 'react';
import { Download, TrendingUp, DollarSign, Cpu } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-alabaster-100">Conciliación & Exportación Contable</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Reportes consolidados listos para exportar a ERP (SAP, Oracle, Excel).
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3.5 py-2 rounded-xl liquid-glass-card hover:bg-white/5 text-xs text-alabaster-200 flex items-center space-x-2">
            <Download className="w-4 h-4 text-kono-silver" />
            <span>Exportar CSV</span>
          </button>
          <button className="px-3.5 py-2 rounded-xl bg-alabaster-100 text-titanium-950 font-medium text-xs hover:bg-white transition flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="liquid-glass rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Facturado Hoy</span>
            <DollarSign className="w-4 h-4 text-kono-silver" />
          </div>
          <p className="text-2xl font-bold text-alabaster-100 font-mono mt-2">$284,910.50</p>
          <p className="text-xs text-emerald-400 mt-2 flex items-center space-x-1 font-mono">
            <TrendingUp className="w-3 h-3" />
            <span>+14.2% respecto a ayer</span>
          </p>
        </div>

        <div className="liquid-glass rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Ahorro en Tokens IA</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-2">$142.80 USD</p>
          <p className="text-xs text-zinc-400 mt-2 font-mono">95.4% procesado a $0.00 costo</p>
        </div>

        <div className="liquid-glass rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Tasa de Aprobación 1-Click</span>
            <TrendingUp className="w-4 h-4 text-kono-gold" />
          </div>
          <p className="text-2xl font-bold text-alabaster-100 font-mono mt-2">91.8%</p>
          <p className="text-xs text-zinc-400 mt-2 font-mono">Sin intervención manual humana</p>
        </div>
      </div>
    </div>
  );
};
