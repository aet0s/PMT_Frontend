// client/src/components/Reports/ReportsKpiSummary.jsx
import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Users,
  CheckSquare,
  TrendingUp,
  ListTodo,
  Calendar,
  UserX
} from 'lucide-react';
import { formatNumber, formatPercent, formatDays } from './reportsUtils';

export default function ReportsKpiSummary({ summary = {}, canViewTeam = false }) {
  const {
    total_tasks = 0,
    completed_tasks = 0,
    in_progress_tasks = 0,
    todo_tasks = 0,
    review_tasks = 0,
    overdue_tasks = 0,
    due_soon_tasks = 0,
    unassigned_tasks = 0,
    completion_rate = 0,
    overdue_rate = 0,
    avg_cycle_days = 0,
    total_boards = 0,
    total_members = 0
  } = summary;

  const primaryKpis = [
    {
      id: 'total',
      label: 'Total Tasks',
      value: formatNumber(total_tasks),
      icon: Layers,
      color: 'text-text-primary',
      bg: 'bg-surface-elevated',
      badgeBg: 'bg-primary/10 text-primary border-primary/20'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: formatNumber(completed_tasks),
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-surface-elevated',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: formatNumber(in_progress_tasks),
      icon: TrendingUp,
      color: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-surface-elevated',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    },
    {
      id: 'todo',
      label: 'To Do',
      value: formatNumber(todo_tasks),
      icon: ListTodo,
      color: 'text-slate-500 dark:text-slate-400',
      bg: 'bg-surface-elevated',
      badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: formatNumber(overdue_tasks),
      icon: AlertTriangle,
      color: overdue_tasks > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-text-secondary',
      bg: 'bg-surface-elevated',
      badgeBg: overdue_tasks > 0
        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        : 'bg-surface text-text-muted border-border'
    },
    {
      id: 'completion_rate',
      label: 'Completion Rate',
      value: formatPercent(completion_rate),
      icon: CheckSquare,
      color: 'text-primary',
      bg: 'bg-surface-elevated',
      badgeBg: 'bg-primary/10 text-primary border-primary/20'
    }
  ];

  return (
    <div className="space-y-4">
      {/* 6 Primary KPIs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {primaryKpis.map((kpi) => {
          const IconComponent = kpi.icon;
          return (
            <div
              key={kpi.id}
              className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-border-hover transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted">{kpi.label}</span>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${kpi.badgeBg}`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-text-primary">
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Supporting Secondary Metrics Strip */}
      <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-y-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          <div className="flex items-center gap-2.5 px-3 py-1 min-w-[120px]">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted font-medium">In Review</p>
              <p className="text-sm font-semibold text-text-primary">{formatNumber(review_tasks)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1 min-w-[120px]">
            <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted font-medium">Due Soon</p>
              <p className="text-sm font-semibold text-text-primary">{formatNumber(due_soon_tasks)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1 min-w-[120px]">
            <UserX className="w-4 h-4 text-text-muted shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted font-medium">Unassigned</p>
              <p className="text-sm font-semibold text-text-primary">{formatNumber(unassigned_tasks)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1 min-w-[120px]">
            <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted font-medium">Boards</p>
              <p className="text-sm font-semibold text-text-primary">{formatNumber(total_boards)}</p>
            </div>
          </div>

          {canViewTeam && (
            <div className="flex items-center gap-2.5 px-3 py-1 min-w-[120px]">
              <Users className="w-4 h-4 text-sky-500 shrink-0" />
              <div>
                <p className="text-[11px] text-text-muted font-medium">Team Members</p>
                <p className="text-sm font-semibold text-text-primary">{formatNumber(total_members)}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 px-3 py-1 min-w-[120px]">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted font-medium">Overdue Rate</p>
              <p className="text-sm font-semibold text-text-primary">{formatPercent(overdue_rate)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1 min-w-[130px]">
            <TrendingUp className="w-4 h-4 text-teal-500 shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted font-medium">Avg Cycle Time</p>
              <p className="text-sm font-semibold text-text-primary">{formatDays(avg_cycle_days)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

