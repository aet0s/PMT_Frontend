// client/src/components/Reports/ReportsHeader.jsx
import React from 'react';
import { RefreshCw, Download, BarChart3, Clock, Layers, Calendar } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Select from '../ui/Select';

export const TIMEFRAME_OPTIONS = [
  { value: 'all', id: 'all', label: 'All Time' },
  { value: '7d', id: '7d', label: 'Last 7 Days' },
  { value: '30d', id: '30d', label: 'Last 30 Days' },
  { value: '90d', id: '90d', label: 'Last 90 Days' },
  { value: 'this_month', id: 'this_month', label: 'This Month' }
];

export default function ReportsHeader({
  workspace,
  boards = [],
  selectedBoardId = 'all',
  onBoardChange,
  selectedTimeframe = 'all',
  onTimeframeChange,
  onRefresh,
  refreshing,
  lastUpdated,
  canExport,
  onExportCsv
}) {
  const boardOptions = [
    { value: 'all', id: 'all', label: 'All Boards' },
    ...boards.map((b) => ({ value: String(b.id), id: String(b.id), label: b.name }))
  ];

  const formatLastUpdated = (date) => {
    if (!date) return 'Just now';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-4 bg-surface border border-border rounded-xl p-5 shadow-xs">
      {/* Title & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary tracking-tight">Workspace Reports</h1>
              {workspace?.name && (
                <Badge variant="secondary" className="font-medium text-xs">
                  {workspace.name}
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : 'text-text-muted'}`} />}
            className="h-9 px-3 text-xs font-medium border-border/80 hover:bg-surface-muted hover:border-border transition-colors shadow-xs"
            title="Refresh analytics data"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              leftIcon={<Download className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors" />}
              className="group h-9 px-3.5 text-xs font-medium border-border/80 hover:border-primary/40 hover:text-primary hover:bg-primary-tint/30 transition-colors shadow-xs"
              title="Download workspace report as CSV"
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Unified Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 pt-3.5 border-t border-border/60">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-text-secondary whitespace-nowrap flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-text-muted" /> Board:
          </span>
          <div className="w-48 sm:w-56">
            <Select
              value={selectedBoardId || 'all'}
              onChange={(val) => onBoardChange?.(val)}
              options={boardOptions}
              size="sm"
              className="text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-text-secondary whitespace-nowrap flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-text-muted" /> Timeframe:
          </span>
          <div className="w-40 sm:w-48">
            <Select
              value={selectedTimeframe || 'all'}
              onChange={(val) => onTimeframeChange?.(val)}
              options={TIMEFRAME_OPTIONS}
              size="sm"
              className="text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
