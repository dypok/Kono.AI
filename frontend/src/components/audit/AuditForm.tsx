import { InvoiceRecord } from '../../types/invoice';
import { KonoCoin } from '../mascot/KonoCoin';
import { AuditSpeechBubble } from '../mascot/AuditSpeechBubble';
import { MetadataSection } from './MetadataSection';
import { LineItemsTable } from './LineItemsTable';
import { TotalsBreakdown } from './TotalsBreakdown';
import { AuditActions } from './AuditActions';

interface AuditFormProps {
  invoice: InvoiceRecord;
  activeFieldKey: string | null;
  onSelectField: (fieldKey: string) => void;
  onUpdateInvoice: (invoice: InvoiceRecord) => void;
  onSaveTemplate: () => void;
  onApproveAndExport: () => void;
}

/** Right panel: structured financial audit form, composed from the four audit sub-sections. */
export function AuditForm({ invoice, activeFieldKey, onSelectField, onUpdateInvoice, onSaveTemplate, onApproveAndExport }: AuditFormProps) {
  return (
    <div className="flex h-full flex-col space-y-5 overflow-y-auto rounded-3xl border border-white/10 liquid-glass p-5 shadow-glass backdrop-blur-2xl">
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-inner">
        <div className="flex flex-col items-center shrink-0">
          <KonoCoin state={invoice.auditState} size="md" />
          <span className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Kono AI</span>
        </div>
        <AuditSpeechBubble invoice={invoice} />
      </div>

      <MetadataSection invoice={invoice} activeFieldKey={activeFieldKey} onSelectField={onSelectField} onUpdateInvoice={onUpdateInvoice} />
      <LineItemsTable invoice={invoice} onUpdateInvoice={onUpdateInvoice} />
      <TotalsBreakdown invoice={invoice} activeFieldKey={activeFieldKey} onSelectField={onSelectField} />
      <AuditActions auditState={invoice.auditState} onSaveTemplate={onSaveTemplate} onApproveAndExport={onApproveAndExport} />
    </div>
  );
}
