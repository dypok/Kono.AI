import { Building2, Calendar, Hash, ShieldCheck } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';
import { GlassInput } from './GlassInput';

interface MetadataSectionProps {
  invoice: InvoiceRecord;
  activeFieldKey: string | null;
  onSelectField: (fieldKey: string) => void;
  onUpdateInvoice?: (invoice: InvoiceRecord) => void;
}

/** Section 1: issuer & customer metadata, displayed in read-only audit tiles. */
export function MetadataSection({ invoice, activeFieldKey, onSelectField }: MetadataSectionProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Building2 className="h-4 w-4 text-cyan-400" />
          <span>Datos del Comprobante &amp; Emisor</span>
        </div>
        <span className="flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
          <ShieldCheck className="h-3 w-3" />
          Extraído &amp; Bloqueado
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GlassInput
          label="Folio / N° Factura"
          icon={<Hash className="h-3 w-3 text-violet-400" />}
          value={invoice.invoiceNumber}
          readOnly
          disabled
          active={activeFieldKey === 'invoice_number' || activeFieldKey === 'invoiceNumber'}
          onFocus={() => onSelectField('invoice_number')}
        />

        <GlassInput
          label="NIT / Tax ID Emisor"
          value={invoice.issuerTaxId}
          readOnly
          disabled
          active={activeFieldKey === 'vendor_tax_id' || activeFieldKey === 'issuerTaxId'}
          onFocus={() => onSelectField('vendor_tax_id')}
        />

        <div className="sm:col-span-2">
          <GlassInput
            label="Razón Social / Emisor"
            value={invoice.issuerName}
            readOnly
            disabled
            active={activeFieldKey === 'vendor_name' || activeFieldKey === 'issuerName'}
            onFocus={() => onSelectField('vendor_name')}
          />
        </div>

        <GlassInput
          label="Fecha de Emisión"
          icon={<Calendar className="h-3 w-3 text-violet-400" />}
          value={invoice.issueDate}
          readOnly
          disabled
          active={activeFieldKey === 'issue_date' || activeFieldKey === 'issueDate'}
          onFocus={() => onSelectField('issue_date')}
        />

        <GlassInput
          label="Fecha de Vencimiento"
          icon={<Calendar className="h-3 w-3 text-violet-400" />}
          value={invoice.dueDate}
          readOnly
          disabled
          active={activeFieldKey === 'due_date' || activeFieldKey === 'dueDate'}
          onFocus={() => onSelectField('due_date')}
        />
      </div>
    </div>
  );
}
