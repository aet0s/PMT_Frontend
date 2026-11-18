// client/src/components/Reports/ReportsBoardPerformance.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Kanban,
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  ArrowRight
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatNumber, formatPercent } from './reportsUtils';

export default function ReportsBoardPerformance({
  boards = [],
  getBoardUrl,
  defaultPageSize = 6,
  onViewAll = null,
  title = "Project & Board Performance"
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState('all'); // 'all' | 'attention' | 'on_track' | 'completed'
  const [sortBy, setSortBy] = useState('tasks'); // 'tasks' | 'completion' | 'overdue' | 'name'
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync pageSize if defaultPageSize prop changes
  useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);

  // Compute health counts across all boards
  const healthCounts = useMemo(() => {
    let attention = 0;
    let onTrack = 0;
    let completed = 0;
    boards.forEach((b) => {
      if (b.overdue_tasks > 0) attention++;
      else if (b.completion_rate === 100 && b.total_tasks > 0) completed++;
      else if (b.total_tasks > 0) onTrack++;
    });
    return {
      all: boards.length,
      attention,
      onTrack,
      completed
    };
  }, [boards]);

  // Filter & sort
  const processedBoards = useMemo(() => {
    let list = boards;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          (b.name || '').toLowerCase().includes(q) ||
          (b.workspace_name || '').toLowerCase().includes(q)
      );
    }

    // Health filter
    if (healthFilter === 'attention') {
      list = list.filter((b) => b.overdue_tasks > 0);
    } else if (healthFilter === 'on_track') {
      list = list.filter(
        (b) => b.overdue_tasks === 0 && b.completion_rate < 100 && b.total_tasks > 0
      );
    } else if (healthFilter === 'completed') {
      list = list.filter((b) => b.completion_rate === 100 && b.total_tasks > 0);
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'tasks') return (b.total_tasks || 0) - (a.total_tasks || 0);
      if (sortBy === 'completion') return (b.completion_rate || 0) - (a.completion_rate || 0);
      if (sortBy === 'overdue') return (b.overdue_tasks || 0) - (a.overdue_tasks || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });
  }, [boards, searchQuery, healthFilter, sortBy]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, healthFilter, sortBy, pageSize]);

  const totalItems = processedBoards.length;
  const isAll = pageSize === 'all' || pageSize >= 9999;
  const actualPageSize = isAll ? Math.max(1, totalItems) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / actualPageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedBoards = useMemo(() => {
    if (isAll) return processedBoards;
    const start = (safePage - 1) * actualPageSize;
    return processedBoards.slice(start, start + actualPageSize);
  }, [processedBoards, isAll, safePage, actualPageSize]);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * actualPageSize + 1;
  const endIndex = isAll ? totalItems : Math.min(safePage * actualPageSize, totalItems);

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
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-text-primary">{title}</h2>
              <Badge variant="outline" className="text-xs">
                {boards.length} {boards.length === 1 ? 'board' : 'boards'}
              </Badge>
              {onViewAll && boards.length > Number(pageSize) && (
                <button
                  onClick={onViewAll}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors ml-2"
                >
                  <span>View All ({boards.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">Execution velocity, progress, and overdue indicators by board</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted">
              <ArrowUpDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-text-primary text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="tasks">Most Tasks</option>
                <option value="completion">Highest Progress</option>
                <option value="overdue">Most Overdue</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-56">
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
        </div>

        {/* Filter Pills Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-0.5">
          <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-border text-[11px] overflow-x-auto">
            {[
              { id: 'all', label: 'All Boards', count: healthCounts.all },
              { id: 'attention', label: 'Needs Attention', count: healthCounts.attention },
              { id: 'on_track', label: 'On Track', count: healthCounts.onTrack },
              { id: 'completed', label: 'Completed', count: healthCounts.completed }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHealthFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${healthFilter === tab.id
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-secondary'
                  }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Rows:</span>
            <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-border text-[11px]">
              {[5, 10, 25, 'all'].map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-0.5 rounded capitalize font-medium transition-colors ${pageSize === size
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-text-muted hover:text-text-secondary'
                    }`}
                >
                  {size === 'all' ? 'All' : size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {paginatedBoards.length === 0 ? (
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
                <th className="py-2.5 px-4 text-center">Archived</th>
                <th className="py-2.5 px-4 text-center">Overdue</th>
                <th className="py-2.5 px-4 min-w-[140px]">Progress</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedBoards.map((b) => (
                <tr key={b.id} className="hover:bg-surface-elevated/40 transition-colors group">
                  <td className="py-3 px-4 font-medium text-text-primary">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                        style={{ backgroundColor: b.background_color || 'var(--color-primary)' }}
                      />
                      <span className="font-semibold text-text-primary group-hover:text-primary transition-colors">{b.name}</span>
                      {b.workspace_name && (
                        <Badge variant="secondary" className="text-[10px] ml-1 font-normal">
                          {b.workspace_name}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getHealthBadge(b)}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-text-primary">
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
                  <td className="py-3 px-4 text-center text-text-muted">
                    {b.archived_tasks > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface-muted px-1.5 py-0.5 rounded border border-border/60">
                        {formatNumber(b.archived_tasks)}
                      </span>
                    ) : (
                      '0'
                    )}
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
                        <span className="font-semibold text-text-secondary">{formatPercent(b.completion_rate)}</span>
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
                    {(() => {
                      const targetWsId = b.workspace_id;
                      const boardLink = targetWsId ? `/w/${targetWsId}/p/${b.id}/board` : (getBoardUrl ? getBoardUrl(b.id) : `/b/${b.id}`);
                      return (
                        <a
                          href={boardLink}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-primary transition-colors bg-surface-elevated hover:bg-surface-elevated/80 px-2.5 py-1 rounded-md border border-border"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="p-3 sm:px-5 border-t border-border bg-surface-elevated/30 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-text-muted text-[11px]">
            Showing <span className="font-semibold text-text-primary">{startIndex}</span> to{' '}
            <span className="font-semibold text-text-primary">{endIndex}</span> of{' '}
            <span className="font-semibold text-text-primary">{totalItems}</span> boards
          </div>

          {!isAll && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="w-7 h-7 rounded-md border border-border bg-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] text-text-muted px-2 font-medium">
                Page <span className="font-bold text-text-primary">{safePage}</span> of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="w-7 h-7 rounded-md border border-border bg-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
