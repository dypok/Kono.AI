import { Sparkles } from 'lucide-react';

interface ToastProps {
  message: string;
}

/** Bottom-right floating notification toast. */
export function Toast({ message }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/95 px-5 py-3 text-xs font-medium text-white shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-5 duration-200">
      <Sparkles className="h-4 w-4 shrink-0 text-cyan-400" />
      <span>{message}</span>
    </div>
  );
}
