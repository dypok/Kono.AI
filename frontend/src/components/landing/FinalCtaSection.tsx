import { ArrowRight, Sparkles } from 'lucide-react';
import { KonoCoin } from '../mascot/KonoCoin';

interface FinalCtaSectionProps {
  onEnterApp: () => void;
}

/** Closing call-to-action inviting the visitor into the live auditor app. */
export function FinalCtaSection({ onEnterApp }: FinalCtaSectionProps) {
  return (
    <section className="mx-4 px-4 py-16 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-10 text-center shadow-glass backdrop-blur-2xl">
        <KonoCoin state="ok" size="md" />

        <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to see Kono audit a real invoice?</h2>
        <p className="max-w-xl text-sm text-slate-400 sm:text-base">
          Jump straight into the split-screen auditor with a sample invoice already loaded &mdash; toggle between the
          three Kono states and see the bounding boxes light up in real time.
        </p>

        <button
          type="button"
          onClick={onEnterApp}
          className="flex items-center gap-2 rounded-xl border border-emerald-300/40 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-glass-glow-emerald transition-all hover:from-emerald-400 hover:to-teal-300 active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          <span>Launch Auditor App</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
