import { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { AuditorPage } from './pages/AuditorPage';

type View = 'landing' | 'auditor';

/**
 * Top-level view switcher. There is no router in this project yet, so the
 * marketing landing page and the live auditor app are toggled with local
 * state instead of separate routes.
 */
export default function App() {
  const [view, setView] = useState<View>('landing');

  if (view === 'auditor') {
    return <AuditorPage onBackToSite={() => setView('landing')} />;
  }

  return <LandingPage onEnterApp={() => setView('auditor')} />;
}
