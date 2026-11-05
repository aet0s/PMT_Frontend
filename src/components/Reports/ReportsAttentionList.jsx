// client/src/components/Reports/ReportsAttentionList.jsx
import React from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Calendar, FolderKanban, Users } from 'lucide-react';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { formatDate } from '../../lib/dateFormat';
import { formatNumber } from './reportsUtils';

export default function ReportsAttentionList({
  overdueTasks = [],
  canViewTeam = false,
  getBoardUrl
}) {
  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary">Tasks Requiring Attention</h2>
              <Badge
                variant={overdueTasks.length > 0 ? 'danger' : 'success'}
                className="text-xs"
              >
                {overdueTasks.length} {overdueTasks.length === 1 ? 'overdue' : 'overdue'}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">Delayed deliverables and items past target due dates</p>
          </div>
        </div>
      </div>

      {overdueTasks.length === 0 ? (
        <div className="p-8 text-center bg-surface">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-2.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-text-primary">No overdue tasks</p>
          <p className="text-[11px] text-text-muted mt-0.5">All scheduled tasks in this scope are on track or completed.</p>
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
              {overdueTasks.map((t) => {
                const cardUrl = getBoardUrl ? getBoardUrl(t.board_id, t.id) : `/b/${t.board_id}?card=${t.id}`;
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
                      <div className="flex items-center gap-1.5">
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
    </div>
  );
}

