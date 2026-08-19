import { Mail, ScanLine, Binary, ShieldCheck, LayoutDashboard, FileCheck2 } from 'lucide-react';

const STEPS = [
  {
    icon: Mail,
    step: '01',
    title: 'Automated intake',
    description: 'n8n watches your inbox and pulls every invoice attachment the moment it lands, no manual forwarding.',
  },
  {
    icon: ScanLine,
    step: '02',
    title: 'Format triage',
    description: 'Native digital PDFs are parsed as text instantly; scans and photos are routed to multimodal vision.',
  },
  {
    icon: Binary,
    step: '03',
    title: 'Structured extraction',
    description: 'A single-pass model returns a strict JSON schema &mdash; no free text, no back-and-forth prompting.',
  },
  {
    icon: ShieldCheck,
    step: '04',
    title: 'Deterministic validation',
    description: 'Code (not a model) checks line-item math, tax totals, tax-ID format and duplicate embeddings.',
  },
  {
    icon: LayoutDashboard,
    step: '05',
    title: 'Review by exception',
    description: 'Only invoices that fail a check surface in the split-screen auditor. Everything else is already clean.',
  },
  {
    icon: FileCheck2,
    step: '06',
    title: 'Ledger export',
    description: 'Approve with one click and export straight to CSV, JSON or your ERP of choice.',
  },
];

/** Pipeline walkthrough: how a raw invoice becomes a reconciled ledger entry. */
export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-4 px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">From inbox to ledger, fully traceable</h2>
        <p className="mt-4 text-slate-400">
          AI only reads the document. Every calculation, tolerance check and duplicate match runs in deterministic
          code &mdash; so results are reproducible and auditable, every single time.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((item) => (
          <div key={item.step} className="relative rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-glass backdrop-blur-xl">
            <span className="absolute right-5 top-5 font-mono text-2xl font-bold text-white/5">{item.step}</span>
            <div className="mb-3 inline-flex rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-400">
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">{item.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
