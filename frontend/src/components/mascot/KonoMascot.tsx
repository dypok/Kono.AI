import React from 'react';
import { KonoStatus } from '../../types/invoice';

interface KonoMascotProps {
  status: KonoStatus;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const KonoMascot: React.FC<KonoMascotProps> = ({
  status,
  size = 'md',
  showPulse = true,
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const haloStyles = {
    green: 'shadow-[0_0_25px_rgba(16,185,129,0.4)] border-emerald-400/40 bg-emerald-500/10',
    yellow: 'shadow-[0_0_25px_rgba(245,158,11,0.4)] border-amber-400/40 bg-amber-500/10',
    red: 'shadow-[0_0_25px_rgba(239,68,68,0.4)] border-rose-400/40 bg-rose-500/10',
  };

  return (
    <div className={`relative flex items-center justify-center rounded-full transition-all duration-500 ${sizeMap[size]}`}>
      {/* Outer Frosted Halo Aura */}
      <div
        className={`absolute inset-0 rounded-full border transition-all duration-500 ${
          haloStyles[status]
        } ${showPulse ? 'animate-pulse-slow' : ''}`}
      />

      {/* SVG Character */}
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full relative z-10 drop-shadow-md transition-transform duration-300 hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Silver/Chrome Radial Gradient for Coin Body */}
          <radialGradient id="silverBody" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#E2E8F0" />
            <stop offset="60%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>

          {/* Rim Metallic Gradient */}
          <linearGradient id="silverRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="50%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Eye Sparkle */}
          <linearGradient id="eyeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* Coin Outer Edge / Rim */}
        <circle cx="60" cy="60" r="54" stroke="url(#silverRim)" strokeWidth="5" fill="#334155" />
        <circle cx="60" cy="60" r="49" fill="url(#silverBody)" stroke="#CBD5E1" strokeWidth="1.5" />

        {/* Engraved Coin Concentric Ring Detail */}
        <circle cx="60" cy="60" r="43" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

        {/* -------------------- STATE 1: GREEN (Happy / Winking / Thumbs Up) -------------------- */}
        {status === 'green' && (
          <g className="transition-all duration-300">
            {/* Left Eye (Open with gleam) */}
            <ellipse cx="46" cy="50" rx="6" ry="8" fill="url(#eyeGradient)" />
            <circle cx="48" cy="47" r="2.5" fill="#FFFFFF" />
            <circle cx="44" cy="53" r="1" fill="#FFFFFF" />

            {/* Right Eye (Winking Curve) */}
            <path
              d="M68 52 Q75 44 82 52"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Rosy Cheeks */}
            <ellipse cx="40" cy="58" rx="4" ry="2.5" fill="#10B981" opacity="0.4" />
            <ellipse cx="80" cy="58" rx="4" ry="2.5" fill="#10B981" opacity="0.4" />

            {/* Big Smile */}
            <path
              d="M48 64 Q60 78 72 64"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="#0F172A"
            />
            {/* Smile Tongue */}
            <path
              d="M54 70 Q60 76 66 70"
              fill="#10B981"
              stroke="#0F172A"
              strokeWidth="1"
            />

            {/* Cartoon Gloves: Right Hand Thumbs Up */}
            <g transform="translate(86, 45) scale(0.65)">
              <circle cx="20" cy="20" r="14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
              <path d="M18 10 Q14 2 20 2 Q26 2 24 14" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
              <line x1="14" y1="16" x2="22" y2="16" stroke="#CBD5E1" strokeWidth="2" />
            </g>

            {/* Left Hand Waving */}
            <g transform="translate(2, 48) scale(0.65)">
              <circle cx="16" cy="18" r="13" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
              <path d="M12 12 Q8 4 14 6 Q20 8 18 16" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
            </g>
          </g>
        )}

        {/* -------------------- STATE 2: YELLOW (Puzzled / Magnifying Glass) -------------------- */}
        {status === 'yellow' && (
          <g className="transition-all duration-300">
            {/* Puzzled Eyebrows */}
            <path d="M38 40 Q46 36 52 42" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M68 44 Q74 38 82 40" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Left Eye (Wide open) */}
            <ellipse cx="46" cy="50" rx="7" ry="9" fill="url(#eyeGradient)" />
            <circle cx="48" cy="47" r="2.5" fill="#FFFFFF" />

            {/* Right Eye (Squinting behind glass) */}
            <ellipse cx="74" cy="50" rx="5" ry="6" fill="url(#eyeGradient)" />
            <circle cx="75" cy="48" r="1.8" fill="#FFFFFF" />

            {/* Wavy Puzzled Mouth */}
            <path
              d="M48 68 Q54 62 60 68 Q66 74 72 67"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Magnifying Glass Tool */}
            <g transform="translate(68, 38) scale(0.65)">
              {/* Glass Lens with frosted amber glow */}
              <circle cx="24" cy="24" r="18" fill="#F59E0B" fillOpacity="0.25" stroke="#F59E0B" strokeWidth="3.5" />
              <circle cx="20" cy="20" r="12" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" strokeDasharray="6 12" />
              {/* Handle */}
              <line x1="37" y1="37" x2="52" y2="52" stroke="#0F172A" strokeWidth="6" strokeLinecap="round" />
              {/* Cartoon Glove holding handle */}
              <circle cx="42" cy="42" r="10" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
            </g>
          </g>
        )}

        {/* -------------------- STATE 3: RED (Detective / Arms Folded / Badge) -------------------- */}
        {status === 'red' && (
          <g className="transition-all duration-300">
            {/* Stern Eyebrows angled inward */}
            <path d="M38 42 L52 47" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M82 42 L68 47" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />

            {/* Stern Eyes */}
            <ellipse cx="46" cy="52" rx="6" ry="7" fill="url(#eyeGradient)" />
            <circle cx="48" cy="50" r="2" fill="#FFFFFF" />

            <ellipse cx="74" cy="52" rx="6" ry="7" fill="url(#eyeGradient)" />
            <circle cx="72" cy="50" r="2" fill="#FFFFFF" />

            {/* Straight Stern Mouth */}
            <line x1="50" y1="67" x2="70" y2="67" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />

            {/* Detective Star Badge on Coin */}
            <path
              d="M60 72 L62 76 L66 77 L63 80 L64 84 L60 82 L56 84 L57 80 L54 77 L58 76 Z"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="1"
            />

            {/* Folded Arms (Gloves Crossed) */}
            <g transform="translate(34, 76)">
              <path
                d="M4 8 Q26 18 48 8"
                stroke="#0F172A"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="8" cy="7" r="7" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
              <circle cx="44" cy="7" r="7" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};
