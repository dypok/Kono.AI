import { Save, CheckCircle2, ArrowRight } from 'lucide-react';
import { AuditState } from '../../types/invoice';
import { cn } from '../../lib/cn';

interface AuditActionsProps {
  auditState: AuditState;
  onSaveTemplate: () => void;
  onApproveAndExport: () => void;
}

/** Bottom floating actions: save vendor template + approve & export to ERP. */
export function AuditActions({ auditState, onSaveTemplate, onApproveAndExport }: AuditActionsProps) {
  const blocked = auditState === 'critical';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <button
        type="button"
        onClick={onSaveTemplate}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-slate-200 shadow-sm backdrop-blur-md transition-all hover:bg-white/[0.09] active:scale-95"
      >
        <Save className="h-4 w-4 text-cyan-400" />
        <span>Save Vendor Template</span>
      </button>

      <button
        type="button"
        onClick={onApproveAndExport}
        disabled={blocked}
        className={cn(
          'flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-semibold shadow-glass transition-all',
          blocked
            ? 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500'
            : 'border border-emerald-300/40 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-glass-glow-emerald hover:from-emerald-400 hover:to-teal-300 active:scale-95',
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>Approve &amp; Export to ERP (1-Click)</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
