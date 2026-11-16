// client/src/components/Reports/ReportsAttentionList.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Calendar,
  FolderKanban,
  Users,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { formatDate } from '../../lib/dateFormat';
import { formatNumber } from './reportsUtils';

export default function ReportsAttentionList({
  overdueTasks = [],
  canViewTeam = false,
  getBoardUrl,
  defaultPageSize = 5,
  onViewAll = null,
  title = "Tasks Requiring Attention"
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('overdue_desc'); // 'overdue_desc' | 'due_date_asc' | 'title_asc'
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync pageSize if defaultPageSize changes
  useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);

  // Filter & sort
  const processedTasks = useMemo(() => {
    let list = overdueTasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => {
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const boardMatch = (t.board_name || '').toLowerCase().includes(q);
        const listMatch = (t.list_name || '').toLowerCase().includes(q);
        const wsMatch = (t.workspace_name || '').toLowerCase().includes(q);
        const assigneeMatch = (t.members || []).some((m) =>
          (m.name || '').toLowerCase().includes(q)
        );
        return titleMatch || boardMatch || listMatch || wsMatch || assigneeMatch;
      });
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'overdue_desc') return (b.days_overdue || 0) - (a.days_overdue || 0);
      if (sortBy === 'due_date_asc') {
        const timeA = a.due_date ? new Date(a.due_date).getTime() : 0;
        const timeB = b.due_date ? new Date(b.due_date).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });
  }, [overdueTasks, searchQuery, sortBy]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, pageSize]);

  const totalItems = processedTasks.length;
  const isAll = pageSize === 'all' || pageSize >= 9999;
  const actualPageSize = isAll ? Math.max(1, totalItems) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / actualPageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedTasks = useMemo(() => {
    if (isAll) return processedTasks;
    const start = (safePage - 1) * actualPageSize;
    return processedTasks.slice(start, start + actualPageSize);
  }, [processedTasks, isAll, safePage, actualPageSize]);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * actualPageSize + 1;
  const endIndex = isAll ? totalItems : Math.min(safePage * actualPageSize, totalItems);

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-text-primary">{title}</h2>
                <Badge
                  variant={overdueTasks.length > 0 ? 'danger' : 'success'}
                  className="text-xs"
                >
                  {overdueTasks.length} {overdueTasks.length === 1 ? 'overdue' : 'overdue'}
                </Badge>
                {onViewAll && overdueTasks.length > Number(pageSize) && (
                  <button
                    onClick={onViewAll}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors ml-2"
                  >
                    <span>View All ({overdueTasks.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">Delayed deliverables and items past target due dates</p>
            </div>
          </div>

          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted">
                <ArrowUpDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-text-primary text-xs font-medium focus:outline-none cursor-pointer"
                >
                  <option value="overdue_desc">Most Overdue</option>
                  <option value="due_date_asc">Due Date (Oldest First)</option>
                  <option value="title_asc">Title (A–Z)</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search overdue tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {overdueTasks.length > 5 && (
          <div className="flex items-center justify-end gap-2 text-xs text-text-muted pt-0.5">
            <span>Rows:</span>
            <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-border text-[11px]">
              {[5, 10, 25, 'all'].map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-0.5 rounded capitalize font-medium transition-colors ${
                    pageSize === size
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {size === 'all' ? 'All' : size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {overdueTasks.length === 0 ? (
        <div className="p-8 text-center bg-surface">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-2.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-text-primary">No overdue tasks</p>
          <p className="text-[11px] text-text-muted mt-0.5">All scheduled tasks in this scope are on track or completed.</p>
        </div>
      ) : paginatedTasks.length === 0 ? (
        <div className="p-8 text-center bg-surface">
          <AlertTriangle className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-text-secondary">No overdue tasks match your search</p>
          <p className="text-[11px] text-text-muted mt-0.5">Try clearing the search query</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-elevated/80 border-b border-border text-text-muted font-semibold">
                <th className="py-2.5 px-4">Task</th>
                <th className="py-2.5 px-4">Board & List</th>
                <th className="py-2.5 px-4">Target Due Date</th>
                <th className="py-2.5 px-4 text-center">Days Overdue</th>
                {canViewTeam && <th className="py-2.5 px-4">Assignees</th>}
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedTasks.map((t) => {
                const targetWsId = t.workspace_id;
                const cardUrl = targetWsId
                  ? `/w/${targetWsId}/p/${t.board_id}/board?card=${t.id}`
                  : (getBoardUrl ? getBoardUrl(t.board_id, t.id) : `/b/${t.board_id}?card=${t.id}`);
                return (
                  <tr key={t.id} className="hover:bg-surface-elevated/40 transition-colors group">
                    <td className="py-3 px-4 font-medium text-text-primary max-w-[260px]">
                      <a
                        href={cardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                      >
                        <span className="truncate">{t.title}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-text-secondary">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.workspace_name && (
                          <>
                            <span className="font-semibold text-text-secondary bg-surface-muted px-1.5 py-0.5 rounded border border-border/70 text-[10px]">
                              {t.workspace_name}
                            </span>
                            <span className="text-text-muted">›</span>
                          </>
                        )}
                        <FolderKanban className="w-3 h-3 text-text-muted" />
                        <span className="font-medium text-text-primary">{t.board_name}</span>
                        <span className="text-text-muted">•</span>
                        <span className="text-text-muted">{t.list_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-rose-500 font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{t.due_date ? formatDate(t.due_date) : 'Past Due'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        {t.days_overdue} {t.days_overdue === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    {canViewTeam && (
                      <td className="py-3 px-4">
                        {t.members && t.members.length > 0 ? (
                          <div className="flex items-center -space-x-1.5">
                            {t.members.slice(0, 3).map((m) => (
                              <Avatar
                                key={m.id}
                                src={m.avatar_url}
                                name={m.name}
                                size="sm"
                                className="w-6 h-6 text-[10px] ring-2 ring-surface shrink-0"
                                title={m.name}
                              />
                            ))}
                            {t.members.length > 3 && (
                              <span className="w-6 h-6 rounded-full bg-surface-elevated border border-border text-[10px] font-semibold text-text-muted flex items-center justify-center ring-2 ring-surface">
                                +{t.members.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted text-[11px]">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <a
                        href={cardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-primary transition-colors bg-surface-elevated hover:bg-surface-elevated/80 px-2.5 py-1 rounded-md border border-border"
                      >
                        <span>Open Card</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
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
            <span className="font-semibold text-text-primary">{totalItems}</span> overdue tasks
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
