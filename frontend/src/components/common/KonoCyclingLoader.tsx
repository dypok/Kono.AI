import React, { useState, useEffect } from 'react';
import { KonoCoin } from '../mascot/KonoCoin';
import { AuditState } from '../../types/invoice';

interface KonoCyclingLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Sequence: Green (ok) -> Yellow (warning) -> Red (critical) -> Yellow (warning) -> Repeat
const STATES_SEQUENCE: AuditState[] = ['ok', 'warning', 'critical', 'warning'];

const STATE_MESSAGES: Record<AuditState, string> = {
  ok: 'Auditando comprobantes exactos (Verde)...',
  warning: 'Detectando discrepancias y alertas (Amarillo)...',
  critical: 'Identificando duplicados y bloqueos (Rojo)...',
};

export const KonoCyclingLoader: React.FC<KonoCyclingLoaderProps> = ({
  message,
  size = 'md',
  className = '',
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATES_SEQUENCE.length);
    }, 1100);

    return () => clearInterval(interval);
  }, []);

  const currentState = STATES_SEQUENCE[index];

  return (
    <div className={`py-14 flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="transform transition-transform duration-500 hover:scale-105">
        <KonoCoin state={currentState} size={size} pulse={true} />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-xs text-alabaster-200 font-mono font-medium animate-fade-in">
          {message || STATE_MESSAGES[currentState]}
        </p>
        <div className="flex items-center justify-center space-x-1.5 pt-0.5">
          <span className={`w-2 h-2 rounded-full transition-all duration-300 ${currentState === 'ok' ? 'bg-emerald-400 scale-125 ring-4 ring-emerald-500/20' : 'bg-zinc-600'}`} />
          <span className={`w-2 h-2 rounded-full transition-all duration-300 ${currentState === 'warning' ? 'bg-amber-400 scale-125 ring-4 ring-amber-500/20' : 'bg-zinc-600'}`} />
          <span className={`w-2 h-2 rounded-full transition-all duration-300 ${currentState === 'critical' ? 'bg-rose-400 scale-125 ring-4 ring-rose-500/20' : 'bg-zinc-600'}`} />
        </div>
      </div>
    </div>
  );
};
