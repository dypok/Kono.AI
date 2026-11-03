import { ArrowRight, PlayCircle, ShieldCheck } from 'lucide-react';
import { KonoCoin } from '../mascot/KonoCoin';

interface HeroSectionProps {
  onEnterApp: () => void;
}

/** Above-the-fold hero: value proposition, primary CTA and a live preview of Kono's mood halo. */
export function HeroSection({ onEnterApp }: HeroSectionProps) {
  return (
    <section className="relative mx-4 mt-4 grid grid-cols-1 items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:px-8">
      <div className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 font-mono text-xs text-cyan-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Deterministic AP Automation
        </span>

        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Zero data entry. <br />
          <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">Zero mismatched books.</span>
        </h1>

        <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Kono.ai extracts, validates and reconciles your invoices before they ever touch your ledger. Every total is
          checked by deterministic code, not a language model &mdash; so the math is always exact, down to the cent.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            onClick={onEnterApp}
            className="flex items-center gap-2 rounded-xl border border-emerald-300/40 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-glass-glow-emerald transition-all hover:from-emerald-400 hover:to-teal-300 active:scale-95"
          >
            <span>Launch Auditor App</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 backdrop-blur-md transition-all hover:bg-white/[0.08]"
          >
            <PlayCircle className="h-4 w-4 text-cyan-400" />
            <span>See how it works</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-4 font-mono text-xs text-slate-400">
          <span>
            <span className="font-semibold text-white">95%</span> deterministic, zero-token processing
          </span>
          <span>
            <span className="font-semibold text-white">11.4 ms</span> avg. extraction latency
          </span>
          <span>
            <span className="font-semibold text-white">85%</span> less manual review time
          </span>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="absolute h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-slate-900/40 p-10 shadow-glass backdrop-blur-xl">
          <KonoCoin state="ok" size="lg" />
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center backdrop-blur-md">
            <p className="text-sm font-medium text-slate-200">
              &ldquo;Everything checks out to the exact cent! Ready for 1-click ledger export.&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-3 py-1.5 font-mono text-xs text-emerald-300/90">
            <span>Σ Items ($1,500.00) + Tax ($285.00) = $1,785.00 [Δ = $0.00]</span>
          </div>
        </div>
      </div>
    </section>
  );
}
