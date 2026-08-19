import React, { useState } from 'react';
import { BoundingBox, InvoiceData } from '../../types/invoice';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, Layers, FileText, CheckCircle } from 'lucide-react';

interface PdfViewerProps {
  invoice: InvoiceData;
  activeFieldKey: string | null;
  onSelectField: (fieldKey: string) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  invoice,
  activeFieldKey,
  onSelectField,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hoveredBox, setHoveredBox] = useState<BoundingBox | null>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 70));
  const handleResetZoom = () => setZoom(100);

  const strokeColorMap = {
    blue: {
      stroke: '#38BDF8', // Cyan/Sky Blue
      fill: 'rgba(56, 189, 248, 0.12)',
      glow: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
    },
    emerald: {
      stroke: '#34D399', // Emerald
      fill: 'rgba(52, 211, 153, 0.12)',
      glow: 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.6))',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    },
    violet: {
      stroke: '#A78BFA', // Violet
      fill: 'rgba(167, 139, 250, 0.12)',
      glow: 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.6))',
      badge: 'bg-violet-500/20 text-violet-300 border-violet-400/40',
    },
    amber: {
      stroke: '#FBBF24', // Amber
      fill: 'rgba(251, 191, 36, 0.12)',
      glow: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    },
  };

  return (
    <div className="flex flex-col h-full rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-4 shadow-glass overflow-hidden">
      
      {/* Top Floating Translucent Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 mb-3 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-slate-300">
        
        {/* Document Info */}
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">Visor PDF Original</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
            Vectorial Lopdf
          </span>
        </div>

        {/* Zoom & Page Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Page Selector */}
          <div className="flex items-center gap-1 bg-slate-950/60 px-2 py-1 rounded-lg border border-white/5 font-mono text-[11px]">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-1 text-slate-400 hover:text-white disabled:opacity-30"
            >
              ◀
            </button>
            <span>Pág {currentPage} / 1</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(1, p + 1))}
              disabled={currentPage === 1}
              className="px-1 text-slate-400 hover:text-white disabled:opacity-30"
            >
              ▶
            </button>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono text-[11px] text-slate-300">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors ml-0.5"
              title="Restablecer Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Overlay toggle */}
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-[11px] font-medium border ${
              showOverlay
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : 'bg-white/5 text-slate-400 border-white/5'
            }`}
          >
            {showOverlay ? <Layers className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>BBoxes SVG</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="relative flex-1 overflow-auto rounded-xl bg-slate-950/80 border border-white/5 p-4 flex justify-center items-start">
        
        {/* Scalable Document Paper */}
        <div
          className="relative bg-slate-900 text-slate-900 shadow-2xl rounded-lg border border-slate-700 transition-transform duration-150 origin-top overflow-hidden"
          style={{
            width: '620px',
            minHeight: '840px',
            transform: `scale(${zoom / 100})`,
            marginBottom: `${(zoom - 100) * 8}px`,
          }}
        >
          {/* Authentic High-Fidelity Invoice Document Render (Dark-Themed Financial Sheet) */}
          <div className="p-8 text-slate-200 font-sans text-xs bg-[#0F172A] min-h-[840px] flex flex-col justify-between select-none">
            
            {/* Header */}
            <div>
              <div className="flex justify-between items-start border-b border-slate-700/80 pb-5">
                <div>
                  <div className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="text-cyan-400">⚡</span> CLOUD SERVICES SAS
                  </div>
                  <div className="text-slate-400 mt-1 font-mono text-[11px]">NIT: 900.123.456-1</div>
                  <div className="text-slate-400 text-[11px]">Calle 100 # 15-20, Bogotá, Colombia</div>
                  <div className="text-slate-400 text-[11px]">contacto@cloudservices.co | (+57) 601 555-0199</div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-white font-mono uppercase tracking-wider">
                    FACTURA ELECTRÓNICA
                  </div>
                  <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    <div>Emisión: <span className="text-slate-200 font-mono">{invoice.issueDate}</span></div>
                    <div>Vencimiento: <span className="text-slate-200 font-mono">{invoice.dueDate}</span></div>
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div className="mt-5 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 flex justify-between items-center text-[11px]">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Adquirente:</span>
                  <span className="text-white font-medium text-xs">{invoice.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Identificación Tributaria:</span>
                  <span className="text-slate-200 font-mono">{invoice.customerNit}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Moneda:</span>
                  <span className="text-emerald-400 font-mono font-semibold">{invoice.currency}</span>
                </div>
              </div>

              {/* Items Table Mockup */}
              <div className="mt-6">
                <div className="grid grid-cols-12 text-[11px] font-semibold text-slate-400 border-b border-slate-700/80 pb-2 px-2">
                  <span className="col-span-6">DESCRIPCIÓN DEL SERVICIO</span>
                  <span className="col-span-2 text-right">CANT.</span>
                  <span className="col-span-2 text-right">VR. UNIT</span>
                  <span className="col-span-2 text-right">TOTAL</span>
                </div>

                <div className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 py-3 px-2 text-slate-300 items-center">
                      <div className="col-span-6 font-sans text-slate-200 font-medium">{item.description}</div>
                      <div className="col-span-2 text-right text-slate-300">{item.quantity}</div>
                      <div className="col-span-2 text-right text-slate-300">${item.unitPrice.toFixed(2)}</div>
                      <div className="col-span-2 text-right text-white font-semibold">${item.lineTotal.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals Section */}
            <div className="border-t border-slate-700/80 pt-4 mt-6">
              <div className="flex justify-between items-end">
                <div className="text-[10px] text-slate-400 max-w-[280px]">
                  <p>Documento emitido según Resolución DIAN No. 1876400012984.</p>
                  <p className="mt-1 font-mono text-[9px] text-slate-500 break-all">
                    CUFE: a8f9c1e024b7899dfa330198bc43d1a8904e5f
                  </p>
                </div>

                <div className="w-[240px] space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-white">${invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>IVA (19%):</span>
                    <span className="font-semibold">${invoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-700">
                    <span>Gran Total:</span>
                    <span className="text-cyan-300 text-base">${invoice.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive SVG Bounding Box Layer */}
          {showOverlay && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-auto"
              viewBox="0 0 620 840"
              preserveAspectRatio="none"
            >
              {invoice.boundingBoxes.map((box) => {
                const [x0, y0, x1, y1] = box.bbox;
                const width = Math.max(x1 - x0, 10);
                const height = Math.max(y1 - y0, 8);
                const isSelected = activeFieldKey === box.fieldKey;
                const isHovered = hoveredBox?.id === box.id;
                const style = strokeColorMap[box.colorType];

                return (
                  <g key={box.id} className="cursor-pointer">
                    {/* Bounding Box Rectangle */}
                    <rect
                      x={x0}
                      y={y0}
                      width={width}
                      height={height}
                      rx="4"
                      fill={isSelected || isHovered ? style.fill : 'rgba(255,255,255,0.02)'}
                      stroke={style.stroke}
                      strokeWidth={isSelected ? '2.5' : isHovered ? '2' : '1.5'}
                      strokeDasharray={isSelected ? 'none' : '4 2'}
                      style={{
                        filter: isSelected || isHovered ? style.glow : 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={() => setHoveredBox(box)}
                      onMouseLeave={() => setHoveredBox(null)}
                      onClick={() => onSelectField(box.fieldKey)}
                    />

                    {/* Small Field Tag Label */}
                    {(isSelected || isHovered) && (
                      <g transform={`translate(${x0}, ${Math.max(y0 - 18, 0)})`}>
                        <rect
                          width={box.label.length * 6.8 + 14}
                          height="16"
                          rx="3"
                          fill="#0F172A"
                          stroke={style.stroke}
                          strokeWidth="1"
                        />
                        <text
                          x="7"
                          y="11"
                          fill="#FFFFFF"
                          fontSize="9"
                          fontFamily="Inter, sans-serif"
                          fontWeight="600"
                        >
                          {box.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          )}

        </div>

      </div>

      {/* Floating Glass Tooltip on Hover */}
      {hoveredBox && (
        <div className="absolute bottom-6 left-6 z-50 px-3.5 py-2 rounded-xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 shadow-2xl text-xs font-sans text-slate-200 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{hoveredBox.label}:</span>
            <span className="font-mono text-cyan-300">{hoveredBox.value}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {(hoveredBox.confidence * 100).toFixed(1)}% Determinista
            </span>
          </div>
        </div>
      )}

      {/* Bottom Visual Legend */}
      <div className="mt-3 flex items-center justify-between px-2 pt-1 border-t border-white/5 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38BDF8]" /> Totales & Subtotales
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399]" /> Impuestos / IVA
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_#A78BFA]" /> N° Factura & Fechas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#FBBF24]" /> Emisor & NIT
          </span>
        </div>

        <span className="font-mono text-[10px] text-slate-400">
          Click en BBox para editar
        </span>
      </div>

    </div>
  );
};
