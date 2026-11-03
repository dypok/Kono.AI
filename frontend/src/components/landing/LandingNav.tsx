import { Rocket, ArrowRight } from 'lucide-react';
import { KonoCoin } from '../mascot/KonoCoin';

interface LandingNavProps {
  onEnterApp: () => void;
}

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#kono-states', label: 'Kono states' },
  { href: '#roi', label: 'ROI' },
];

/** Floating frosted-glass navigation bar for the marketing landing page. */
export function LandingNav({ onEnterApp }: LandingNavProps) {
  return (
    <header className="sticky top-3 z-40 mx-4 my-3">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-3 shadow-glass backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <KonoCoin state="ok" size="sm" pulse={false} />
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            Kono<span className="text-cyan-400">.ai</span>
          </span>
        </div>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={onEnterApp}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-glass-glow-cyan transition-all hover:from-cyan-400 hover:to-emerald-300 active:scale-95"
        >
          <Rocket className="h-4 w-4" />
          <span>Launch Auditor App</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
