// client/src/components/Reports/ReportsBoardPerformance.jsx
import React, { useState, useMemo } from 'react';
import { Kanban, Search, ExternalLink, AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { formatNumber, formatPercent } from './reportsUtils';

export default function ReportsBoardPerformance({ boards = [], getBoardUrl }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBoards = useMemo(() => {
    if (!searchQuery.trim()) return boards;
    const q = searchQuery.toLowerCase();
    return boards.filter((b) => (b.name || '').toLowerCase().includes(q));
  }, [boards, searchQuery]);

  const getHealthBadge = (board) => {
    if (board.total_tasks === 0) {
      return <Badge variant="secondary" className="text-[10px]">Empty</Badge>;
    }
    if (board.overdue_tasks > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
          <AlertTriangle className="w-3 h-3" /> Needs Attention
        </span>
      );
    }
    if (board.completion_rate === 100) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
        On Track
      </span>
    );
  };

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Header & Search */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text-primary">Project & Board Performance</h2>
            <Badge variant="outline" className="text-xs">
              {boards.length} {boards.length === 1 ? 'board' : 'boards'}
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-0.5">Execution velocity, progress, and overdue indicators by board</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
        </div>
      </div>

      {filteredBoards.length === 0 ? (
        <div className="p-8 text-center bg-surface">
          <Layers className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-text-secondary">No boards match your filter</p>
          <p className="text-[11px] text-text-muted mt-0.5">Try adjusting your search criteria or filter scope</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-elevated/80 border-b border-border text-text-muted font-semibold">
                <th className="py-2.5 px-4">Board Name</th>
                <th className="py-2.5 px-4">Health</th>
                <th className="py-2.5 px-4 text-center">Total</th>
                <th className="py-2.5 px-4 text-center">To Do</th>
                <th className="py-2.5 px-4 text-center">In Progress</th>
                <th className="py-2.5 px-4 text-center">Completed</th>
                <th className="py-2.5 px-4 text-center">Overdue</th>
                <th className="py-2.5 px-4 min-w-[140px]">Progress</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredBoards.map((b) => (
                <tr key={b.id} className="hover:bg-surface-elevated/40 transition-colors group">
                  <td className="py-3 px-4 font-medium text-text-primary">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                        style={{ backgroundColor: b.background_color || '#3b82f6' }}
                      />
                      <span className="font-semibold">{b.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getHealthBadge(b)}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-text-primary">
                    {formatNumber(b.total_tasks)}
                  </td>
                  <td className="py-3 px-4 text-center text-text-secondary">
                    {formatNumber(b.todo_tasks)}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-600 dark:text-blue-400 font-medium">
                    {formatNumber(b.in_progress_tasks)}
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatNumber(b.completed_tasks)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {b.overdue_tasks > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {formatNumber(b.overdue_tasks)}
                      </span>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-text-secondary">{formatPercent(b.completion_rate)}</span>
                      </div>
                      <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, b.completion_rate || 0)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <a
                      href={getBoardUrl ? getBoardUrl(b.id) : `/b/${b.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-primary transition-colors bg-surface-elevated hover:bg-surface-elevated/80 px-2.5 py-1 rounded-md border border-border"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

