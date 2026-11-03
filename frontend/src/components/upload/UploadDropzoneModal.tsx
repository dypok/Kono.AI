import { useState, DragEvent } from 'react';
import { UploadCloud, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface UploadDropzoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesUploaded: (count: number) => void;
}

/** Modal dropzone for bulk invoice ingestion, with a simulated upload progress bar. */
export function UploadDropzoneModal({ isOpen, onClose, onFilesUploaded }: UploadDropzoneModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileCount, setFileCount] = useState(0);

  if (!isOpen) return null;

  function startSimulatedUpload(count: number) {
    setFileCount(count);
    setProgress(20);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onFilesUploaded(count);
            onClose();
            setProgress(null);
          }, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    startSimulatedUpload(event.dataTransfer.files.length || 3);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg space-y-5 rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bulk Invoice Ingestion</h3>
              <p className="text-xs text-slate-400">Digital PDFs, Scans or Images (.pdf, .png, .jpg)</p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => startSimulatedUpload(5)}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all cursor-pointer',
            isDragging ? 'scale-[1.01] border-cyan-400 bg-cyan-500/10' : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/50 hover:bg-white/[0.04]',
          )}
        >
          <div className="mb-3 rounded-full border border-white/10 bg-slate-800/80 p-4 text-cyan-400 shadow-inner">
            <UploadCloud className="h-8 w-8 animate-bounce" />
          </div>

          <p className="text-center text-sm font-semibold text-slate-200">
            Drag invoices here or <span className="text-cyan-400 underline">click to browse</span>
          </p>
          <p className="mt-1 text-center font-mono text-xs text-slate-400">Supports up to 100 files with instant deterministic triage</p>
        </div>

        {progress !== null && (
          <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/60 p-3">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-300">Processing {fileCount} documents...</span>
              <span className="font-bold text-cyan-400">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span>SHA-256 Hashing in &lt; 1ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span>Auto Deskew &amp; Local OCR</span>
          </div>
        </div>
      </div>
    </div>
  );
}
