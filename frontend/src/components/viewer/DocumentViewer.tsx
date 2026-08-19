import { useState } from 'react';
import { ZoomIn, ZoomOut, Layers, EyeOff, FileText, CheckCircle } from 'lucide-react';
import { ExtractedField, InvoiceRecord } from '../../types/invoice';
import { fieldColorStyles } from '../../lib/fieldColors';
import { cn } from '../../lib/cn';

interface DocumentViewerProps {
  invoice: InvoiceRecord;
  activeFieldKey: string | null;
  onSelectField: (fieldKey: string) => void;
}

const CANVAS_WIDTH = 620;
const CANVAS_HEIGHT = 840;

/** Left panel: frosted-glass document canvas with interactive glowing SVG bounding boxes. */
export function DocumentViewer({ invoice, activeFieldKey, onSelectField }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [showOverlay, setShowOverlay] = useState(true);
  const [page, setPage] = useState(1);
  const [hoveredField, setHoveredField] = useState<ExtractedField | null>(null);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-glass backdrop-blur-xl">
      <ViewerToolbar
        page={page}
        onPageChange={setPage}
        zoom={zoom}
        onZoomChange={setZoom}
        showOverlay={showOverlay}
        onToggleOverlay={() => setShowOverlay((prev) => !prev)}
      />

      <div className="relative flex-1 overflow-auto rounded-xl border border-white/5 bg-slate-950/80 p-4">
        <div className="flex justify-center">
          <div
            className="relative origin-top overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl transition-transform duration-150"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${zoom / 100})` }}
          >
            <InvoiceDocument invoice={invoice} />

            {showOverlay && (
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                preserveAspectRatio="none"
              >
                {invoice.fields.map((field) => (
                  <BoundingBox
                    key={field.id}
                    field={field}
                    isActive={activeFieldKey === field.fieldKey}
                    isHovered={hoveredField?.id === field.id}
                    onHover={setHoveredField}
                    onSelect={onSelectField}
                  />
                ))}
              </svg>
            )}
          </div>
        </div>
      </div>

      {hoveredField && <FieldTooltip field={hoveredField} />}

      <ColorLegend />
    </div>
  );
}

interface ViewerToolbarProps {
  page: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showOverlay: boolean;
  onToggleOverlay: () => void;
}

function ViewerToolbar({ page, onPageChange, zoom, onZoomChange, showOverlay, onToggleOverlay }: ViewerToolbarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-cyan-400" />
        <span className="font-semibold text-slate-200">Original Document</span>
        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-700">Vector Render</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-slate-950/60 px-2 py-1 font-mono text-[11px]">
          <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="px-1 text-slate-400 hover:text-white disabled:opacity-30">
            ◀
          </button>
          <span>Page {page} / 1</span>
          <button type="button" onClick={() => onPageChange(Math.min(1, page + 1))} disabled={page === 1} className="px-1 text-slate-400 hover:text-white disabled:opacity-30">
            ▶
          </button>
        </div>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          <ZoomOut className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="range"
            min={70}
            max={160}
            step={5}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400"
          />
          <ZoomIn className="h-3.5 w-3.5 text-slate-400" />
          <span className="w-10 font-mono text-[11px] text-slate-300">{zoom}%</span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        <button
          type="button"
          onClick={onToggleOverlay}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all',
            showOverlay ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-300' : 'border-white/5 bg-white/5 text-slate-400',
          )}
        >
          {showOverlay ? <Layers className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>Bounding Boxes</span>
        </button>
      </div>
    </div>
  );
}

interface BoundingBoxProps {
  field: ExtractedField;
  isActive: boolean;
  isHovered: boolean;
  onHover: (field: ExtractedField | null) => void;
  onSelect: (fieldKey: string) => void;
}

function BoundingBox({ field, isActive, isHovered, onHover, onSelect }: BoundingBoxProps) {
  const [x, y, width, height] = field.box;
  const style = fieldColorStyles[field.color];
  const highlighted = isActive || isHovered;

  return (
    <g className="cursor-pointer">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={highlighted ? style.fillActive : 'rgba(255,255,255,0.02)'}
        stroke={style.stroke}
        strokeWidth={isActive ? 2.5 : isHovered ? 2 : 1.5}
        strokeDasharray={isActive ? 'none' : '4 2'}
        style={{ filter: highlighted ? style.glowFilter : 'none', transition: 'all 0.2s ease' }}
        onMouseEnter={() => onHover(field)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(field.fieldKey)}
      />

      {highlighted && (
        <g transform={`translate(${x}, ${Math.max(y - 18, 0)})`}>
          <rect width={field.label.length * 6.8 + 14} height={16} rx={3} fill="#0F172A" stroke={style.stroke} strokeWidth={1} />
          <text x={7} y={11} fill="#FFFFFF" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={600}>
            {field.label}
          </text>
        </g>
      )}
    </g>
  );
}

function FieldTooltip({ field }: { field: ExtractedField }) {
  return (
    <div className="absolute bottom-20 left-8 z-20 flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-200 shadow-2xl backdrop-blur-2xl">
      <span className="font-semibold text-white">{field.label}:</span>
      <span className="font-mono text-cyan-300">{field.value}</span>
      <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
        <CheckCircle className="h-3 w-3" />
        Confidence: {(field.confidence * 100).toFixed(1)}% — Deterministic
      </span>
    </div>
  );
}

function ColorLegend() {
  const items: { color: keyof typeof fieldColorStyles; label: string }[] = [
    { color: 'blue', label: 'Subtotal & Grand Total' },
    { color: 'emerald', label: 'VAT / Taxes' },
    { color: 'violet', label: 'Invoice Number & Dates' },
    { color: 'amber', label: 'Issuer Name & Tax ID' },
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-2 pt-3 text-[11px] text-slate-400">
      <div className="flex flex-wrap items-center gap-3">
        {items.map((item) => (
          <span key={item.color} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', fieldColorStyles[item.color].dotClass)} />
            {item.label}
          </span>
        ))}
      </div>
      <span className="font-mono text-[10px] text-slate-500">Click a box to edit its field</span>
    </div>
  );
}

/** High-fidelity render of the underlying invoice, matched pixel-for-pixel against the bbox geometry. */
function InvoiceDocument({ invoice }: { invoice: InvoiceRecord }) {
  return (
    <div className="flex h-full min-h-[840px] select-none flex-col justify-between bg-[#0F172A] p-8 font-sans text-xs text-slate-200">
      <div>
        <div className="flex items-start justify-between border-b border-slate-700/80 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
              <span className="text-cyan-400">⚡</span> {invoice.issuerName}
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-400">Tax ID: {invoice.issuerTaxId}</div>
            <div className="text-[11px] text-slate-400">100 Cloud Ave, Suite 200, San Francisco, CA</div>
            <div className="text-[11px] text-slate-400">billing@cloudservices.example | (415) 555-0199</div>
          </div>

          <div className="text-right">
            <div className="font-mono text-base font-bold uppercase tracking-wider text-white">Invoice</div>
            <div className="mt-0.5 font-mono text-base font-bold text-cyan-300">{invoice.invoiceNumber}</div>
            <div className="mt-2 text-[11px] text-slate-400">
              <div>
                Issued: <span className="font-mono text-slate-200">{invoice.issueDate}</span>
              </div>
              <div>
                Due: <span className="font-mono text-slate-200">{invoice.dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 text-[11px]">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">Bill To</span>
            <span className="text-xs font-medium text-white">{invoice.customerName}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">Tax ID</span>
            <span className="font-mono text-slate-200">{invoice.customerTaxId}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">Currency</span>
            <span className="font-mono font-semibold text-emerald-400">{invoice.currency}</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="grid grid-cols-12 border-b border-slate-700/80 px-2 pb-2 text-[11px] font-semibold text-slate-400">
            <span className="col-span-6">DESCRIPTION</span>
            <span className="col-span-2 text-right">QTY</span>
            <span className="col-span-2 text-right">UNIT PRICE</span>
            <span className="col-span-2 text-right">TOTAL</span>
          </div>

          <div className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {invoice.lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 items-center px-2 py-3 text-slate-300">
                <div className="col-span-6 font-sans font-medium text-slate-200">{item.description}</div>
                <div className="col-span-2 text-right">{item.quantity}</div>
                <div className="col-span-2 text-right">${item.unitPrice.toFixed(2)}</div>
                <div className="col-span-2 text-right font-semibold text-white">${item.lineTotal.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-700/80 pt-4">
        <div className="flex items-end justify-between">
          <div className="max-w-[280px] text-[10px] text-slate-400">
            <p>Generated by Kono.ai deterministic extraction pipeline.</p>
            <p className="mt-1 break-all font-mono text-[9px] text-slate-500">DOC-HASH: a8f9c1e024b7899dfa330198bc43d1a8</p>
          </div>

          <div className="w-[240px] space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal:</span>
              <span className="font-semibold text-white">${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>VAT ({(invoice.taxRate * 100).toFixed(0)}%):</span>
              <span className="font-semibold">${invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-2 text-sm font-bold text-white">
              <span>Grand Total:</span>
              <span className="text-base text-cyan-300">${invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
