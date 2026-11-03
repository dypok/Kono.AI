import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';

interface DashboardFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  yearFilter: string;
  onYearFilterChange: (year: string) => void;
  counts: {
    all: number;
    green: number;
    yellow: number;
    red: number;
  };
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  yearFilter,
  onYearFilterChange,
  counts,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por emisor, NIT o folio..."
          className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition shadow-inner font-mono"
        />
      </div>

      {/* Filter Tabs & Year Select */}
      <div className="flex items-center space-x-2">
        {/* Status Filters */}
        <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 text-xs font-medium">
          <button
            onClick={() => onStatusFilterChange('ALL')}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === 'ALL'
                ? 'bg-white/15 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({counts.all})
          </button>
          <button
            onClick={() => onStatusFilterChange('GREEN')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
              statusFilter === 'GREEN'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-emerald-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Auditadas ({counts.green})</span>
          </button>
          <button
            onClick={() => onStatusFilterChange('YELLOW')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
              statusFilter === 'YELLOW'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-amber-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Alertas ({counts.yellow})</span>
          </button>
          <button
            onClick={() => onStatusFilterChange('RED')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
              statusFilter === 'RED'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-zinc-400 hover:text-rose-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Rechazadas ({counts.red})</span>
          </button>
        </div>

        {/* Year Filter */}
        <div className="relative">
          <select
            value={yearFilter}
            onChange={(e) => onYearFilterChange(e.target.value)}
            aria-label="Filtrar por año de emisión"
            className="pl-8 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-white/30 cursor-pointer appearance-none"
          >
            <option value="ALL" className="bg-titanium-900 text-white">Todos los Años</option>
            <option value="2026" className="bg-titanium-900 text-white">2026</option>
            <option value="2025" className="bg-titanium-900 text-white">2025</option>
            <option value="2024" className="bg-titanium-900 text-white">2024</option>
          </select>
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
