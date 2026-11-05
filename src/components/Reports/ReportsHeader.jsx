// client/src/components/Reports/ReportsHeader.jsx
import React from 'react';
import { RefreshCw, Download, BarChart3, Clock, Layers } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Select from '../ui/Select';

export const TIMEFRAME_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'this_month', label: 'This Month' }
];

export default function ReportsHeader({
  workspace,
  boards = [],
  selectedBoardId,
  onBoardChange,
  selectedTimeframe,
  onTimeframeChange,
  onRefresh,
  refreshing,
  lastUpdated,
  canExport,
  onExportCsv
}) {
  const boardOptions = [
    { id: 'all', label: 'All Boards' },
    ...boards.map((b) => ({ id: String(b.id), label: b.name }))
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
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-medium"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              className="flex items-center gap-1.5 text-xs font-medium border-border hover:border-primary/40 hover:text-primary transition-colors"
              title="Download workspace report as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* Unified Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-xs font-semibold text-text-secondary whitespace-nowrap flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-text-muted" /> Board:
          </span>
          <Select
            value={selectedBoardId}
            onChange={(val) => onBoardChange(val)}
            options={boardOptions}
            className="w-full text-xs"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[170px]">
          <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">
            Timeframe:
          </span>
          <Select
            value={selectedTimeframe}
            onChange={(val) => onTimeframeChange(val)}
            options={TIMEFRAME_OPTIONS}
            className="w-full text-xs"
          />
        </div>
      </div>
    </div>
  );
}

