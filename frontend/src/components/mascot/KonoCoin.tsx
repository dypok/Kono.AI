import { AuditState } from '../../types/invoice';
import { cn } from '../../lib/cn';

interface KonoCoinProps {
  state: AuditState;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<KonoCoinProps['size']>, string> = {
  sm: 'h-11 w-11',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
};

const HALO_CLASSES: Record<AuditState, string> = {
  ok: 'border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.3)]',
  warning: 'border-amber-400/50 bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.3)]',
  critical: 'border-rose-400/50 bg-rose-500/10 shadow-[0_0_25px_rgba(239,68,68,0.3)]',
};

/**
 * Kono — the platinum coin mascot. A single SVG body is reused across the
 * three audit moods; only the face, hands and small "props" (thumbs up,
 * magnifying glass, badge) swap based on `state`.
 */
export function KonoCoin({ state, size = 'md', pulse = true, className }: KonoCoinProps) {
  return (
    <div className={cn('relative flex items-center justify-center rounded-full', SIZE_CLASSES[size], className)}>
      <span
        className={cn(
          'absolute inset-0 rounded-full border transition-colors duration-500',
          HALO_CLASSES[state],
          pulse && 'animate-pulse-slow',
        )}
        aria-hidden
      />

      <svg viewBox="0 0 128 128" className="relative z-10 h-full w-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="konoBody" cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="30%" stopColor="#E2E8F0" />
            <stop offset="65%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
          <linearGradient id="konoRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="55%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
          <linearGradient id="konoEye" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>

        {/* Coin body */}
        <circle cx="64" cy="64" r="58" fill="url(#konoRim)" />
        <circle cx="64" cy="64" r="52" fill="url(#konoBody)" stroke="#CBD5E1" strokeWidth="1.5" />
        <circle cx="64" cy="64" r="45" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 4" opacity="0.55" />

        {state === 'ok' && <OkFace />}
        {state === 'warning' && <WarningFace />}
        {state === 'critical' && <CriticalFace />}
      </svg>
    </div>
  );
}

/** Happy / winking, one glove giving a thumbs up. */
function OkFace() {
  return (
    <g>
      <ellipse cx="49" cy="54" rx="6.5" ry="8.5" fill="url(#konoEye)" />
      <circle cx="51.5" cy="50.5" r="2.6" fill="#FFFFFF" />
      <path d="M72 56 Q80 47 88 56" stroke="#0F172A" strokeWidth="3.6" strokeLinecap="round" fill="none" />

      <ellipse cx="43" cy="62" rx="4.2" ry="2.6" fill="#10B981" opacity="0.4" />
      <ellipse cx="85" cy="62" rx="4.2" ry="2.6" fill="#10B981" opacity="0.4" />

      <path d="M51 69 Q64 84 77 69" stroke="#0F172A" strokeWidth="3.6" strokeLinecap="round" fill="#0F172A" />
      <path d="M58 76 Q64 82 70 76" fill="#10B981" stroke="#0F172A" strokeWidth="1" />

      {/* Thumbs-up glove */}
      <g transform="translate(90, 46) scale(0.72)">
        <circle cx="20" cy="22" r="15" fill="#F8FAFC" stroke="#0F172A" strokeWidth="3" />
        <path d="M17 10 Q13 1 20 1 Q27 1 25 15" fill="#F8FAFC" stroke="#0F172A" strokeWidth="3" />
        <line x1="13" y1="18" x2="23" y2="18" stroke="#CBD5E1" strokeWidth="2" />
      </g>

      {/* Small waving glove */}
      <g transform="translate(2, 50) scale(0.62)">
        <circle cx="16" cy="18" r="13" fill="#F8FAFC" stroke="#0F172A" strokeWidth="3" />
        <path d="M12 12 Q8 4 14 6 Q20 8 18 16" fill="#F8FAFC" stroke="#0F172A" strokeWidth="3" />
      </g>
    </g>
  );
}

/** Puzzled expression, holding a magnifying glass up to one eye. */
function WarningFace() {
  return (
    <g>
      <path d="M40 43 Q49 38 56 45" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M72 47 Q79 40 88 43" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" fill="none" />

      <ellipse cx="49" cy="55" rx="7.5" ry="9.5" fill="url(#konoEye)" />
      <circle cx="51.5" cy="51.5" r="2.6" fill="#FFFFFF" />

      <ellipse cx="79" cy="55" rx="5.5" ry="6.5" fill="url(#konoEye)" />
      <circle cx="80.5" cy="53" r="1.9" fill="#FFFFFF" />

      <path d="M51 74 Q58 68 64 74 Q70 80 77 73" stroke="#0F172A" strokeWidth="3.6" strokeLinecap="round" fill="none" />

      {/* Magnifying glass held up to the right eye */}
      <g transform="translate(70, 40) scale(0.68)">
        <circle cx="26" cy="26" r="19" fill="#F59E0B" fillOpacity="0.22" stroke="#F59E0B" strokeWidth="3.6" />
        <circle cx="21" cy="21" r="12" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.55" strokeDasharray="5 10" />
        <line x1="39" y1="39" x2="55" y2="55" stroke="#0F172A" strokeWidth="6.4" strokeLinecap="round" />
        <circle cx="46" cy="46" r="10.5" fill="#F8FAFC" stroke="#0F172A" strokeWidth="2.6" />
      </g>
    </g>
  );
}

/** Stern detective look, arms folded, small badge pinned on the chest. */
function CriticalFace() {
  return (
    <g>
      <path d="M40 45 L56 51" stroke="#0F172A" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M88 45 L72 51" stroke="#0F172A" strokeWidth="3.6" strokeLinecap="round" />

      <ellipse cx="49" cy="56" rx="6.2" ry="7.4" fill="url(#konoEye)" />
      <circle cx="51" cy="53.5" r="2" fill="#FFFFFF" />
      <ellipse cx="79" cy="56" rx="6.2" ry="7.4" fill="url(#konoEye)" />
      <circle cx="77" cy="53.5" r="2" fill="#FFFFFF" />

      <line x1="53" y1="72" x2="75" y2="72" stroke="#0F172A" strokeWidth="3.6" strokeLinecap="round" />

      {/* Badge */}
      <path
        d="M64 78 L66.5 82.5 L71.5 83.5 L68 87 L69 92 L64 89.6 L59 92 L60 87 L56.5 83.5 L61.5 82.5 Z"
        fill="#F59E0B"
        stroke="#B45309"
        strokeWidth="1"
      />

      {/* Folded arms */}
      <g transform="translate(36, 82)">
        <path d="M4 9 Q28 20 52 9" stroke="#0F172A" strokeWidth="7.4" strokeLinecap="round" fill="none" />
        <circle cx="8" cy="8" r="7.4" fill="#F8FAFC" stroke="#0F172A" strokeWidth="2.6" />
        <circle cx="48" cy="8" r="7.4" fill="#F8FAFC" stroke="#0F172A" strokeWidth="2.6" />
      </g>
    </g>
  );
}
