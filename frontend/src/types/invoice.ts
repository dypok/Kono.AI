export type KonoStatus = 'green' | 'yellow' | 'red';

export type BBoxColor = 'blue' | 'emerald' | 'violet' | 'amber';

export interface BoundingBox {
  id: string;
  fieldKey: string;
  label: string;
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] normalized (0..1000 or px)
  page: number;
  confidence: number;
  colorType: BBoxColor;
  value: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isVerified: boolean;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  issuerName: string;
  issuerNit: string;
  customerName: string;
  customerNit: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxRate: number; // 0.19 = 19%
  taxAmount: number;
  grandTotal: number;
  items: InvoiceItem[];
  boundingBoxes: BoundingBox[];
  status: KonoStatus;
  mathDiscrepancy: number;
  statusMessage: string;
  duplicateWarning?: string;
}

export interface AuditMetrics {
  processedToday: number;
  zeroTokenRate: number; // e.g. 95%
  tokenCost: number;
  avgLatencyMs: number;
  batchReadyCount: number;
}
