// client/src/components/Reports/ReportsTeamWorkload.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  ArrowRight,
  UserCheck,
  Archive
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { formatNumber, formatPercent } from './reportsUtils';

const TEAM_SORT_OPTIONS = [
  { value: 'assigned', label: 'Most Assigned' },
  { value: 'completion', label: 'Highest Progress' },
  { value: 'overdue', label: 'Most Overdue' },
  { value: 'active', label: 'Most Active' },
  { value: 'name', label: 'Name (A–Z)' }
];

export default function ReportsTeamWorkload({
  members = [],
  onSelectMember,
  canViewTeam = false,
  defaultPageSize = 6,
  onViewAll = null,
  title = "Team Workload & Performance"
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('assigned'); // 'assigned' | 'completion' | 'overdue' | 'active' | 'name'
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync pageSize if defaultPageSize changes
  useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);

  // Compute status counts for pill badges
  const statusCounts = useMemo(() => {
    let active = 0;
    let overdue = 0;
    let completed = 0;
    let archived = 0;

    members.forEach((m) => {
      if ((m.in_progress_tasks || 0) > 0 || (m.review_tasks || 0) > 0) active++;
      if ((m.overdue_tasks || 0) > 0) overdue++;
      if (m.assigned_tasks > 0 && m.completion_rate === 100) completed++;
      if ((m.archived_tasks || 0) > 0) archived++;
    });

    return {
      all: members.length,
      active,
      overdue,
      completed,
      archived
    };
  }, [members]);

  // Filter and sort members
  const processedMembers = useMemo(() => {
    let list = members;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((member) => {
        const matchesName = (member.name || '').toLowerCase().includes(q);
        const matchesEmail = (member.email || '').toLowerCase().includes(q);
        const matchesRole = (member.role || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesRole;
      });
    }

    // Status filter
    if (statusFilter === 'active') {
      list = list.filter(
        (m) => (m.in_progress_tasks || 0) > 0 || (m.review_tasks || 0) > 0
      );
    } else if (statusFilter === 'overdue') {
      list = list.filter((m) => (m.overdue_tasks || 0) > 0);
    } else if (statusFilter === 'completed') {
      list = list.filter((m) => m.assigned_tasks > 0 && m.completion_rate === 100);
    } else if (statusFilter === 'archived') {
      list = list.filter((m) => (m.archived_tasks || 0) > 0);
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'assigned') return (b.assigned_tasks || 0) - (a.assigned_tasks || 0);
      if (sortBy === 'completion') return (b.completion_rate || 0) - (a.completion_rate || 0);
      if (sortBy === 'overdue') return (b.overdue_tasks || 0) - (a.overdue_tasks || 0);
      if (sortBy === 'active') {
        const aActive = (a.in_progress_tasks || 0) + (a.review_tasks || 0);
        const bActive = (b.in_progress_tasks || 0) + (b.review_tasks || 0);
        return bActive - aActive;
      }
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });
  }, [members, searchQuery, statusFilter, sortBy]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, pageSize]);

  if (!canViewTeam) {
    return null;
  }

  const totalItems = processedMembers.length;
  const isAll = pageSize === 'all' || pageSize >= 9999;
  const actualPageSize = isAll ? Math.max(1, totalItems) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / actualPageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedMembers = useMemo(() => {
    if (isAll) return processedMembers;
    const start = (safePage - 1) * actualPageSize;
    return processedMembers.slice(start, start + actualPageSize);
  }, [processedMembers, isAll, safePage, actualPageSize]);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * actualPageSize + 1;
  const endIndex = isAll ? totalItems : Math.min(safePage * actualPageSize, totalItems);

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-text-primary">{title}</h2>
              <Badge variant="outline" className="text-xs">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </Badge>
              {onViewAll && members.length > Number(pageSize) && (
                <button
                  onClick={onViewAll}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors ml-2"
                >
                  <span>View All ({members.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">Individual task allocations, completion rates, and workload capacity</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            {/* Sort Selector */}
            <div className="w-full sm:w-44">
              <Select
                value={sortBy}
                onChange={(val) => setSortBy(val)}
                options={TEAM_SORT_OPTIONS}
                size="sm"
                className="text-xs"
                aria-label="Sort team workload by"
              />
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills & Density Selector */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-0.5">
          <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-border text-[11px] overflow-x-auto">
            {[
              { id: 'all', label: 'All Members', count: statusCounts.all },
              { id: 'active', label: 'Active', count: statusCounts.active },
              { id: 'overdue', label: 'With Overdue', count: statusCounts.overdue },
              { id: 'completed', label: '100% Done', count: statusCounts.completed },
              { id: 'archived', label: 'With Archived', count: statusCounts.archived }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
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
        </div>
      </div>

      {paginatedMembers.length === 0 ? (
        <div className="p-8 text-center bg-surface">
          <Users className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-text-secondary">No members found</p>
          <p className="text-[11px] text-text-muted mt-0.5">Try refining your search query or status filter</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-elevated/80 border-b border-border text-text-muted font-semibold">
                <th className="py-2.5 px-4">Member</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4 text-center">Assigned</th>
                <th className="py-2.5 px-4 text-center">To Do</th>
                <th className="py-2.5 px-4 text-center">In Progress</th>
                <th className="py-2.5 px-4 text-center">In Review</th>
                <th className="py-2.5 px-4 text-center">Completed</th>
                <th className="py-2.5 px-4 text-center">Archived</th>
                <th className="py-2.5 px-4 text-center">Overdue</th>
                <th className="py-2.5 px-4 min-w-[130px]">Completion Rate</th>
                <th className="py-2.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedMembers.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => onSelectMember(m)}
                  className="hover:bg-surface-elevated/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-medium text-text-primary whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={m.avatar_url}
                        alt={m.name}
                        name={m.name}
                        size="sm"
                        className="w-7 h-7 text-xs shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-text-muted truncate max-w-[160px]">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {m.role || 'Member'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-text-primary">
                    {formatNumber(m.assigned_tasks)}
                  </td>
                  <td className="py-3 px-4 text-center text-text-secondary">
                    {formatNumber(m.todo_tasks)}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-600 dark:text-blue-400 font-medium">
                    {formatNumber(m.in_progress_tasks)}
                  </td>
                  <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400 font-medium">
                    {formatNumber(m.review_tasks)}
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatNumber(m.completed_tasks)}
                  </td>
                  <td className="py-3 px-4 text-center text-text-muted">
                    {m.archived_tasks > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface-muted px-1.5 py-0.5 rounded border border-border/60">
                        {formatNumber(m.archived_tasks)}
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {m.overdue_tasks > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        {formatNumber(m.overdue_tasks)}
                      </span>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-text-primary">{formatPercent(m.completion_rate)}</span>
                      </div>
                      <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, m.completion_rate || 0)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted group-hover:text-primary transition-colors">
                      View
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
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
            <span className="font-semibold text-text-primary">{totalItems}</span> members
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
