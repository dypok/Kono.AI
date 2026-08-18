import React from 'react'

export default function App() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
      <div className="rounded-full bg-emerald-500/20 p-6 ring-2 ring-emerald-500">
        <span className="text-6xl">🪙</span>
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Kono.ai — Financial Auditor</h1>
      <p className="mt-2 text-slate-400 max-w-md">
        Extractor, Validador y Reconciliador Determinista de Facturas y Comprobantes listo para auditar.
      </p>
      <div className="mt-6 flex gap-3">
        <span className="rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
          🟢 Mascota Kono: Lista
        </span>
        <span className="rounded-full bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 border border-blue-500/30">
          ⚡ Dual-Backend: Conectado
        </span>
      </div>
    </div>
  )
}
