// client/src/components/Reports/ReportMemberDetailsDrawer.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Calendar,
  ListTodo,
  TrendingUp,
  FolderKanban
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { formatDate } from '../../lib/dateFormat';
import { formatNumber, formatPercent, exportMemberDossierCsv } from './reportsUtils';

export default function ReportMemberDetailsDrawer({
  member,
  workspace,
  onClose,
  canExport = false,
  getBoardUrl
}) {
  const [scope, setScope] = useState('assigned'); // 'assigned' | 'created'
  const [statusTab, setStatusTab] = useState('all');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeTaskList = useMemo(() => {
    if (!member) return [];
    return scope === 'created' ? (member.created_cards || []) : (member.tasks || []);
  }, [member, scope]);

  const filteredTasks = useMemo(() => {
    if (!activeTaskList) return [];
    if (statusTab === 'todo') return activeTaskList.filter((t) => t.stage === 'todo' && !t.is_complete);
    if (statusTab === 'in_progress') return activeTaskList.filter((t) => (t.stage === 'in_progress' || t.stage === 'review') && !t.is_complete && !t.is_overdue);
    if (statusTab === 'overdue') return activeTaskList.filter((t) => t.is_overdue);
    if (statusTab === 'completed') return activeTaskList.filter((t) => t.is_complete || t.stage === 'done');
    return activeTaskList;
  }, [activeTaskList, statusTab]);

  if (!member) return null;

  const handleExport = () => {
    exportMemberDossierCsv({ member, workspace });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md md:max-w-xl bg-surface border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="p-5 border-b border-border bg-surface-elevated/40">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Avatar
                  src={member.avatar_url}
                  alt={member.name}
                  name={member.name}
                  size="md"
                  className="w-11 h-11 text-sm shrink-0 border border-border"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text-primary">{member.name}</h2>
                    <Badge variant="secondary" className="text-[10px]">
                      {member.role || 'Member'}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="flex items-center gap-1.5 text-xs font-medium"
                    title="Export member CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </Button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metrics Mini-Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
              <div className="bg-surface p-2 rounded-lg border border-border text-center">
                <span className="text-[10px] text-text-muted font-medium block">Assigned</span>
                <span className="text-sm font-bold text-text-primary">{formatNumber(member.assigned_tasks)}</span>
              </div>
              <div className="bg-surface p-2 rounded-lg border border-border text-center">
                <span className="text-[10px] text-text-muted font-medium block">To Do</span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{formatNumber(member.todo_tasks)}</span>
              </div>
              <div className="bg-surface p-2 rounded-lg border border-border text-center">
                <span className="text-[10px] text-text-muted font-medium block">Active</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatNumber(member.in_progress_tasks)}</span>
              </div>
              <div className="bg-surface p-2 rounded-lg border border-border text-center">
                <span className="text-[10px] text-text-muted font-medium block">Completed</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(member.completed_tasks)}</span>
              </div>
              <div className="bg-surface p-2 rounded-lg border border-border text-center">
                <span className="text-[10px] text-text-muted font-medium block">Overdue</span>
                <span className={`text-sm font-bold ${member.overdue_tasks > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted'}`}>
                  {formatNumber(member.overdue_tasks)}
                </span>
              </div>
              <div className="bg-surface p-2 rounded-lg border border-border text-center">
                <span className="text-[10px] text-text-muted font-medium block">Rate</span>
                <span className="text-sm font-bold text-primary">{formatPercent(member.completion_rate)}</span>
              </div>
            </div>
          </div>

          {/* Scope Toggle & Sub-filters */}
          <div className="px-5 pt-3 pb-2 border-b border-border bg-surface flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-surface-elevated p-0.5 rounded-lg border border-border text-xs">
                <button
                  onClick={() => setScope('assigned')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    scope === 'assigned'
                      ? 'bg-surface text-primary shadow-xs font-semibold'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Assigned ({member.tasks?.length || 0})
                </button>
                <button
                  onClick={() => setScope('created')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    scope === 'created'
                      ? 'bg-surface text-primary shadow-xs font-semibold'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Created ({member.created_cards?.length || 0})
                </button>
              </div>

              <span className="text-[11px] text-text-muted font-medium">
                {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'todo', label: 'To Do' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'overdue', label: 'Overdue' },
                { id: 'completed', label: 'Completed' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={`px-2.5 py-0.5 rounded-full border text-[11px] transition-colors whitespace-nowrap ${
                    statusTab === tab.id
                      ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                      : 'border-border text-text-muted hover:border-border-hover hover:text-text-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-2.5 custom-scrollbar">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-text-muted border border-dashed border-border rounded-xl">
                <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold text-text-secondary">No tasks in this category</p>
                <p className="text-[11px] mt-0.5">Tasks matching your filters will appear here.</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const cardUrl = getBoardUrl ? getBoardUrl(task.board_id, task.id) : `/b/${task.board_id}?card=${task.id}`;
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-border bg-surface-elevated/40 hover:border-primary/40 hover:bg-surface-elevated transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={cardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <span>{task.title}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </a>

                      {task.is_complete ? (
                        <span className="shrink-0 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Done
                        </span>
                      ) : task.is_overdue ? (
                        <span className="shrink-0 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                          {task.stage || 'In Progress'}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <FolderKanban className="w-3 h-3 text-text-muted" />
                        <span className="truncate max-w-[120px]">{task.board_name}</span>
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[100px]">{task.list_name}</span>
                      {task.due_date && (
                        <>
                          <span>•</span>
                          <span className={`flex items-center gap-1 ${task.is_overdue ? 'text-rose-500 font-medium' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.due_date)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

