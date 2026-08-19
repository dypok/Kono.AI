import { AuditState } from '../../types/invoice';
import { KonoCoin } from '../mascot/KonoCoin';
import { cn } from '../../lib/cn';

interface KonoStateCard {
  state: AuditState;
  badge: string;
  title: string;
  description: string;
  trigger: string;
  accentClass: string;
}

const STATE_CARDS: KonoStateCard[] = [
  {
    state: 'ok',
    badge: '🟢 Green',
    title: 'Approved automatically',
    description: 'Exact arithmetic match, a valid tax ID and no duplicate on file. One click sends it straight to the ledger.',
    trigger: 'Trigger: |Δ| ≤ $0.02, no duplicate found (similarity < 0.85)',
    accentClass: 'border-emerald-500/30 hover:border-emerald-400/50',
  },
  {
    state: 'warning',
    badge: '🟡 Yellow',
    title: 'Needs a quick look',
    description: 'A rounding mismatch, an unidentified tax rate or a low-confidence field. Kono points straight at the row to fix.',
    trigger: 'Trigger: |Δ| > $0.02, unclear tax rate, or low OCR confidence',
    accentClass: 'border-amber-500/30 hover:border-amber-400/50',
  },
  {
    state: 'critical',
    badge: '🔴 Red',
    title: 'Blocked as a precaution',
    description: 'A near-identical invoice was already booked, or the issuer tax ID looks fraudulent. Export stays locked until a supervisor signs off.',
    trigger: 'Trigger: semantic duplicate (cosine similarity ≥ 0.95) or invalid issuer',
    accentClass: 'border-rose-500/30 hover:border-rose-400/50',
  },
];

/** Explains the three Kono mascot moods and exactly what condition triggers each one. */
export function KonoStatesSection() {
  return (
    <section id="kono-states" className="mx-4 px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Meet Kono, your visual auditor</h2>
        <p className="mt-4 text-slate-400">
          A single glance at Kono&apos;s mood tells you whether an invoice is ready to book, worth a quick check, or
          flagged for review &mdash; no need to read every field yourself.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {STATE_CARDS.map((card) => (
          <div
            key={card.state}
            className={cn(
              'flex flex-col items-center rounded-2xl border bg-slate-900/40 p-6 text-center shadow-glass backdrop-blur-xl transition-all',
              card.accentClass,
            )}
          >
            <KonoCoin state={card.state} size="lg" />
            <span className="mt-4 font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">{card.badge}</span>
            <h3 className="mt-1 text-lg font-bold text-white">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.description}</p>
            <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-slate-500">
              {card.trigger}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
