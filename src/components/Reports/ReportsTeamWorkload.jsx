// client/src/components/Reports/ReportsTeamWorkload.jsx
import React, { useState, useMemo } from 'react';
import { Users, Search, AlertTriangle, CheckCircle2, ChevronRight, UserCheck } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { formatNumber, formatPercent } from './reportsUtils';

export default function ReportsTeamWorkload({
  members = [],
  onSelectMember,
  canViewTeam = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (member.name || '').toLowerCase().includes(q);
        const matchesEmail = (member.email || '').toLowerCase().includes(q);
        const matchesRole = (member.role || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole) return false;
      }

      if (statusFilter === 'active') {
        return (member.in_progress_tasks || 0) > 0 || (member.review_tasks || 0) > 0;
      }
      if (statusFilter === 'todo') {
        return (member.todo_tasks || 0) > 0;
      }
      if (statusFilter === 'overdue') {
        return (member.overdue_tasks || 0) > 0;
      }
      if (statusFilter === 'completed') {
        return member.assigned_tasks > 0 && member.completion_rate === 100;
      }
      if (statusFilter === 'creators') {
        return (member.created_tasks || 0) > 0;
      }

      return true;
    });
  }, [members, searchQuery, statusFilter]);

  if (!canViewTeam) {
    return null;
  }

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text-primary">Team Workload & Performance</h2>
            <Badge variant="outline" className="text-xs">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-0.5">Individual task allocations, completion rates, and workload capacity</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Status Filter Pill Buttons */}
          <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-border text-[11px] overflow-x-auto">
            {['all', 'active', 'overdue', 'completed'].map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors whitespace-nowrap ${
                  statusFilter === filterKey
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {filterKey}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
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

      {filteredMembers.length === 0 ? (
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
                <th className="py-2.5 px-4 text-center">Overdue</th>
                <th className="py-2.5 px-4 min-w-[130px]">Completion Rate</th>
                <th className="py-2.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredMembers.map((m) => (
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
    </div>
  );
}

