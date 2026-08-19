import { AmbientBackground } from '../components/layout/AmbientBackground';
import { LandingNav } from '../components/landing/LandingNav';
import { HeroSection } from '../components/landing/HeroSection';
import { ProblemSection } from '../components/landing/ProblemSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { KonoStatesSection } from '../components/landing/KonoStatesSection';
import { MetricsRoiSection } from '../components/landing/MetricsRoiSection';
import { FinalCtaSection } from '../components/landing/FinalCtaSection';
import { LandingFooter } from '../components/landing/LandingFooter';

interface LandingPageProps {
  onEnterApp: () => void;
}

/** Public marketing page introducing Kono.ai before visitors enter the live auditor app. */
export function LandingPage({ onEnterApp }: LandingPageProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#080B11] font-sans text-slate-100 selection:bg-cyan-500/30">
      <AmbientBackground />

      <div className="relative z-10">
        <LandingNav onEnterApp={onEnterApp} />
        <HeroSection onEnterApp={onEnterApp} />
        <ProblemSection />
        <HowItWorksSection />
        <KonoStatesSection />
        <MetricsRoiSection />
        <FinalCtaSection onEnterApp={onEnterApp} />
        <LandingFooter />
      </div>
    </div>
  );
}
