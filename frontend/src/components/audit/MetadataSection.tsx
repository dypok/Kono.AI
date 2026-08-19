import { Building2, Calendar, Hash } from 'lucide-react';
import { InvoiceRecord } from '../../types/invoice';
import { GlassInput } from './GlassInput';

interface MetadataSectionProps {
  invoice: InvoiceRecord;
  activeFieldKey: string | null;
  onSelectField: (fieldKey: string) => void;
  onUpdateInvoice: (invoice: InvoiceRecord) => void;
}

/** Section 1: issuer & customer metadata, in compact glass input fields. */
export function MetadataSection({ invoice, activeFieldKey, onSelectField, onUpdateInvoice }: MetadataSectionProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Building2 className="h-4 w-4 text-cyan-400" />
          <span>Issuer &amp; Customer Metadata</span>
        </div>
        <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
          ✓ OCR Verified
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GlassInput
          label="Invoice Number"
          icon={<Hash className="h-3 w-3 text-violet-400" />}
          value={invoice.invoiceNumber}
          active={activeFieldKey === 'invoiceNumber'}
          onFocus={() => onSelectField('invoiceNumber')}
          onChange={(e) => onUpdateInvoice({ ...invoice, invoiceNumber: e.target.value })}
        />

        <GlassInput
          label="Issuer Tax ID"
          value={invoice.issuerTaxId}
          active={activeFieldKey === 'issuerTaxId'}
          onFocus={() => onSelectField('issuerTaxId')}
          onChange={(e) => onUpdateInvoice({ ...invoice, issuerTaxId: e.target.value })}
        />

        <div className="sm:col-span-2">
          <GlassInput
            label="Issuer Name"
            value={invoice.issuerName}
            active={activeFieldKey === 'issuerName'}
            onFocus={() => onSelectField('issuerName')}
            onChange={(e) => onUpdateInvoice({ ...invoice, issuerName: e.target.value })}
          />
        </div>

        <GlassInput
          label="Issue Date"
          icon={<Calendar className="h-3 w-3 text-violet-400" />}
          value={invoice.issueDate}
          active={activeFieldKey === 'issueDate'}
          onFocus={() => onSelectField('issueDate')}
          onChange={(e) => onUpdateInvoice({ ...invoice, issueDate: e.target.value })}
        />

        <GlassInput
          label="Due Date"
          icon={<Calendar className="h-3 w-3 text-violet-400" />}
          value={invoice.dueDate}
          active={activeFieldKey === 'dueDate'}
          onFocus={() => onSelectField('dueDate')}
          onChange={(e) => onUpdateInvoice({ ...invoice, dueDate: e.target.value })}
        />
      </div>
    </div>
  );
}
