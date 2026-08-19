import React, { useState } from 'react';
import { UploadCloud, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface DropzoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesUploaded: (count: number) => void;
}

export const DropzoneModal: React.FC<DropzoneModalProps> = ({
  isOpen,
  onClose,
  onFilesUploaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [filesCount, setFilesCount] = useState<number>(0);

  if (!isOpen) return null;

  const handleSimulatedUpload = (count: number) => {
    setFilesCount(count);
    setUploadProgress(20);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onFilesUploaded(count);
            onClose();
            setUploadProgress(null);
          }, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ingesta Masiva de Facturas</h3>
              <p className="text-xs text-slate-400">PDFs Digitales, Escaneos o Imágenes (.pdf, .png, .jpg)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const count = e.dataTransfer.files.length || 3;
            handleSimulatedUpload(count);
          }}
          onClick={() => handleSimulatedUpload(5)}
          className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            isDragging
              ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
              : 'border-white/15 bg-white/[0.02] hover:border-cyan-400/50 hover:bg-white/[0.04]'
          }`}
        >
          <div className="p-4 rounded-full bg-slate-800/80 border border-white/10 mb-3 text-cyan-400 shadow-inner">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>

          <p className="text-sm font-semibold text-slate-200 text-center">
            Arrastra tus facturas aquí o <span className="text-cyan-400 underline">haz clic para explorar</span>
          </p>
          <p className="text-xs text-slate-400 mt-1 text-center font-mono">
            Soporta hasta 100 archivos en simultáneo con triage Rust instantáneo
          </p>
        </div>

        {/* Upload Progress */}
        {uploadProgress !== null && (
          <div className="space-y-2 p-3 rounded-xl bg-slate-950/60 border border-white/10">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Procesando {filesCount} comprobantes...</span>
              <span className="text-cyan-400 font-bold">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Features */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 font-mono">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Hashing SHA-256 en &lt; 1ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Deskew & OCR Local Automático</span>
          </div>
        </div>

      </div>
    </div>
  );
};
