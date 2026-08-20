import React, { useState, useEffect } from 'react';
import { IconBolt, IconCoins, IconClock, IconSparkles } from '@tabler/icons-react';
import { LiveMetrics, AuditState } from '../../types/invoice';
import { documentsApi } from '../../services/documentsApi';

interface TopNavbarProps {
  metrics?: LiveMetrics;
  auditState?: AuditState;
  onDemoStateChange?: (state: AuditState) => void;
  onOpenUpload?: () => void;
  onBatchApprove?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  metrics,
  auditState,
  onDemoStateChange,
  onOpenUpload,
  onBatchApprove,
}) => {
  const [totalProcessed, setTotalProcessed] = useState<number | null>(null);
  const [realLatency, setRealLatency] = useState<number>(documentsApi.getLastLatency());

  useEffect(() => {
    async function loadRealStats() {
      try {
        const res = await documentsApi.listDocuments({ page: 1, pageSize: 1 });
        if (res?.counts?.all !== undefined) {
          setTotalProcessed(res.counts.all);
        } else if (res?.total !== undefined) {
          setTotalProcessed(res.total);
        }
        setRealLatency(documentsApi.getLastLatency());
      } catch (err) {
        console.error('Error fetching live navbar stats:', err);
      }
    }

    loadRealStats();
    // Poll every 10 seconds for real-time header sync
    const timer = setInterval(loadRealStats, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 px-6 flex items-center justify-between z-20 border-b border-white/5 bg-titanium-950/40 backdrop-blur-xl">
      {/* Left: View Breadcrumbs / Title */}
      <div className="flex items-center space-x-3">
        <h2 className="text-sm font-semibold tracking-tight text-alabaster-100 uppercase font-mono">
          Workspace Principal
        </h2>
        <span className="text-zinc-500">/</span>
        <span className="text-xs text-zinc-400 font-medium">Reconciliación Determinista</span>
      </div>

      {/* Center/Right: Live System KPI Badges */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl liquid-glass-card border border-white/10 text-xs text-alabaster-200">
          <IconBolt className="w-3.5 h-3.5 text-kono-gold" />
          <span className="font-mono font-medium">
            {totalProcessed !== null ? totalProcessed : (metrics?.invoicesToday || 0)} Procesadas
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-400">
          <IconCoins className="w-3.5 h-3.5" />
          <span className="font-mono font-semibold">$0.00 Tokens</span>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl liquid-glass-card border border-white/10 text-xs text-zinc-300">
          <IconClock className="w-3.5 h-3.5 text-kono-silver" />
          <span className="font-mono">{realLatency.toFixed(1)} ms Latencia</span>
        </div>
      </div>
    </header>
  );
};
