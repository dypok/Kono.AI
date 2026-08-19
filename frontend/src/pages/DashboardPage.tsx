import React, { useState } from 'react';
import {
  IconFileText,
  IconCircleCheck,
  IconAlertTriangle,
  IconCircleX,
  IconSearch,
  IconUpload,
} from '@tabler/icons-react';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'green' | 'yellow' | 'red'>('all');

  const mockDocuments = [
    {
      id: 'doc_1',
      invoiceNumber: 'INV-2026-8891',
      issuer: 'Cloud Hosting SAS',
      taxId: '900.123.456-1',
      total: '$1,785.00',
      status: 'GREEN',
      statusMessage: '100% Determinista (Δ = $0.00)',
      date: '15/08/2026',
    },
    {
      id: 'doc_2',
      invoiceNumber: 'FAC-9012',
      issuer: 'Office Supplies LTDA',
      taxId: '800.999.111-2',
      total: '$420.50',
      status: 'YELLOW',
      statusMessage: 'Descuadre de $0.01 centavo',
      date: '16/08/2026',
    },
    {
      id: 'doc_3',
      invoiceNumber: 'INV-2026-8891',
      issuer: 'Cloud Hosting SAS (Duplicado)',
      taxId: '900.123.456-1',
      total: '$1,785.00',
      status: 'RED',
      statusMessage: 'Factura duplicada (SHA-256 Match)',
      date: '18/08/2026',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
            Extracción determinista espacial, Bounding Boxes sincronizados y triage en tiempo real.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-3 shrink-0">
          <button className="px-4 py-2.5 rounded-xl liquid-glass-card hover:bg-white/5 border border-white/10 text-xs text-alabaster-200 flex items-center space-x-2 transition">
            <IconUpload className="w-4 h-4 text-kono-silver" />
            <span>Cargar Comprobante</span>
          </button>
          <button className="px-4 py-2.5 rounded-xl bg-alabaster-100 hover:bg-white text-titanium-950 font-semibold text-xs transition shadow flex items-center space-x-2">
            <IconCircleCheck className="w-4 h-4 text-titanium-950" />
            <span>Aprobar Todo (482)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* State Filter Pills */}
        <div className="flex items-center space-x-2 p-1.5 liquid-glass-card rounded-2xl border border-white/5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todas las Facturas' },
            { id: 'green', label: '🟢 Exactas (380)' },
            { id: 'yellow', label: '🟡 Alertas (82)' },
            { id: 'red', label: '🔴 Duplicadas (20)' },
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
            placeholder="Buscar por NIT, emisor o folio..."
            className="w-full liquid-glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Structured Invoices Datagrid Table */}
      <div className="liquid-glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
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
            {mockDocuments.map((doc) => (
              <tr key={doc.id} className="hover:bg-white/[0.03] transition duration-150 group">
                <td className="py-4 px-6 font-mono font-medium text-alabaster-100 flex items-center space-x-2.5">
                  <IconFileText className="w-4 h-4 text-kono-silver group-hover:text-white transition" />
                  <span>{doc.invoiceNumber}</span>
                </td>
                <td className="py-4 px-6">
                  <p className="font-medium text-alabaster-100">{doc.issuer}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">{doc.taxId}</p>
                </td>
                <td className="py-4 px-6 font-mono text-zinc-300">{doc.date}</td>
                <td className="py-4 px-6 font-mono font-bold text-alabaster-100">{doc.total}</td>
                <td className="py-4 px-6">
                  {doc.status === 'GREEN' && (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
                      <IconCircleCheck className="w-3.5 h-3.5" />
                      <span>{doc.statusMessage}</span>
                    </span>
                  )}
                  {doc.status === 'YELLOW' && (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px]">
                      <IconAlertTriangle className="w-3.5 h-3.5" />
                      <span>{doc.statusMessage}</span>
                    </span>
                  )}
                  {doc.status === 'RED' && (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
                      <IconCircleX className="w-3.5 h-3.5" />
                      <span>{doc.statusMessage}</span>
                    </span>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="px-3 py-1 rounded-lg liquid-glass-card hover:bg-white/10 text-alabaster-100 text-xs transition border border-white/10">
                    Auditar Visor
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
