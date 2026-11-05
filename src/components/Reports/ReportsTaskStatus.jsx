// client/src/components/Reports/ReportsTaskStatus.jsx
import React from 'react';
import { Layers, CheckCircle2, TrendingUp, Clock, ListTodo } from 'lucide-react';
import { formatNumber, formatPercent } from './reportsUtils';

export default function ReportsTaskStatus({ stageBreakdown = {}, totalTasks = 0 }) {
  const { todo = 0, in_progress = 0, review = 0, done = 0 } = stageBreakdown;

  const validTotal = totalTasks > 0 ? totalTasks : (todo + in_progress + review + done);

  const todoPct = validTotal > 0 ? (todo / validTotal) * 100 : 0;
  const inProgressPct = validTotal > 0 ? (in_progress / validTotal) * 100 : 0;
  const reviewPct = validTotal > 0 ? (review / validTotal) * 100 : 0;
  const donePct = validTotal > 0 ? (done / validTotal) * 100 : 0;

  const stages = [
    {
      id: 'todo',
      label: 'To Do',
      count: todo,
      percent: todoPct,
      color: 'bg-slate-400 dark:bg-slate-500',
      textColor: 'text-slate-600 dark:text-slate-400',
      dotColor: 'bg-slate-400'
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      count: in_progress,
      percent: inProgressPct,
      color: 'bg-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400',
      dotColor: 'bg-blue-500'
    },
    {
      id: 'review',
      label: 'In Review',
      count: review,
      percent: reviewPct,
      color: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      dotColor: 'bg-amber-500'
    },
    {
      id: 'done',
      label: 'Completed',
      count: done,
      percent: donePct,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      dotColor: 'bg-emerald-500'
    }
  ];

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary">Task Status Distribution</h2>
          <p className="text-xs text-text-muted mt-0.5">Workspace-wide breakdown across workflow stages</p>
        </div>
        <span className="text-xs font-semibold text-text-secondary bg-surface-elevated px-2.5 py-1 rounded-md border border-border">
          {formatNumber(validTotal)} total tasks
        </span>
      </div>

      {validTotal === 0 ? (
        <div className="py-8 text-center border border-dashed border-border rounded-lg bg-surface-elevated/40">
          <p className="text-xs font-medium text-text-muted">No tasks available in this scope</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stacked Horizontal Bar */}
          <div className="h-4 w-full bg-surface-elevated rounded-full overflow-hidden flex shadow-inner">
            {stages.map((st) => {
              if (st.percent <= 0) return null;
              return (
                <div
                  key={st.id}
                  style={{ width: `${st.percent}%` }}
                  className={`${st.color} transition-all duration-300 relative group`}
                  title={`${st.label}: ${formatNumber(st.count)} (${formatPercent(st.percent)})`}
                />
              );
            })}
          </div>

          {/* Legend and Values Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {stages.map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated/60 border border-border/60"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${st.dotColor} shrink-0`} />
                  <span className="text-xs font-medium text-text-secondary">{st.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-text-primary mr-1">{formatNumber(st.count)}</span>
                  <span className="text-[11px] text-text-muted font-medium">({formatPercent(st.percent)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

