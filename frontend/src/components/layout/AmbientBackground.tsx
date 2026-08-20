/** Fixed radial ambient glow layer sitting behind the glass panels. */
export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div className="absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-indigo-950/40 blur-[140px]" />
      <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-cyan-950/30 blur-[140px]" />
      <div className="absolute -bottom-40 left-1/3 h-[600px] w-[600px] rounded-full bg-emerald-950/20 blur-[160px]" />
    </div>
  );
}
