import { TrendingDown, ShieldAlert, Lock, Workflow } from 'lucide-react';

const ROI_ITEMS = [
  {
    icon: TrendingDown,
    value: '85%',
    label: 'less time spent on manual capture and review',
  },
  {
    icon: ShieldAlert,
    value: '0',
    label: 'month-end mismatches caused by mistyped tax or totals',
  },
  {
    icon: Lock,
    value: 'Real-time',
    label: 'duplicate detection before a payment is ever scheduled',
  },
  {
    icon: Workflow,
    value: '0',
    label: 'changes required to vendor channels or your existing ERP',
  },
];

/** ROI proof points, mirrored from the business case for finance stakeholders. */
export function MetricsRoiSection() {
  return (
    <section id="roi" className="mx-4 px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Built for measurable financial impact</h2>
        <p className="mt-4 text-slate-400">
          Kono.ai is designed to plug into how your finance team already works &mdash; same inbox, same ERP, same
          approval habits, just without the manual grind.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ROI_ITEMS.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-center shadow-glass backdrop-blur-xl">
            <div className="mx-auto mb-3 inline-flex rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-400">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="font-mono text-2xl font-bold text-white">{item.value}</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-md">
        <p className="text-sm italic text-slate-300">
          &ldquo;Zero data entry, zero mismatched books: Kono processes, audits and reconciles your invoices before they
          ever touch your ledger.&rdquo;
        </p>
      </div>
    </section>
  );
}
