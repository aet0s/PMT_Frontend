// client/src/pages/ReportsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  RefreshCw,
  Download,
  Users,
  ExternalLink,
  CheckSquare,
  ArrowUpRight,
  Search,
  UserCheck,
  AlertCircle,
  Eye,
  LayoutDashboard,
  Kanban,
  ListTodo,
  Check,
  Plus
} from 'lucide-react';
import { getWorkspaceReports } from '../api/workspaces';
import { formatDate, formatShortDate } from '../lib/dateFormat';
import { useSocket } from '../context/SocketProvider';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import Select from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';

const TIMEFRAME_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' }
];

export default function ReportsPage({ workspace }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { hasPermission, userRole, loading: permissionsLoading } = usePermissions();
  const roleName = (typeof userRole === 'string' ? userRole : userRole?.name || workspace?.role_name || workspace?.role || '')?.toLowerCase();
  const isOwner = roleName === 'owner' || roleName === 'super admin';
  const isMemberOrBelow = ['team member', 'member', 'viewer', 'guest'].includes(roleName);
  const canViewReports = !isMemberOrBelow && (isOwner || hasPermission('report.view_project') || hasPermission('role.view'));

  const getBoardUrl = (boardId, cardId = null) => {
    const wsId = workspace?.id;
    const base = wsId ? `/w/${wsId}/p/${boardId}/board` : `/b/${boardId}`;
    return cardId ? `${base}?card=${cardId}` : base;
  };

  useEffect(() => {
    if (!permissionsLoading && !canViewReports && workspace?.id) {
      addToast?.('You do not have permission to view reports', 'error');
      navigate(`/w/${workspace.id}/home`, { replace: true });
    }
  }, [permissionsLoading, canViewReports, workspace?.id, navigate, addToast]);

  if (!permissionsLoading && !canViewReports) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-text-secondary">Redirecting to workspace home...</p>
      </div>
    );
  }

  // Safely connect to real-time socket events if available
  let socketContext = null;
  try {
    socketContext = useSocket();
  } catch {
    // Graceful fallback when outside SocketProvider
  }
  const socket = socketContext?.socket;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsData, setReportsData] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [error, setError] = useState(null);

  // Active section view tab: 'overview' | 'team' | 'boards' | 'pipeline' | 'overdue'
  const VALID_TABS = useMemo(() => ['overview', 'team', 'boards', 'pipeline', 'overdue'], []);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const initialTab = (urlTab && VALID_TABS.includes(urlTab))
    ? urlTab
    : (() => {
        try {
          const saved = localStorage.getItem('taskflow_reports_tab');
          if (saved && ['overview', 'team', 'boards', 'pipeline', 'overdue'].includes(saved)) return saved;
        } catch {
          // ignore
        }
        return 'overview';
      })();

  const [activeTab, setActiveTabState] = useState(initialTab);

  const setActiveTab = useCallback((tab) => {
    if (!['overview', 'team', 'boards', 'pipeline', 'overdue'].includes(tab)) return;
    setActiveTabState(tab);
    try {
      localStorage.setItem('taskflow_reports_tab', tab);
    } catch {
      // ignore
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Keep state and URL search params synchronized on back/forward navigation or refresh
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && VALID_TABS.includes(currentTab)) {
      if (currentTab !== activeTab) {
        setActiveTabState(currentTab);
        try {
          localStorage.setItem('taskflow_reports_tab', currentTab);
        } catch {}
      }
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', activeTab);
        return next;
      }, { replace: true });
    }
  }, [searchParams, activeTab, setSearchParams, VALID_TABS]);

  // Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all', 'active', 'todo', 'overdue', 'completed'
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [pipelineSearchQuery, setPipelineSearchQuery] = useState('');
  const [overdueSearchQuery, setOverdueSearchQuery] = useState('');

  // Detailed Member Dossier Modal state
  const [selectedMemberDossier, setSelectedMemberDossier] = useState(null);
  const [dossierScope, setDossierScope] = useState('assigned'); // 'assigned' | 'created'
  const [dossierTaskTab, setDossierTaskTab] = useState('all'); // 'all', 'todo', 'in_progress', 'overdue', 'completed'

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

  // Real-time synchronization: silently refresh reports when cards move or change
  useEffect(() => {
    if (!socket || !workspace?.id) return;

    const handleRealtimeUpdate = () => {
      fetchReports(false);
    };

    socket.on('card:created', handleRealtimeUpdate);
    socket.on('card:updated', handleRealtimeUpdate);
    socket.on('card:moved', handleRealtimeUpdate);
    socket.on('card:deleted', handleRealtimeUpdate);
    socket.on('card:archived', handleRealtimeUpdate);
    socket.on('card:restored', handleRealtimeUpdate);

    return () => {
      socket.off('card:created', handleRealtimeUpdate);
      socket.off('card:updated', handleRealtimeUpdate);
      socket.off('card:moved', handleRealtimeUpdate);
      socket.off('card:deleted', handleRealtimeUpdate);
      socket.off('card:archived', handleRealtimeUpdate);
      socket.off('card:restored', handleRealtimeUpdate);
    };
  }, [socket, workspace?.id, fetchReports]);

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
      csv += `To Do,${member.todo_tasks || 0}\n`;
      csv += `In Progress,${member.in_progress_tasks || 0}\n`;
      csv += `Completed,${member.completed_tasks || 0}\n`;
      csv += `Overdue,${member.overdue_tasks || 0}\n`;
      csv += `Completion Rate,${member.completion_rate}%\n\n`;

      csv += `ASSIGNED TASKS BREAKDOWN\n`;
      csv += `Task Title,Board,List,Stage,Due Date,Status,Days Overdue\n`;
      (member.tasks || []).forEach((t) => {
        let status = 'In Progress';
        if (t.is_complete || t.stage === 'done') status = 'Completed';
        else if (t.is_overdue) status = 'Overdue';
        else if (t.stage === 'todo') status = 'To Do';
        else if (t.stage === 'review') status = 'In Review';
        else if (t.is_due_soon) status = 'Due Soon';

        csv += `"${(t.title || '').replace(/"/g, '""')}","${(t.board_name || '').replace(/"/g, '""')}","${(t.list_name || '').replace(/"/g, '""')}","${t.stage || 'in_progress'}","${t.due_date ? formatDate(t.due_date) : 'No due date'}","${status}",${t.is_overdue ? 'Yes' : 'No'}\n`;
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
      csv += `Total Tasks,To Do Tasks,In Progress Tasks,Completed Tasks,Overdue Tasks,Completion Rate (%),Overdue Rate (%),Avg Cycle Time (Days)\n`;
      csv += `${summary.total_tasks || 0},${summary.todo_tasks || 0},${summary.in_progress_tasks || 0},${summary.completed_tasks || 0},${summary.overdue_tasks || 0},${summary.completion_rate || 0}%,${summary.overdue_rate || 0}%,${summary.avg_cycle_days || 0}\n\n`;

      csv += `PROJECT & BOARD BREAKDOWN\n`;
      csv += `Board Name,Total Tasks,To Do Tasks,In Progress Tasks,Completed Tasks,Overdue Tasks,Completion Rate (%)\n`;
      boards.forEach((b) => {
        csv += `"${b.name.replace(/"/g, '""')}",${b.total_tasks},${b.todo_tasks || 0},${b.in_progress_tasks || 0},${b.completed_tasks},${b.overdue_tasks},${b.completion_rate}%\n`;
      });
      csv += `\n`;

      csv += `USER PERFORMANCE & WORKLOAD\n`;
      csv += `Name,Email,Role,Assigned Tasks,To Do Tasks,In Progress Tasks,Completed Tasks,Overdue Tasks,Completion Rate (%)\n`;
      members.forEach((m) => {
        csv += `"${(m.name || '').replace(/"/g, '""')}","${m.email || ''}","${m.role || 'Member'}",${m.assigned_tasks},${m.todo_tasks || 0},${m.in_progress_tasks || 0},${m.completed_tasks},${m.overdue_tasks},${m.completion_rate}%\n`;
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
    todo_tasks: 0,
    in_progress_tasks: 0,
    review_tasks: 0,
    completed_tasks: 0,
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
  const stageBreakdown = reportsData?.stage_breakdown || {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0
  };
  const membersWorkload = reportsData?.members_workload || [];
  const overdueTasksList = reportsData?.overdue_tasks_list || [];
  const velocity = reportsData?.velocity || [];

  // Velocity max calculation for bar scaling
  const maxVelocityCount = useMemo(() => {
    let max = 1;
    velocity.forEach((v) => {
      if (v.created > max) max = v.created;
      if (v.completed > max) max = v.completed;
    });
    return max;
  }, [velocity]);

  // Filtered members for team performance
  const filteredMembers = useMemo(() => {
    return membersWorkload.filter((member) => {
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase();
        const matchesName = (member.name || '').toLowerCase().includes(q);
        const matchesEmail = (member.email || '').toLowerCase().includes(q);
        const matchesRole = (member.role || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole) return false;
      }

      if (userStatusFilter === 'active') {
        return (member.in_progress_tasks || 0) > 0 || (member.review_tasks || 0) > 0;
      }
      if (userStatusFilter === 'todo') {
        return (member.todo_tasks || 0) > 0;
      }
      if (userStatusFilter === 'overdue') {
        return (member.overdue_tasks || 0) > 0;
      }
      if (userStatusFilter === 'completed') {
        return member.assigned_tasks > 0 && member.completion_rate === 100;
      }
      if (userStatusFilter === 'creators') {
        return (member.created_tasks || 0) > 0;
      }

      return true;
    });
  }, [membersWorkload, userSearchQuery, userStatusFilter]);

  // Filtered boards for boards breakdown tab
  const filteredBoards = useMemo(() => {
    if (!boardSearchQuery.trim()) return boardsBreakdown;
    const q = boardSearchQuery.toLowerCase();
    return boardsBreakdown.filter((b) => (b.name || '').toLowerCase().includes(q));
  }, [boardsBreakdown, boardSearchQuery]);

  // Filtered column pipeline (matches list name or cards inside)
  const filteredPipeline = useMemo(() => {
    if (!pipelineSearchQuery.trim()) return statusBreakdown;
    const q = pipelineSearchQuery.toLowerCase();
    return statusBreakdown.filter(
      (s) =>
        (s.list_name || '').toLowerCase().includes(q) ||
        (s.board_name || '').toLowerCase().includes(q) ||
        (s.cards || []).some((c) => (c.title || '').toLowerCase().includes(q))
    );
  }, [statusBreakdown, pipelineSearchQuery]);

  // Filtered overdue tasks
  const filteredOverdue = useMemo(() => {
    if (!overdueSearchQuery.trim()) return overdueTasksList;
    const q = overdueSearchQuery.toLowerCase();
    return overdueTasksList.filter(
      (t) =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.board_name || '').toLowerCase().includes(q) ||
        (t.list_name || '').toLowerCase().includes(q)
    );
  }, [overdueTasksList, overdueSearchQuery]);

  // Dossier tasks list according to scope (assigned tasks vs cards created/reported)
  const activeDossierList = useMemo(() => {
    if (!selectedMemberDossier) return [];
    return dossierScope === 'created'
      ? (selectedMemberDossier.created_cards || [])
      : (selectedMemberDossier.tasks || []);
  }, [selectedMemberDossier, dossierScope]);

  // Dossier tasks filtered by active sub-tab
  const dossierTasks = useMemo(() => {
    if (!selectedMemberDossier) return [];
    const tasks = activeDossierList;
    if (dossierTaskTab === 'todo') return tasks.filter((t) => t.stage === 'todo' && !t.is_complete);
    if (dossierTaskTab === 'in_progress') return tasks.filter((t) => (t.stage === 'in_progress' || t.stage === 'review' || (!t.stage && !t.is_complete && !t.is_overdue)) && !t.is_complete && !t.is_overdue);
    if (dossierTaskTab === 'overdue') return tasks.filter((t) => t.is_overdue);
    if (dossierTaskTab === 'completed') return tasks.filter((t) => t.is_complete || t.stage === 'done');
    return tasks;
  }, [selectedMemberDossier, activeDossierList, dossierTaskTab]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-4 sm:p-6 md:p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full space-y-6 pb-16">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
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
              <div className="h-72 bg-surface border border-border rounded-xl animate-pulse" />
              <div className="h-72 bg-surface border border-border rounded-xl animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* Primary KPI Metric Cards (Comprehensive Workflow Stages) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
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
                  <span>To Do: <strong className="text-text-primary">{summary.todo_tasks || 0}</strong></span>
                  <span>Done: <strong className="text-success-text">{summary.completed_tasks}</strong></span>
                </div>
              </div>

              {/* To Do / Backlog Card */}
              <div className="p-4 sm:p-5 bg-surface border border-border rounded-xl shadow-xs hover:border-border-hover transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      To Do / Backlog
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-text-secondary">
                      <ListTodo className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-text-primary tracking-tight">
                      {summary.todo_tasks || 0}
                    </span>
                    <span className="text-xs text-text-secondary font-medium">pending</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                  <span>Awaiting start</span>
                  <span className="font-semibold text-text-muted">
                    {summary.total_tasks > 0 ? Math.round(((summary.todo_tasks || 0) / summary.total_tasks) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* In Progress Card */}
              <div className="p-4 sm:p-5 bg-surface border border-border rounded-xl shadow-xs hover:border-warning/40 transition-all flex flex-col justify-between">
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

            {/* Navigational Sub-Tabs Switcher (Shows all reports on this single page cleanly) */}
            <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-xl shadow-xs overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Executive Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'team'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Performance</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'team' ? 'bg-primary text-white ring-1 ring-white/40' : 'bg-surface-muted text-text-muted'
                  }`}
                >
                  {membersWorkload.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('boards')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'boards'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Boards & Projects</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'boards' ? 'bg-primary text-white ring-1 ring-white/40' : 'bg-surface-muted text-text-muted'
                  }`}
                >
                  {boardsBreakdown.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'pipeline'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Task Pipeline</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'pipeline' ? 'bg-primary text-white ring-1 ring-white/40' : 'bg-surface-muted text-text-muted'
                  }`}
                >
                  {statusBreakdown.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overdue')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'overdue'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Overdue Action Items</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'overdue' ? 'bg-primary text-white ring-1 ring-white/40' : summary.overdue_tasks > 0 ? 'bg-danger text-white' : 'bg-surface-muted text-text-muted'
                  }`}
                >
                  {overdueTasksList.length}
                </span>
              </button>
            </div>

            {/* TAB CONTENT 1: OVERVIEW DASHBOARD */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Project & Board Performance Widget */}
                <div className="p-5 bg-surface border border-border rounded-xl shadow-xs h-[420px] flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                        Project & Board Performance
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" size="sm">
                        {boardsBreakdown.length} Boards
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setActiveTab('boards')}
                        className="text-xs font-semibold text-primary hover:underline ml-1"
                      >
                        View All →
                      </button>
                    </div>
                  </div>

                  {boardsBreakdown.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-xs">
                      No active boards found in this workspace.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-3 custom-scrollbar">
                      {boardsBreakdown.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 bg-surface-muted border border-border rounded-lg hover:border-border-hover transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-3 h-3 rounded-full shrink-0 ${b.background_color || 'bg-primary'}`}
                              />
                              <button
                                type="button"
                                onClick={() => navigate(getBoardUrl(b.id))}
                                className="text-xs sm:text-sm font-semibold text-text-primary hover:text-primary transition-colors truncate flex items-center gap-1 group"
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

                          <div className="mb-2">
                            <ProgressBar
                              value={b.completion_rate}
                              max={100}
                              variant={b.completion_rate === 100 ? 'success' : 'primary'}
                              size="sm"
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs text-text-secondary">
                            <div className="flex items-center gap-2 text-[11px] flex-wrap">
                              <span>
                                <strong className="text-text-primary">{b.total_tasks}</strong> total
                              </span>
                              <span>·</span>
                              <span>
                                <strong className="text-text-secondary">{b.todo_tasks || 0}</strong> to do
                              </span>
                              <span>·</span>
                              <span>
                                <strong className="text-primary">{b.in_progress_tasks || 0}</strong> active
                              </span>
                              <span>·</span>
                              <span>
                                <strong className="text-success-text">{b.completed_tasks}</strong> done
                              </span>
                            </div>
                            <span className="text-text-muted text-[11px] shrink-0">
                              {b.member_count} member{b.member_count === 1 ? '' : 's'}
                            </span>
                          </div>

                          {b.lists && b.lists.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-border/40">
                              {b.lists.map((l) => (
                                <span
                                  key={l.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary"
                                >
                                  {l.name}: <strong className="text-text-primary">{l.task_count}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-2 text-right shrink-0">
                    <span className="text-[11px] text-text-muted">
                      Scroll to view all {boardsBreakdown.length} projects
                    </span>
                  </div>
                </div>

                {/* 2. Daily Velocity & Throughput Widget */}
                <div className="p-5 bg-surface border border-border rounded-xl shadow-xs h-[420px] flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
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

                  <p className="text-xs text-text-secondary mt-2 mb-1 shrink-0">
                    Task volume created versus completed over the past 7 days across the workspace.
                  </p>

                  <div className="flex-1 flex flex-col justify-end">
                    <div className="grid grid-cols-7 gap-2 items-end h-48 pt-4 pb-2 border-b border-border">
                      {velocity.map((day) => {
                        const createdHeight = Math.max(8, Math.round((day.created / maxVelocityCount) * 130));
                        const completedHeight = Math.max(8, Math.round((day.completed / maxVelocityCount) * 130));

                        return (
                          <div key={day.date} className="flex flex-col items-center justify-end h-full gap-1 group">
                            <div className="text-[10px] font-semibold text-text-primary opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                              +{day.created} / ✓{day.completed}
                            </div>
                            <div className="flex items-end gap-1 w-full justify-center">
                              {/* Created Bar */}
                              <div
                                style={{ height: `${day.created > 0 ? createdHeight : 4}px` }}
                                className={`w-3.5 rounded-t-sm transition-all ${
                                  day.created > 0 ? 'bg-primary' : 'bg-surface-muted'
                                }`}
                                title={`${day.label}: ${day.created} created`}
                              />
                              {/* Completed Bar */}
                              <div
                                style={{ height: `${day.completed > 0 ? completedHeight : 4}px` }}
                                className={`w-3.5 rounded-t-sm transition-all ${
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
                  </div>

                  <div className="mt-3 pt-2 flex items-center justify-between text-xs text-text-secondary shrink-0">
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

                {/* 3. Task Pipeline by Column Widget */}
                <div className="p-5 bg-surface border border-border rounded-xl shadow-xs h-[420px] flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                        Task Pipeline Distribution
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" size="sm">
                        {statusBreakdown.length} Columns
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setActiveTab('pipeline')}
                        className="text-xs font-semibold text-primary hover:underline ml-1"
                      >
                        View All →
                      </button>
                    </div>
                  </div>

                  {statusBreakdown.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-xs">
                      No status columns found in the active boards.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-3 custom-scrollbar">
                      {statusBreakdown.map((s) => (
                        <div
                          key={`${s.board_id}-${s.list_id}`}
                          className="p-3 bg-surface-muted border border-border rounded-lg space-y-1.5 hover:border-border-hover transition-colors"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-text-primary truncate">{s.list_name}</span>
                              <Badge
                                variant={
                                  s.stage === 'done'
                                    ? 'success'
                                    : s.stage === 'todo'
                                    ? 'secondary'
                                    : s.stage === 'review'
                                    ? 'info'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {s.stage === 'todo'
                                  ? 'To Do'
                                  : s.stage === 'review'
                                  ? 'Review'
                                  : s.stage === 'done'
                                  ? 'Done'
                                  : 'In Progress'}
                              </Badge>
                            </div>
                            <span className="font-bold text-text-primary shrink-0">{s.task_count} cards</span>
                          </div>
                          <ProgressBar value={s.percentage} max={100} variant="primary" size="sm" />
                          <div className="flex items-center justify-between text-[11px] text-text-secondary">
                            <span className="truncate text-text-muted">{s.board_name}</span>
                            <span className="font-medium">{s.percentage}% of workspace</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-2 text-right shrink-0">
                    <span className="text-[11px] text-text-muted">
                      Showing column breakdown across all boards
                    </span>
                  </div>
                </div>

                {/* 4. Overdue Tasks Quick View Widget */}
                <div className="p-5 bg-surface border border-border rounded-xl shadow-xs h-[420px] flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 ${summary.overdue_tasks > 0 ? 'text-danger-text' : 'text-success-text'}`}
                      />
                      <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                        High Priority & Overdue Items
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={summary.overdue_tasks > 0 ? 'danger' : 'success'} size="sm">
                        {summary.overdue_tasks} Overdue
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setActiveTab('overdue')}
                        className="text-xs font-semibold text-primary hover:underline ml-1"
                      >
                        View All →
                      </button>
                    </div>
                  </div>

                  {overdueTasksList.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                      <div className="w-12 h-12 rounded-full bg-success-tint border border-success/20 flex items-center justify-center text-success-text mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-text-primary">All Tasks On Schedule!</h3>
                      <p className="text-xs text-text-secondary mt-1 max-w-xs">
                        No overdue cards detected across this workspace. Workflow is clean!
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-3 custom-scrollbar">
                      {overdueTasksList.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 bg-danger-tint/10 border border-danger/30 rounded-lg flex items-center justify-between gap-3 hover:border-danger/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-text-primary truncate">{task.title}</h4>
                            <p className="text-[11px] text-text-secondary truncate mt-0.5">
                              {task.board_name} / {task.list_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="danger" size="sm">
                                {task.days_overdue}d overdue
                              </Badge>
                              {task.due_date && (
                                <span className="text-[10px] text-text-muted">
                                  Due {formatShortDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {task.members && task.members.length > 0 && (
                              <div className="flex items-center -space-x-1.5">
                                {task.members.slice(0, 3).map((m) => (
                                  <Avatar key={m.id} name={m.name} src={m.avatar_url || m.avatar} user={m} size="xs" />
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate(getBoardUrl(task.board_id, task.id))}
                              className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 mt-1"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-2 text-right shrink-0">
                    <span className="text-[11px] text-text-muted">
                      Immediate action required on overdue deadlines
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: TEAM PERFORMANCE */}
            {activeTab === 'team' && (
              <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
                {/* Search & Filter Header */}
                <div className="p-4 sm:p-5 border-b border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-text-primary tracking-tight">
                        Team Performance & Individual Workloads
                      </h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Inspect individual capacity, assigned cards, workflow stages, completion rates, and overdue flags.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-text-secondary">
                      Showing {filteredMembers.length} of {membersWorkload.length} team members
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder="Search team member by name, email, or role..."
                        className="w-full h-8 pl-8 pr-3 text-xs bg-surface-muted text-text-primary border border-border rounded-lg shadow-xs focus:outline-none focus:border-primary"
                      />
                      {userSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setUserSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                      {[
                        { id: 'all', label: 'All Members', count: membersWorkload.length },
                        {
                          id: 'creators',
                          label: 'Card Creators & Testers',
                          count: membersWorkload.filter((m) => (m.created_tasks || 0) > 0).length
                        },
                        {
                          id: 'todo',
                          label: 'With To Do',
                          count: membersWorkload.filter((m) => (m.todo_tasks || 0) > 0).length
                        },
                        {
                          id: 'active',
                          label: 'Active (In Progress)',
                          count: membersWorkload.filter((m) => (m.in_progress_tasks || 0) > 0).length
                        },
                        {
                          id: 'overdue',
                          label: 'With Overdue',
                          count: membersWorkload.filter((m) => (m.overdue_tasks || 0) > 0).length
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
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                            userStatusFilter === filter.id
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-surface-muted text-text-secondary hover:text-text-primary border border-border'
                          }`}
                        >
                          {filter.label} ({filter.count})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Table Content with Bounded Max-Height & Inner Scroll */}
                <div className="max-h-[520px] overflow-y-auto custom-scrollbar">
                  {filteredMembers.length === 0 ? (
                    <div className="py-16 text-center text-text-muted text-xs space-y-2">
                      <UserCheck className="w-8 h-8 mx-auto text-text-muted opacity-60" />
                      <p className="font-semibold text-text-primary">No members match your search criteria</p>
                      <p className="text-text-secondary">Try clearing your search input or switching filters.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-muted/80 sticky top-0 z-10 border-b border-border text-text-secondary uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Team Member</th>
                          <th className="py-3 px-3 font-semibold text-center">Cards Created</th>
                          <th className="py-3 px-3 font-semibold text-center">Assigned</th>
                          <th className="py-3 px-3 font-semibold text-center">To Do</th>
                          <th className="py-3 px-3 font-semibold text-center">In Progress</th>
                          <th className="py-3 px-3 font-semibold text-center">Done</th>
                          <th className="py-3 px-3 font-semibold text-center">Overdue</th>
                          <th className="py-3 px-3 font-semibold min-w-[150px]">Progress & Resolution</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredMembers.map((member) => (
                          <tr
                            key={member.id}
                            className="hover:bg-surface-hover/70 transition-colors cursor-pointer group"
                            onClick={() => {
                              setSelectedMemberDossier(member);
                              setDossierScope((member.assigned_tasks === 0 && member.created_tasks > 0) ? 'created' : 'assigned');
                              setDossierTaskTab('all');
                            }}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar name={member.name} src={member.avatar_url || member.avatar} user={member} size="md" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-text-primary truncate">{member.name}</span>
                                    <Badge variant="secondary" size="sm">
                                      {member.role || 'Member'}
                                    </Badge>
                                  </div>
                                  <span className="text-[11px] text-text-secondary truncate block mt-0.5">
                                    {member.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {member.created_tasks > 0 ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-bold text-primary text-sm">
                                    {member.created_tasks}
                                  </span>
                                  {member.created_completed_tasks > 0 && (
                                    <span className="text-[10px] text-success-text font-medium">
                                      {member.created_completed_tasks} resolved
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-bold text-text-primary text-sm">{member.assigned_tasks}</span>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-text-secondary">{member.todo_tasks || 0}</span>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-primary">{member.in_progress_tasks || 0}</span>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-success-text">{member.completed_tasks || 0}</span>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {member.overdue_tasks > 0 ? (
                                <Badge variant="danger" size="sm">
                                  {member.overdue_tasks} late
                                </Badge>
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              {member.assigned_tasks > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-text-primary">{member.completion_rate}%</span>
                                    <span className="text-text-muted">
                                      {member.completed_tasks}/{member.assigned_tasks} done
                                    </span>
                                  </div>
                                  <ProgressBar
                                    value={member.completion_rate}
                                    max={100}
                                    variant={member.completion_rate === 100 ? 'success' : 'primary'}
                                    size="sm"
                                  />
                                  {member.created_tasks > 0 && (
                                    <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
                                      <span>Created: {member.created_tasks}</span>
                                      <span className="text-success-text font-medium">{member.created_resolution_rate}% resolved</span>
                                    </div>
                                  )}
                                </div>
                              ) : member.created_tasks > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-primary">{member.created_resolution_rate}%</span>
                                    <span className="text-text-muted">
                                      {member.created_completed_tasks}/{member.created_tasks} resolved
                                    </span>
                                  </div>
                                  <ProgressBar
                                    value={member.created_resolution_rate}
                                    max={100}
                                    variant={member.created_resolution_rate === 100 ? 'success' : 'primary'}
                                    size="sm"
                                  />
                                  <span className="text-[10px] font-semibold text-primary block">
                                    Tester / Creator Progress
                                  </span>
                                </div>
                              ) : (
                                <div className="text-center text-text-muted text-[11px]">
                                  —
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMemberDossier(member);
                                    setDossierScope((member.assigned_tasks === 0 && member.created_tasks > 0) ? 'created' : 'assigned');
                                    setDossierTaskTab('all');
                                  }}
                                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                                  title="View full task dossier"
                                >
                                  Details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExportUserCsv(member)}
                                  disabled={member.assigned_tasks === 0}
                                  title="Export individual CSV"
                                  leftIcon={<Download className="w-3.5 h-3.5" />}
                                >
                                  CSV
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: BOARDS & PROJECTS BREAKDOWN */}
            {activeTab === 'boards' && (
              <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-text-primary tracking-tight">
                      Projects & Boards Breakdown
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Progress, health status, and workflow distribution for all {boardsBreakdown.length} active boards.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={boardSearchQuery}
                      onChange={(e) => setBoardSearchQuery(e.target.value)}
                      placeholder="Search boards..."
                      className="w-full h-8 pl-8 pr-3 text-xs bg-surface-muted text-text-primary border border-border rounded-lg shadow-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="max-h-[540px] overflow-y-auto p-4 sm:p-5 custom-scrollbar">
                  {filteredBoards.length === 0 ? (
                    <div className="py-12 text-center text-text-muted text-xs">
                      No boards found matching your search.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredBoards.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 bg-surface-muted border border-border rounded-xl space-y-3 hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${b.background_color || 'bg-primary'}`}
                                />
                                <h3 className="font-bold text-text-primary text-sm truncate">{b.name}</h3>
                              </div>
                              <Badge variant={b.overdue_tasks > 0 ? 'danger' : 'secondary'} size="sm">
                                {b.overdue_tasks > 0 ? `${b.overdue_tasks} overdue` : 'On track'}
                              </Badge>
                            </div>

                            <div className="space-y-1.5 mt-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-text-secondary">Completion</span>
                                <span className="font-bold text-text-primary">{b.completion_rate}%</span>
                              </div>
                              <ProgressBar
                                value={b.completion_rate}
                                max={100}
                                variant={b.completion_rate === 100 ? 'success' : 'primary'}
                                size="sm"
                              />
                            </div>

                            {/* 4-Stat Workflow Grid */}
                            <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3 border-t border-border text-center text-xs">
                              <div>
                                <span className="text-[10px] text-text-muted uppercase block">Total</span>
                                <span className="font-bold text-text-primary mt-0.5 block">{b.total_tasks}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted uppercase block">To Do</span>
                                <span className="font-bold text-text-secondary mt-0.5 block">{b.todo_tasks || 0}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted uppercase block">Active</span>
                                <span className="font-bold text-primary mt-0.5 block">{b.in_progress_tasks || 0}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted uppercase block">Done</span>
                                <span className="font-bold text-success-text mt-0.5 block">{b.completed_tasks}</span>
                              </div>
                            </div>

                            {/* Lists preview on this board */}
                            {b.lists && b.lists.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-border/50">
                                <span className="text-[10px] uppercase font-bold text-text-muted block mb-1.5">Columns</span>
                                <div className="flex flex-wrap gap-1">
                                  {b.lists.map((l) => (
                                    <span
                                      key={l.id}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-surface border border-border text-text-secondary flex items-center gap-1"
                                    >
                                      <span>{l.name}</span>
                                      <strong className="text-text-primary">({l.task_count})</strong>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                            <span className="text-text-muted text-[11px]">
                              {b.member_count} member{b.member_count === 1 ? '' : 's'} assigned
                            </span>
                            <button
                              type="button"
                              onClick={() => navigate(getBoardUrl(b.id))}
                              className="font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
                            >
                              <span>Open Board</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: TASK PIPELINE & COLUMN DISTRIBUTION */}
            {activeTab === 'pipeline' && (
              <div className="space-y-5">
                {/* Stage Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-surface border border-border rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">To Do Stage</span>
                      <span className="text-2xl font-black text-text-primary mt-0.5 block">{stageBreakdown.todo}</span>
                      <span className="text-[11px] text-text-secondary">backlog & pending</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-text-secondary">
                      <ListTodo className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-3.5 bg-surface border border-border rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">In Progress Stage</span>
                      <span className="text-2xl font-black text-primary mt-0.5 block">{stageBreakdown.in_progress}</span>
                      <span className="text-[11px] text-text-secondary">active development</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-primary-tint border border-primary/20 flex items-center justify-center text-primary">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-3.5 bg-surface border border-border rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Review / QA Stage</span>
                      <span className="text-2xl font-black text-info-text mt-0.5 block">{stageBreakdown.review}</span>
                      <span className="text-[11px] text-text-secondary">testing & review</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-info-tint border border-info/20 flex items-center justify-center text-info-text">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="p-3.5 bg-surface border border-border rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Done Stage</span>
                      <span className="text-2xl font-black text-success-text mt-0.5 block">{stageBreakdown.done}</span>
                      <span className="text-[11px] text-text-secondary">completed workflow</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-success-tint border border-success/20 flex items-center justify-center text-success-text">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Pipeline List Columns with Cards */}
                <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
                  <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-text-primary tracking-tight">
                        Task Pipeline & Column Distribution
                      </h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Inspect active cards distributed across all lists, columns, and workflow stages.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={pipelineSearchQuery}
                        onChange={(e) => setPipelineSearchQuery(e.target.value)}
                        placeholder="Search column, board, or task title..."
                        className="w-full h-8 pl-8 pr-3 text-xs bg-surface-muted text-text-primary border border-border rounded-lg shadow-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="max-h-[560px] overflow-y-auto p-4 sm:p-5 custom-scrollbar">
                    {filteredPipeline.length === 0 ? (
                      <div className="py-12 text-center text-text-muted text-xs">
                        No status columns found matching your search.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPipeline.map((s) => (
                          <div
                            key={`${s.board_id}-${s.list_id}`}
                            className="bg-surface-muted border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-text-primary text-sm truncate">{s.list_name}</span>
                                <Badge
                                  variant={
                                    s.stage === 'done'
                                      ? 'success'
                                      : s.stage === 'todo'
                                      ? 'secondary'
                                      : s.stage === 'review'
                                      ? 'info'
                                      : 'warning'
                                  }
                                  size="sm"
                                >
                                  {s.stage === 'todo'
                                    ? 'To Do'
                                    : s.stage === 'review'
                                    ? 'Review'
                                    : s.stage === 'done'
                                    ? 'Done'
                                    : 'In Progress'}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-text-secondary mb-2">
                                <span className="truncate text-text-muted font-medium">{s.board_name}</span>
                                <span className="font-bold text-text-primary">{s.task_count} cards ({s.percentage}%)</span>
                              </div>

                              <ProgressBar value={s.percentage} max={100} variant="primary" size="sm" />

                              {/* Cards preview in this list column */}
                              <div className="mt-3 pt-2.5 border-t border-border/60 space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                {!s.cards || s.cards.length === 0 ? (
                                  <div className="py-6 text-center text-text-muted text-[11px] italic">
                                    No active cards currently in this column
                                  </div>
                                ) : (
                                  s.cards.map((card) => (
                                    <div
                                      key={card.id}
                                      onClick={() => navigate(getBoardUrl(card.board_id, card.id))}
                                      className="p-2.5 bg-surface border border-border rounded-lg hover:border-primary/50 transition-all cursor-pointer group shadow-2xs"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className={`text-xs font-semibold group-hover:text-primary transition-colors line-clamp-2 ${card.is_complete ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                          {card.title}
                                        </span>
                                        <ArrowUpRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                      </div>

                                      <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/40 text-[10px]">
                                        <div className="flex items-center gap-1.5">
                                          {card.is_complete ? (
                                            <span className="text-success-text font-bold flex items-center gap-0.5">
                                              <Check className="w-2.5 h-2.5" /> Done
                                            </span>
                                          ) : card.is_overdue ? (
                                            <span className="text-danger-text font-bold">Late</span>
                                          ) : card.due_date ? (
                                            <span className="text-text-muted">{formatShortDate(card.due_date)}</span>
                                          ) : (
                                            <span className="text-text-muted">No date</span>
                                          )}
                                        </div>

                                        {card.members && card.members.length > 0 && (
                                          <div className="flex items-center -space-x-1">
                                            {card.members.slice(0, 2).map((m) => (
                                              <Avatar key={m.id} name={m.name} src={m.avatar_url || m.avatar} user={m} size="xs" />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                              <span className="text-text-muted">
                                {s.completed_count > 0 ? `${s.completed_count} completed` : '0 completed'}
                              </span>
                              <button
                                type="button"
                                onClick={() => navigate(getBoardUrl(s.board_id))}
                                className="font-semibold text-primary hover:underline"
                              >
                                Board →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: OVERDUE ACTION ITEMS */}
            {activeTab === 'overdue' && (
              <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 ${summary.overdue_tasks > 0 ? 'text-danger-text' : 'text-success-text'}`}
                      />
                      <h2 className="text-base font-bold text-text-primary tracking-tight">
                        Overdue Tasks & Action Items
                      </h2>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Identify cards that missed their deadlines and take immediate action.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={overdueSearchQuery}
                      onChange={(e) => setOverdueSearchQuery(e.target.value)}
                      placeholder="Search overdue task title or board..."
                      className="w-full h-8 pl-8 pr-3 text-xs bg-surface-muted text-text-primary border border-border rounded-lg shadow-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="max-h-[520px] overflow-y-auto custom-scrollbar">
                  {filteredOverdue.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-success-tint border border-success/20 flex items-center justify-center text-success-text mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-text-primary">All Tasks On Schedule!</h3>
                      <p className="text-xs text-text-secondary mt-1 max-w-sm">
                        No overdue tasks found matching your criteria. Great work keeping tasks on time!
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-muted/80 sticky top-0 z-10 border-b border-border text-text-secondary uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Task Title</th>
                          <th className="py-3 px-3 font-semibold">Board / List</th>
                          <th className="py-3 px-3 font-semibold">Due Date</th>
                          <th className="py-3 px-3 font-semibold">Delay</th>
                          <th className="py-3 px-3 font-semibold">Assignees</th>
                          <th className="py-3 px-4 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredOverdue.map((task) => (
                          <tr key={task.id} className="hover:bg-surface-hover/70 transition-colors">
                            <td className="py-3 px-4 font-semibold text-text-primary max-w-xs truncate">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-danger-text shrink-0" />
                                <span>{task.title}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-text-secondary">
                              <span className="font-semibold text-text-primary">{task.board_name}</span>
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
                                    <Avatar key={m.id} name={m.name} src={m.avatar_url || m.avatar} user={m} size="xs" />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-text-muted italic">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => navigate(getBoardUrl(task.board_id, task.id))}
                                rightIcon={<ExternalLink className="w-3 h-3" />}
                              >
                                Open Card
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* DEDICATED MEMBER DOSSIER MODAL */}
      {selectedMemberDossier && (
        <Modal
          isOpen={!!selectedMemberDossier}
          onClose={() => setSelectedMemberDossier(null)}
          title={
            <div className="flex items-center gap-3">
              <Avatar name={selectedMemberDossier.name} src={selectedMemberDossier.avatar_url || selectedMemberDossier.avatar} user={selectedMemberDossier} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary text-base">
                    {selectedMemberDossier.name}
                  </span>
                  <Badge variant="secondary" size="sm">
                    {selectedMemberDossier.role || 'Member'}
                  </Badge>
                </div>
                <span className="text-xs text-text-secondary block font-normal">
                  {selectedMemberDossier.email}
                </span>
              </div>
            </div>
          }
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportUserCsv(selectedMemberDossier)}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export User Report (CSV)
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedMemberDossier(null)}
              >
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-1">
            {/* Dual-Scope Switcher: Assigned Work vs Created/Reported Cards */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-muted/60 p-1.5 rounded-xl border border-border">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDossierScope('assigned');
                    setDossierTaskTab('all');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    dossierScope === 'assigned'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Assigned Work ({selectedMemberDossier.assigned_tasks || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDossierScope('created');
                    setDossierTaskTab('all');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    dossierScope === 'created'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Created & Reported Cards ({selectedMemberDossier.created_tasks || 0})</span>
                </button>
              </div>

              <span className="text-[11px] text-text-muted px-2">
                {dossierScope === 'created'
                  ? 'Tracking cards created, bug logging & team resolution rate'
                  : 'Tracking task execution and assigned delivery velocity'}
              </span>
            </div>

            {/* 5-KPI Chips Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 bg-surface-muted border border-border rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-text-muted block">
                  {dossierScope === 'created' ? 'Created Cards' : 'Assigned Tasks'}
                </span>
                <span className="text-lg font-bold text-text-primary mt-0.5 block">
                  {dossierScope === 'created'
                    ? selectedMemberDossier.created_tasks || 0
                    : selectedMemberDossier.assigned_tasks || 0}
                </span>
              </div>
              <div className="p-3 bg-surface-muted border border-border rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-text-muted block">To Do / Backlog</span>
                <span className="text-lg font-bold text-text-secondary mt-0.5 block">
                  {dossierScope === 'created'
                    ? selectedMemberDossier.created_todo_tasks || 0
                    : selectedMemberDossier.todo_tasks || 0}
                </span>
              </div>
              <div className="p-3 bg-surface-muted border border-border rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-text-muted block">In Progress</span>
                <span className="text-lg font-bold text-primary mt-0.5 block">
                  {dossierScope === 'created'
                    ? selectedMemberDossier.created_in_progress_tasks || 0
                    : selectedMemberDossier.in_progress_tasks || 0}
                </span>
              </div>
              <div className="p-3 bg-surface-muted border border-border rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-text-muted block">
                  {dossierScope === 'created' ? 'Resolved Rate' : 'Completed'}
                </span>
                <span className="text-lg font-bold text-success-text mt-0.5 block">
                  {dossierScope === 'created'
                    ? `${selectedMemberDossier.created_resolution_rate || 0}%`
                    : `${selectedMemberDossier.completion_rate || 0}%`}
                </span>
                <span className="text-[10px] text-text-muted">
                  {dossierScope === 'created'
                    ? `${selectedMemberDossier.created_completed_tasks || 0} done`
                    : `${selectedMemberDossier.completed_tasks || 0} done`}
                </span>
              </div>
              <div className="p-3 bg-surface-muted border border-border rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Overdue</span>
                <span
                  className={`text-lg font-bold mt-0.5 block ${
                    (dossierScope === 'created' ? selectedMemberDossier.created_overdue_tasks : selectedMemberDossier.overdue_tasks) > 0
                      ? 'text-danger-text'
                      : 'text-text-secondary'
                  }`}
                >
                  {dossierScope === 'created'
                    ? selectedMemberDossier.created_overdue_tasks || 0
                    : selectedMemberDossier.overdue_tasks || 0}
                </span>
              </div>
            </div>

            {/* Boards assigned or involved */}
            {selectedMemberDossier.boards && selectedMemberDossier.boards.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-semibold text-text-secondary">Projects:</span>
                {selectedMemberDossier.boards.map((b) => (
                  <Badge key={b.id} variant="secondary" size="sm">
                    {b.name} ({b.completed_count}/{b.task_count})
                  </Badge>
                ))}
              </div>
            )}

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'All Tasks', count: activeDossierList.length },
                  {
                    id: 'todo',
                    label: 'To Do',
                    count: activeDossierList.filter((t) => t.stage === 'todo' && !t.is_complete).length
                  },
                  {
                    id: 'in_progress',
                    label: 'In Progress',
                    count: activeDossierList.filter((t) => (t.stage === 'in_progress' || t.stage === 'review' || (!t.stage && !t.is_complete && !t.is_overdue)) && !t.is_complete && !t.is_overdue).length
                  },
                  {
                    id: 'completed',
                    label: dossierScope === 'created' ? 'Resolved' : 'Completed',
                    count: activeDossierList.filter((t) => t.is_complete || t.stage === 'done').length
                  },
                  {
                    id: 'overdue',
                    label: 'Overdue',
                    count: activeDossierList.filter((t) => t.is_overdue).length
                  }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDossierTaskTab(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      dossierTaskTab === tab.id
                        ? 'bg-primary text-white font-bold shadow-xs'
                        : 'bg-surface-muted text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <span className="text-xs text-text-muted">
                Showing {dossierTasks.length} {dossierScope === 'created' ? 'created card' : 'task'}{dossierTasks.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Tasks Table (Bounded with smooth scroll) */}
            <div className="max-h-[340px] overflow-y-auto custom-scrollbar border border-border rounded-lg overflow-hidden">
              {dossierTasks.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs">
                  {dossierScope === 'created'
                    ? 'No created cards found under this filter.'
                    : 'No assigned tasks found under this filter.'}
                </div>
              ) : (
                <table className="w-full text-left text-xs bg-surface">
                  <thead className="bg-surface-muted/70 sticky top-0 border-b border-border text-text-secondary uppercase text-[10px] tracking-wider z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Card Title</th>
                      <th className="py-2.5 px-3 font-semibold">Board / List</th>
                      {dossierScope === 'created' && (
                        <th className="py-2.5 px-3 font-semibold">Assigned To</th>
                      )}
                      <th className="py-2.5 px-3 font-semibold">Due Date</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dossierTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-surface-hover/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-text-primary max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            {task.is_complete || task.stage === 'done' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success-text shrink-0" />
                            ) : task.is_overdue ? (
                              <AlertCircle className="w-3.5 h-3.5 text-danger-text shrink-0" />
                            ) : task.stage === 'todo' ? (
                              <ListTodo className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            )}
                            <span className={task.is_complete || task.stage === 'done' ? 'line-through text-text-muted' : ''}>
                              {task.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-text-secondary">
                          <span className="font-semibold text-text-primary">{task.board_name}</span>
                          <span className="text-primary font-medium ml-1">/ {task.list_name}</span>
                        </td>
                        {dossierScope === 'created' && (
                          <td className="py-2.5 px-3">
                            {task.members && task.members.length > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center -space-x-1.5">
                                  {task.members.slice(0, 3).map((m) => (
                                    <Avatar key={m.id} name={m.name} src={m.avatar_url || m.avatar} user={m} size="xs" />
                                  ))}
                                </div>
                                <span className="text-text-secondary text-[11px] truncate max-w-[120px]">
                                  {task.members.map((m) => m.name).join(', ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-text-muted italic text-[11px]">Unassigned</span>
                            )}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-text-secondary">
                          {task.due_date ? formatShortDate(task.due_date) : 'No due date'}
                        </td>
                        <td className="py-2.5 px-3">
                          {task.is_complete || task.stage === 'done' ? (
                            <Badge variant="success" size="sm">
                              Completed
                            </Badge>
                          ) : task.is_overdue ? (
                            <Badge variant="danger" size="sm">
                              Overdue
                            </Badge>
                          ) : task.stage === 'todo' ? (
                            <Badge variant="secondary" size="sm">
                              To Do
                            </Badge>
                          ) : task.stage === 'review' ? (
                            <Badge variant="info" size="sm">
                              In Review
                            </Badge>
                          ) : task.is_due_soon ? (
                            <Badge variant="warning" size="sm">
                              Due Soon
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              In Progress
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberDossier(null);
                              navigate(getBoardUrl(task.board_id, task.id));
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
