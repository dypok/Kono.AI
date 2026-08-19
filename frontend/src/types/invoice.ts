/**
 * Core domain types for the Kono.ai Financial Audit Dashboard.
 */

/** Audit health state driving the Kono mascot mood, halo color and UI accents. */
export type AuditState = 'ok' | 'warning' | 'critical';

/** Semantic color channel used to group related extracted fields on the document canvas. */
export type FieldColor = 'blue' | 'emerald' | 'violet' | 'amber';

/** Normalized pixel-space bounding box tied to a single extracted field. */
export interface ExtractedField {
  id: string;
  fieldKey: string;
  label: string;
  value: string;
  confidence: number; // 0..1
  color: FieldColor;
  page: number;
  /** [x, y, width, height] in the coordinate space of the rendered document canvas (620x840). */
  box: [number, number, number, number];
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  verified: boolean;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  issuerName: string;
  issuerTaxId: string;
  customerName: string;
  customerTaxId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  lineItems: LineItem[];
  fields: ExtractedField[];
  auditState: AuditState;
  deltaAmount: number;
  auditMessage: string;
  duplicateFlag?: string;
}

export interface LiveMetrics {
  invoicesToday: number;
  tokenCost: number;
  deterministicRate: number;
  avgLatencyMs: number;
  batchReadyCount: number;
}
