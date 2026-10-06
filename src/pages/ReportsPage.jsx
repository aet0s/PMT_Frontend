// client/src/pages/ReportsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Users,
  ExternalLink,
  CheckSquare,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Search,
  FileText,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { getWorkspaceReports } from '../api/workspaces';
import { formatDate, formatShortDate } from '../lib/dateFormat';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ProgressBar from '../components/ui/ProgressBar';
import Select from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';

const TIMEFRAME_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' }
];

export default function ReportsPage({ workspace }) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsData, setReportsData] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [error, setError] = useState(null);

  // User-wise section states
  const [expandedUserIds, setExpandedUserIds] = useState(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all', 'active', 'overdue', 'completed'
  const [userTaskTabMap, setUserTaskTabMap] = useState({}); // userId -> 'all' | 'in_progress' | 'overdue' | 'completed'

  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Reports & Analytics | TaskFlow`;
  }, [workspace]);

  const fetchReports = useCallback(
    async (isManualRefresh = false) => {
      if (!workspace?.id) return;
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await getWorkspaceReports(workspace.id, {
          boardId: selectedBoardId,
          timeframe: selectedTimeframe
        });
        setReportsData(data);
      } catch (err) {
        console.error('Failed to load workspace reports:', err);
        setError(err.message || 'Unable to load workspace reports');
        addToast({
          title: 'Error loading reports',
          message: err.message || 'Failed to fetch analytics data',
          type: 'danger'
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [workspace?.id, selectedBoardId, selectedTimeframe, addToast]
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Toggle single user accordion expansion
  const toggleUserExpanded = (userId) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Expand or collapse all users
  const handleToggleAllUsers = (expand) => {
    if (expand && reportsData?.members_workload) {
      setExpandedUserIds(new Set(reportsData.members_workload.map((m) => m.id)));
    } else {
      setExpandedUserIds(new Set());
    }
  };

  // Set active tab for a specific user's task breakdown
  const setUserTaskTab = (userId, tab) => {
    setUserTaskTabMap((prev) => ({
      ...prev,
      [userId]: tab
    }));
  };

  // Export specific user's report to CSV
  const handleExportUserCsv = (member) => {
    if (!member) return;

    try {
      let csv = `sep=,\n`;
      csv += `USER PERFORMANCE REPORT\n`;
      csv += `Name,"${(member.name || '').replace(/"/g, '""')}"\n`;
      csv += `Email,"${(member.email || '').replace(/"/g, '""')}"\n`;
      csv += `Role,"${(member.role || 'Member').replace(/"/g, '""')}"\n`;
      csv += `Workspace,"${(workspace?.name || 'Workspace').replace(/"/g, '""')}"\n`;
      csv += `Total Assigned,${member.assigned_tasks}\n`;
      csv += `Completed,${member.completed_tasks}\n`;
      csv += `In Progress,${member.in_progress_tasks}\n`;
      csv += `Overdue,${member.overdue_tasks}\n`;
      csv += `Completion Rate,${member.completion_rate}%\n\n`;

      csv += `ASSIGNED TASKS BREAKDOWN\n`;
      csv += `Task Title,Board,List,Due Date,Status,Days Overdue\n`;
      (member.tasks || []).forEach((t) => {
        let status = 'In Progress';
        if (t.is_complete) status = 'Completed';
        else if (t.is_overdue) status = 'Overdue';
        else if (t.is_due_soon) status = 'Due Soon';

        csv += `"${(t.title || '').replace(/"/g, '""')}","${(t.board_name || '').replace(/"/g, '""')}","${(t.list_name || '').replace(/"/g, '""')}","${t.due_date ? formatDate(t.due_date) : 'No due date'}","${status}",${t.is_overdue ? 'Yes' : 'No'}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const safeUserName = (member.name || 'user').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      link.setAttribute('download', `${safeUserName}-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({
        title: 'User Report Exported',
        message: `Exported report for ${member.name}.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error exporting user report:', err);
      addToast({
        title: 'Export Failed',
        message: 'Could not export user report.',
        type: 'danger'
      });
    }
  };

  // Export full workspace report to CSV
  const handleExportCsv = useCallback(() => {
    if (!reportsData) return;

    try {
      const summary = reportsData.summary || {};
      const boards = reportsData.boards_breakdown || [];
      const members = reportsData.members_workload || [];
      const overdue = reportsData.overdue_tasks_list || [];

      let csv = `sep=,\n`;
      csv += `WORKSPACE ANALYTICS & USER PERFORMANCE REPORT\n`;
      csv += `Workspace,${reportsData.workspace?.name || workspace?.name || 'Workspace'}\n`;
      csv += `Generated At,${new Date().toISOString()}\n`;
      csv += `Board Filter,${selectedBoardId === 'all' ? 'All Boards' : selectedBoardId}\n`;
      csv += `Timeframe,${selectedTimeframe}\n\n`;

      csv += `SUMMARY METRICS\n`;
      csv += `Total Tasks,Completed Tasks,In Progress Tasks,Overdue Tasks,Completion Rate (%),Overdue Rate (%),Avg Cycle Time (Days)\n`;
      csv += `${summary.total_tasks || 0},${summary.completed_tasks || 0},${summary.in_progress_tasks || 0},${summary.overdue_tasks || 0},${summary.completion_rate || 0}%,${summary.overdue_rate || 0}%,${summary.avg_cycle_days || 0}\n\n`;

      csv += `PROJECT & BOARD BREAKDOWN\n`;
      csv += `Board Name,Total Tasks,Completed Tasks,Overdue Tasks,In Progress Tasks,Completion Rate (%)\n`;
      boards.forEach((b) => {
        csv += `"${b.name.replace(/"/g, '""')}",${b.total_tasks},${b.completed_tasks},${b.overdue_tasks},${b.in_progress_tasks},${b.completion_rate}%\n`;
      });
      csv += `\n`;

      csv += `USER PERFORMANCE & WORKLOAD\n`;
      csv += `Name,Email,Role,Assigned Tasks,Completed Tasks,Overdue Tasks,In Progress Tasks,Completion Rate (%)\n`;
      members.forEach((m) => {
        csv += `"${(m.name || '').replace(/"/g, '""')}","${m.email || ''}","${m.role || 'Member'}",${m.assigned_tasks},${m.completed_tasks},${m.overdue_tasks},${m.in_progress_tasks},${m.completion_rate}%\n`;
      });
      csv += `\n`;

      if (overdue.length > 0) {
        csv += `OVERDUE TASKS\n`;
        csv += `Task Title,Board,List,Due Date,Days Overdue,Assignees\n`;
        overdue.forEach((t) => {
          const assigneesStr = (t.members || []).map((m) => m.name).join('; ');
          csv += `"${(t.title || '').replace(/"/g, '""')}","${(t.board_name || '').replace(/"/g, '""')}","${(t.list_name || '').replace(/"/g, '""')}","${t.due_date ? formatDate(t.due_date) : ''}",${t.days_overdue},"${assigneesStr.replace(/"/g, '""')}"\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const safeWorkspaceName = (workspace?.name || 'workspace').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      link.setAttribute('download', `${safeWorkspaceName}-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({
        title: 'Report Exported',
        message: 'CSV report downloaded successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error('Error exporting CSV:', err);
      addToast({
        title: 'Export Failed',
        message: 'Could not export report to CSV.',
        type: 'danger'
      });
    }
  }, [reportsData, workspace, selectedBoardId, selectedTimeframe, addToast]);

  const summary = reportsData?.summary || {
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    overdue_tasks: 0,
    due_soon_tasks: 0,
    completion_rate: 0,
    overdue_rate: 0,
    avg_cycle_days: 0,
    total_boards: 0,
    total_members: 0,
    unassigned_tasks: 0
  };

  const boards = reportsData?.boards || [];
  const boardsBreakdown = reportsData?.boards_breakdown || [];
  const statusBreakdown = reportsData?.status_breakdown || [];
  const membersWorkload = reportsData?.members_workload || [];
  const overdueTasksList = reportsData?.overdue_tasks_list || [];
  const velocity = reportsData?.velocity || [];

  // Find max count in 7-day velocity for bar chart scaling
  const maxVelocityCount = useMemo(() => {
    let max = 1;
    velocity.forEach((v) => {
      if (v.created > max) max = v.created;
      if (v.completed > max) max = v.completed;
    });
    return max;
  }, [velocity]);

  // Filtered members for the user-wise report section
  const filteredMembers = useMemo(() => {
    return membersWorkload.filter((member) => {
      // 1. Search query filter
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase();
        const matchesName = (member.name || '').toLowerCase().includes(q);
        const matchesEmail = (member.email || '').toLowerCase().includes(q);
        const matchesRole = (member.role || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole) return false;
      }

      // 2. Status filter
      if (userStatusFilter === 'active') {
        return member.in_progress_tasks > 0;
      }
      if (userStatusFilter === 'overdue') {
        return member.overdue_tasks > 0;
      }
      if (userStatusFilter === 'completed') {
        return member.assigned_tasks > 0 && member.completion_rate === 100;
      }

      return true;
    });
  }, [membersWorkload, userSearchQuery, userStatusFilter]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6 pb-16">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary-tint border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 tabIndex={-1} className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  Workspace Reports & Analytics
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                  Live data insights on task completion, team velocity, and project throughput for{' '}
                  <span className="font-semibold text-text-primary">{workspace?.name || 'Workspace'}</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar (Filters + Export + Refresh) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Board Selector */}
            <div className="min-w-[170px]">
              <Select
                value={selectedBoardId}
                onChange={(val) => setSelectedBoardId(val || 'all')}
                size="sm"
                options={[
                  { value: 'all', label: `All Boards (${boards.length})` },
                  ...boards.map((b) => ({ value: String(b.id), label: b.name }))
                ]}
                aria-label="Filter reports by project or board"
              />
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 shadow-xs">
              {TIMEFRAME_OPTIONS.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setSelectedTimeframe(tf.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                    selectedTimeframe === tf.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchReports(true)}
              disabled={loading || refreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
              aria-label="Refresh reports data"
            >
              Refresh
            </Button>

            {/* Export CSV Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCsv}
              disabled={loading || !reportsData || summary.total_tasks === 0}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              aria-label="Export report to CSV"
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-danger-tint border border-danger/30 rounded-xl flex items-center justify-between text-danger-text">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => fetchReports()}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && !reportsData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-5 bg-surface border border-border rounded-xl shadow-xs space-y-3 animate-pulse">
                  <div className="h-4 bg-surface-muted rounded w-1/2" />
                  <div className="h-8 bg-surface-muted rounded w-3/4" />
                  <div className="h-2 bg-surface-muted rounded w-full" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
              <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* 1. Primary KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Tasks Card */}
              <div className="p-4 sm:p-5 bg-surface border border-border rounded-xl shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Total Tasks
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-primary-tint border border-primary/20 flex items-center justify-center text-primary">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-text-primary tracking-tight">
                      {summary.total_tasks}
                    </span>
                    <span className="text-xs text-text-secondary font-medium">active cards</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                  <span>In Progress</span>
                  <span className="font-semibold text-text-primary">{summary.in_progress_tasks}</span>
                </div>
              </div>

              {/* Completion Rate Card */}
              <div className="p-4 sm:p-5 bg-surface border border-border rounded-xl shadow-xs hover:border-success/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Completion Rate
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-success-tint border border-success/20 flex items-center justify-center text-success-text">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-text-primary tracking-tight">
                      {summary.completion_rate}%
                    </span>
                    <span className="text-xs text-text-secondary font-medium">
                      ({summary.completed_tasks}/{summary.total_tasks})
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  <ProgressBar value={summary.completion_rate} max={100} variant="success" size="sm" />
                </div>
              </div>

              {/* Overdue Tasks Card */}
              <div
                className={`p-4 sm:p-5 bg-surface border rounded-xl shadow-xs transition-all flex flex-col justify-between ${
                  summary.overdue_tasks > 0
                    ? 'border-danger/40 bg-danger-tint/10'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Overdue Tasks
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        summary.overdue_tasks > 0
                          ? 'bg-danger-tint border border-danger/30 text-danger-text'
                          : 'bg-surface-muted border border-border text-text-muted'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-extrabold tracking-tight ${
                        summary.overdue_tasks > 0 ? 'text-danger-text' : 'text-text-primary'
                      }`}
                    >
                      {summary.overdue_tasks}
                    </span>
                    <span className="text-xs text-text-secondary font-medium">
                      {summary.overdue_rate}% of tasks
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                  <span>Due Soon (&lt;7d)</span>
                  <span className="font-semibold text-text-primary">{summary.due_soon_tasks}</span>
                </div>
              </div>

              {/* In Progress Card */}
              <div className="p-4 sm:p-5 bg-surface border border-border rounded-xl shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      In Progress
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-warning-tint border border-warning/20 flex items-center justify-center text-warning-text">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-text-primary tracking-tight">
                      {summary.in_progress_tasks}
                    </span>
                    <span className="text-xs text-text-secondary font-medium">in workflow</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                  <span>Unassigned</span>
                  <span className="font-semibold text-text-primary">{summary.unassigned_tasks}</span>
                </div>
              </div>

              {/* Avg Cycle Time Card */}
              <div className="p-4 sm:p-5 bg-surface border border-border rounded-xl shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Avg Cycle Time
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-info-tint border border-info/20 flex items-center justify-center text-info-text">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-text-primary tracking-tight">
                      {summary.avg_cycle_days > 0 ? `${summary.avg_cycle_days}d` : '—'}
                    </span>
                    <span className="text-xs text-text-secondary font-medium">turnaround</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                  <span>Active Boards</span>
                  <span className="font-semibold text-text-primary">{summary.total_boards}</span>
                </div>
              </div>
            </div>

            {/* 2. Middle Row: Project Boards Breakdown & Daily Velocity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project & Board Breakdown */}
              <div className="p-5 bg-surface border border-border rounded-xl shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                        Project & Board Performance
                      </h2>
                    </div>
                    <Badge variant="secondary" size="sm">
                      {boardsBreakdown.length} Boards
                    </Badge>
                  </div>

                  {boardsBreakdown.length === 0 ? (
                    <div className="py-8 text-center text-text-muted text-xs">
                      No active boards found in this workspace.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {boardsBreakdown.map((b) => (
                        <div
                          key={b.id}
                          className="p-3.5 bg-surface-muted border border-border rounded-lg hover:border-border-hover transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-3 h-3 rounded-full shrink-0 ${b.background_color || 'bg-primary'}`}
                              />
                              <button
                                type="button"
                                onClick={() => navigate(`/b/${b.id}`)}
                                className="text-sm font-semibold text-text-primary hover:text-primary transition-colors truncate flex items-center gap-1 group"
                              >
                                <span>{b.name}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold text-text-primary">{b.completion_rate}%</span>
                              <Badge
                                variant={b.overdue_tasks > 0 ? 'danger' : 'secondary'}
                                size="sm"
                              >
                                {b.overdue_tasks > 0 ? `${b.overdue_tasks} overdue` : 'On track'}
                              </Badge>
                            </div>
                          </div>

                          <div className="mb-2.5">
                            <ProgressBar
                              value={b.completion_rate}
                              max={100}
                              variant={b.completion_rate === 100 ? 'success' : 'primary'}
                              size="sm"
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs text-text-secondary">
                            <div className="flex items-center gap-3">
                              <span>
                                <strong className="text-text-primary">{b.total_tasks}</strong> tasks
                              </span>
                              <span>·</span>
                              <span>
                                <strong className="text-text-primary">{b.completed_tasks}</strong> done
                              </span>
                              <span>·</span>
                              <span>
                                <strong className="text-text-primary">{b.in_progress_tasks}</strong> active
                              </span>
                            </div>
                            <span className="text-text-muted text-[11px]">
                              {b.member_count} member{b.member_count === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 7-Day Velocity & Throughput Chart */}
              <div className="p-5 bg-surface border border-border rounded-xl shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                        Daily Velocity & Throughput
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
                        <span>Created</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-success" />
                        <span>Completed</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-text-secondary mb-4">
                    Task volume created versus completed over the past 7 days across the workspace.
                  </p>

                  <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4 pb-2 border-b border-border">
                    {velocity.map((day) => {
                      const createdHeight = Math.max(8, Math.round((day.created / maxVelocityCount) * 120));
                      const completedHeight = Math.max(8, Math.round((day.completed / maxVelocityCount) * 120));

                      return (
                        <div key={day.date} className="flex flex-col items-center justify-end h-full gap-1 group">
                          {/* Tooltip on hover */}
                          <div className="text-[10px] font-semibold text-text-primary opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                            +{day.created} / ✓{day.completed}
                          </div>
                          <div className="flex items-end gap-1 w-full justify-center">
                            {/* Created Bar */}
                            <div
                              style={{ height: `${day.created > 0 ? createdHeight : 4}px` }}
                              className={`w-3 rounded-t-sm transition-all ${
                                day.created > 0 ? 'bg-primary' : 'bg-surface-muted'
                              }`}
                              title={`${day.label}: ${day.created} created`}
                            />
                            {/* Completed Bar */}
                            <div
                              style={{ height: `${day.completed > 0 ? completedHeight : 4}px` }}
                              className={`w-3 rounded-t-sm transition-all ${
                                day.completed > 0 ? 'bg-success' : 'bg-surface-muted'
                              }`}
                              title={`${day.label}: ${day.completed} completed`}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-text-secondary mt-1 truncate max-w-full">
                            {day.label.split(',')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-text-secondary">
                    <span>
                      Total created (7d):{' '}
                      <strong className="text-text-primary font-semibold">
                        {velocity.reduce((acc, v) => acc + v.created, 0)}
                      </strong>
                    </span>
                    <span>
                      Total completed (7d):{' '}
                      <strong className="text-text-primary font-semibold">
                        {velocity.reduce((acc, v) => acc + v.completed, 0)}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Status / Column Distribution */}
            <div className="p-5 bg-surface border border-border rounded-xl shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                    Task Pipeline by Column & List
                  </h2>
                </div>
                <Badge variant="secondary" size="sm">
                  {statusBreakdown.length} Columns
                </Badge>
              </div>

              {statusBreakdown.length === 0 ? (
                <div className="py-8 text-center text-text-muted text-xs">
                  No status columns found in the active boards.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {statusBreakdown.map((s) => (
                    <div
                      key={`${s.board_id}-${s.list_id}`}
                      className="p-3.5 bg-surface-muted border border-border rounded-lg space-y-2 hover:border-border-hover transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-primary truncate">{s.list_name}</span>
                        <span className="font-bold text-text-primary">{s.task_count} cards</span>
                      </div>
                      <ProgressBar value={s.percentage} max={100} variant="primary" size="sm" />
                      <div className="flex items-center justify-between text-[11px] text-text-secondary">
                        <span className="truncate">{s.board_name}</span>
                        <span>{s.percentage}% of workspace</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. DEDICATED USER-WISE DETAILED REPORT SECTION */}
            <div className="p-5 bg-surface border border-border rounded-xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-tint border border-primary/20 flex items-center justify-center text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-text-primary tracking-tight">
                        User-Wise Performance & Detailed Task Reports
                      </h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Deep-dive into individual workloads, task assignments, completion ratios, and overdue items.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAllUsers(expandedUserIds.size < filteredMembers.length)}
                  >
                    {expandedUserIds.size < filteredMembers.length ? 'Expand All' : 'Collapse All'}
                  </Button>
                </div>
              </div>

              {/* User Section Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-muted p-2.5 rounded-lg border border-border">
                {/* Search by user name / email / role */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search member by name, email, or role..."
                    className="w-full h-8 pl-8 pr-3 text-xs bg-surface text-text-primary border border-border rounded-md shadow-xs focus:outline-none focus:border-primary"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Status filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: 'All Members', count: membersWorkload.length },
                    {
                      id: 'active',
                      label: 'Active Tasks',
                      count: membersWorkload.filter((m) => m.in_progress_tasks > 0).length
                    },
                    {
                      id: 'overdue',
                      label: 'With Overdue',
                      count: membersWorkload.filter((m) => m.overdue_tasks > 0).length
                    },
                    {
                      id: 'completed',
                      label: '100% Done',
                      count: membersWorkload.filter((m) => m.assigned_tasks > 0 && m.completion_rate === 100).length
                    }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setUserStatusFilter(filter.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                        userStatusFilter === filter.id
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Members List with Expandable Task Breakdowns */}
              {filteredMembers.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs space-y-2">
                  <UserCheck className="w-8 h-8 mx-auto text-text-muted opacity-60" />
                  <p className="font-semibold text-text-primary">No members match your search criteria</p>
                  <p className="text-text-secondary">Try clearing your search input or switching filters.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredMembers.map((member) => {
                    const isExpanded = expandedUserIds.has(member.id);
                    const currentTab = userTaskTabMap[member.id] || 'all';

                    // Filter member tasks based on active user sub-tab
                    const userTasks = member.tasks || [];
                    const inProgressTasks = userTasks.filter((t) => !t.is_complete && !t.is_overdue);
                    const overdueTasks = userTasks.filter((t) => t.is_overdue);
                    const completedTasks = userTasks.filter((t) => t.is_complete);

                    let displayedTasks = userTasks;
                    if (currentTab === 'in_progress') displayedTasks = inProgressTasks;
                    else if (currentTab === 'overdue') displayedTasks = overdueTasks;
                    else if (currentTab === 'completed') displayedTasks = completedTasks;

                    return (
                      <div
                        key={member.id}
                        className={`bg-surface border rounded-xl transition-all shadow-xs overflow-hidden ${
                          isExpanded ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border hover:border-border-hover'
                        }`}
                      >
                        {/* Member Summary Card Header */}
                        <div
                          onClick={() => toggleUserExpanded(member.id)}
                          className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-surface-hover/50 transition-colors"
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleUserExpanded(member.id);
                            }
                          }}
                        >
                          {/* User Avatar + Identity */}
                          <div className="flex items-center gap-3.5 min-w-0 lg:w-1/3">
                            <Avatar name={member.name} size="md" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-text-primary truncate">{member.name}</h3>
                                <Badge variant="secondary" size="sm">
                                  {member.role}
                                </Badge>
                              </div>
                              <p className="text-xs text-text-secondary truncate mt-0.5">{member.email}</p>
                            </div>
                          </div>

                          {/* Workload Stats Strip */}
                          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs lg:w-1/2">
                            {/* Assigned / Total */}
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-muted block">
                                Assigned Tasks
                              </span>
                              <span className="text-sm font-bold text-text-primary mt-0.5 block">
                                {member.assigned_tasks}
                              </span>
                            </div>

                            {/* Completed Ratio & Progress */}
                            <div className="min-w-[110px]">
                              <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase mb-1">
                                <span>Completed</span>
                                <span className="text-text-primary font-bold">{member.completion_rate}%</span>
                              </div>
                              <ProgressBar
                                value={member.completion_rate}
                                max={100}
                                variant={member.completion_rate === 100 ? 'success' : 'primary'}
                                size="sm"
                              />
                              <span className="text-[10px] text-text-secondary mt-0.5 block">
                                {member.completed_tasks} of {member.assigned_tasks} done
                              </span>
                            </div>

                            {/* In Progress */}
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-muted block">In Progress</span>
                              <span className="text-sm font-bold text-text-primary mt-0.5 block">
                                {member.in_progress_tasks}
                              </span>
                            </div>

                            {/* Overdue */}
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-muted block">Overdue</span>
                              <span
                                className={`text-sm font-bold mt-0.5 block ${
                                  member.overdue_tasks > 0 ? 'text-danger-text' : 'text-text-secondary'
                                }`}
                              >
                                {member.overdue_tasks}
                              </span>
                            </div>

                            {/* Due Soon */}
                            <div>
                              <span className="text-[10px] uppercase font-bold text-text-muted block">Due Soon (&lt;7d)</span>
                              <span className="text-sm font-bold text-text-primary mt-0.5 block">
                                {member.due_soon_tasks || 0}
                              </span>
                            </div>
                          </div>

                          {/* Expand Toggle + Action Buttons */}
                          <div className="flex items-center gap-2 justify-end lg:w-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportUserCsv(member);
                              }}
                              disabled={member.assigned_tasks === 0}
                              title="Export user task report"
                              aria-label={`Export report for ${member.name}`}
                              leftIcon={<Download className="w-3.5 h-3.5" />}
                            >
                              Export
                            </Button>

                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg bg-surface-muted hover:bg-surface-hover flex items-center justify-center text-text-secondary transition-colors"
                              aria-label={isExpanded ? 'Collapse user details' : 'Expand user details'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Detailed Task Dossier */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 border-t border-border bg-surface-muted/40 space-y-4">
                            {/* Project Boards breakdown for this user */}
                            {member.boards && member.boards.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-text-secondary">Assigned on Boards:</span>
                                {member.boards.map((b) => (
                                  <Badge key={b.id} variant="secondary" size="sm">
                                    <span className="font-semibold">{b.name}</span>
                                    <span className="text-text-muted ml-1">
                                      ({b.completed_count}/{b.task_count} done)
                                    </span>
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Sub-tabs for filtering user tasks */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2.5">
                              <div className="flex items-center gap-1.5">
                                {[
                                  { id: 'all', label: 'All Tasks', count: userTasks.length },
                                  { id: 'in_progress', label: 'In Progress', count: inProgressTasks.length },
                                  { id: 'overdue', label: 'Overdue', count: overdueTasks.length },
                                  { id: 'completed', label: 'Completed', count: completedTasks.length }
                                ].map((tab) => (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setUserTaskTab(member.id, tab.id)}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                      currentTab === tab.id
                                        ? 'bg-surface text-text-primary font-bold shadow-xs border border-border'
                                        : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                  >
                                    {tab.label} ({tab.count})
                                  </button>
                                ))}
                              </div>

                              <span className="text-xs text-text-muted">
                                Showing {displayedTasks.length} task{displayedTasks.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            {/* Task Breakdown Table / List */}
                            {displayedTasks.length === 0 ? (
                              <div className="py-8 text-center text-text-muted text-xs">
                                No tasks found matching this status filter.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs bg-surface border border-border rounded-lg overflow-hidden">
                                  <thead>
                                    <tr className="bg-surface-muted/60 border-b border-border text-text-secondary uppercase text-[10px] tracking-wider">
                                      <th className="py-2.5 px-3 font-semibold">Task Title</th>
                                      <th className="py-2.5 px-3 font-semibold">Board / List</th>
                                      <th className="py-2.5 px-3 font-semibold">Due Date</th>
                                      <th className="py-2.5 px-3 font-semibold">Status</th>
                                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {displayedTasks.map((task) => (
                                      <tr key={task.id} className="hover:bg-surface-hover/70 transition-colors">
                                        <td className="py-2.5 px-3 font-semibold text-text-primary max-w-sm truncate">
                                          <div className="flex items-center gap-2">
                                            {task.is_complete ? (
                                              <CheckCircle2 className="w-3.5 h-3.5 text-success-text shrink-0" />
                                            ) : task.is_overdue ? (
                                              <AlertCircle className="w-3.5 h-3.5 text-danger-text shrink-0" />
                                            ) : (
                                              <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                            )}
                                            <span className={task.is_complete ? 'line-through text-text-muted' : ''}>
                                              {task.title}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-text-secondary">
                                          <span className="font-medium text-text-primary">{task.board_name}</span>
                                          <span className="text-text-muted ml-1">/ {task.list_name}</span>
                                        </td>
                                        <td className="py-2.5 px-3 text-text-secondary">
                                          {task.due_date ? formatShortDate(task.due_date) : 'No due date'}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          {task.is_complete ? (
                                            <Badge variant="success" size="sm">
                                              Completed
                                            </Badge>
                                          ) : task.is_overdue ? (
                                            <Badge variant="danger" size="sm">
                                              Overdue
                                            </Badge>
                                          ) : task.is_due_soon ? (
                                            <Badge variant="warning" size="sm">
                                              Due Soon
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" size="sm">
                                              In Progress
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/b/${task.board_id}?card=${task.id}`)}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                                          >
                                            <span>Open Card</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. Actionable Overdue Tasks Table */}
            <div className="p-5 bg-surface border border-border rounded-xl shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 ${summary.overdue_tasks > 0 ? 'text-danger-text' : 'text-success-text'}`}
                  />
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                    Overdue Tasks & Action Items
                  </h2>
                </div>
                <Badge variant={summary.overdue_tasks > 0 ? 'danger' : 'success'} size="sm">
                  {summary.overdue_tasks} Overdue
                </Badge>
              </div>

              {overdueTasksList.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-success-tint border border-success/20 flex items-center justify-center text-success-text mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">All Tasks On Schedule!</h3>
                  <p className="text-xs text-text-secondary mt-1 max-w-sm">
                    No overdue cards detected across this workspace. Great job keeping the workflow on track!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-secondary uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 font-semibold">Task Title</th>
                        <th className="py-2.5 px-3 font-semibold">Board / List</th>
                        <th className="py-2.5 px-3 font-semibold">Due Date</th>
                        <th className="py-2.5 px-3 font-semibold">Delay</th>
                        <th className="py-2.5 px-3 font-semibold">Assignees</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {overdueTasksList.map((task) => (
                        <tr key={task.id} className="hover:bg-surface-hover transition-colors">
                          <td className="py-3 px-3 font-semibold text-text-primary max-w-xs truncate">
                            {task.title}
                          </td>
                          <td className="py-3 px-3 text-text-secondary">
                            <span className="font-medium text-text-primary">{task.board_name}</span>
                            <span className="text-text-muted ml-1">/ {task.list_name}</span>
                          </td>
                          <td className="py-3 px-3 text-text-secondary">
                            {task.due_date ? formatShortDate(task.due_date) : '—'}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="danger" size="sm">
                              {task.days_overdue} day{task.days_overdue === 1 ? '' : 's'} late
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            {task.members && task.members.length > 0 ? (
                              <div className="flex items-center -space-x-1.5">
                                {task.members.map((m) => (
                                  <Avatar key={m.id} name={m.name} size="xs" />
                                ))}
                              </div>
                            ) : (
                              <span className="text-text-muted italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => navigate(`/b/${task.board_id}?card=${task.id}`)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                            >
                              <span>Open Card</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
