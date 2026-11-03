import { Clock3, FileWarning, Copy, GitCompareArrows } from 'lucide-react';

const PAIN_POINTS = [
  {
    icon: Clock3,
    title: 'Month-end bottlenecks',
    description: 'Finance teams burn hours retyping invoice fields by hand right when the close is most time-sensitive.',
  },
  {
    icon: FileWarning,
    title: 'Silent arithmetic errors',
    description: 'Wrong subtotals, mis-applied tax rates and rounding mistakes slip through and distort your books.',
  },
  {
    icon: Copy,
    title: 'Duplicate payments',
    description: 'The same invoice arrives twice with a slightly different filename and gets paid twice before anyone notices.',
  },
  {
    icon: GitCompareArrows,
    title: 'Lost traceability',
    description: 'What landed in the inbox and what got recorded in the ERP quietly drift apart over time.',
  },
];

/** Problem framing section: the operational pain Kono.ai removes. */
export function ProblemSection() {
  return (
    <section className="mx-4 px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Manual invoice processing doesn&apos;t scale</h2>
        <p className="mt-4 text-slate-400">
          PDFs arrive in every shape imaginable &mdash; native digital exports, low-res scans, phone photos, register
          receipts. Handling them by hand introduces the exact risks accounting teams can&apos;t afford.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PAIN_POINTS.map((point) => (
          <div
            key={point.title}
            className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-glass backdrop-blur-xl transition-all hover:border-white/20"
          >
            <div className="mb-3 inline-flex rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-rose-400">
              <point.icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">{point.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{point.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
