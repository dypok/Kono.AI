import { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: JSX.Element;
  active?: boolean;
}

/** Compact frosted-glass input used across the audit form, with an active/focused glow state. */
export function GlassInput({ label, icon, active, className, onFocus, ...rest }: GlassInputProps) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
        {icon}
        {label}
      </label>
      <input
        {...rest}
        onFocus={onFocus}
        className={cn(
          'w-full rounded-xl border bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-slate-100 backdrop-blur-md transition-all focus:outline-none',
          active
            ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/40'
            : 'border-white/[0.08] hover:border-white/20 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20',
          className,
        )}
      />
    </div>
  );
}
