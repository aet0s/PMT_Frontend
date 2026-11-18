// client/src/pages/ReportsPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  LayoutDashboard,
  FolderKanban,
  Users,
  AlertTriangle
} from 'lucide-react';
import { getWorkspaceReports } from '../api/workspaces';
import { useSocket } from '../context/SocketProvider';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';

import ReportsHeader from '../components/Reports/ReportsHeader';
import ReportsKpiSummary from '../components/Reports/ReportsKpiSummary';
import ReportsTaskStatus from '../components/Reports/ReportsTaskStatus';
import ReportsBoardPerformance from '../components/Reports/ReportsBoardPerformance';
import ReportsTeamWorkload from '../components/Reports/ReportsTeamWorkload';
import ReportsAttentionList from '../components/Reports/ReportsAttentionList';
import ReportsTrends from '../components/Reports/ReportsTrends';
import ReportsLabels from '../components/Reports/ReportsLabels';
import ReportMemberDetailsDrawer from '../components/Reports/ReportMemberDetailsDrawer';
import { exportWorkspaceReportCsv } from '../components/Reports/reportsUtils';

export default function ReportsPage({ workspace, workspaces = [] }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Canonical RBAC permissions
  const canViewReports = Boolean(hasPermission('report.view_project'));
  const canViewTeam = Boolean(hasPermission('report.view_team'));
  const canExportReports = Boolean(hasPermission('report.export'));

  // Unified persistent filters - Default is 'all' (Consolidated) so management sees total view across all workspaces
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => {
    const fromUrl = searchParams.get('workspaceId');
    if (fromUrl) return fromUrl;
    return 'all';
  });

  const [selectedBoardId, setSelectedBoardId] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');

  // Selected member for detail drawer
  const [selectedMember, setSelectedMember] = useState(null);

  // Active view tab: 'overview' | 'boards' | 'team' | 'risks'
  const [activeTab, setActiveTab] = useState(() => {
    const fromUrl = searchParams.get('tab');
    if (['overview', 'boards', 'team', 'risks'].includes(fromUrl)) {
      return fromUrl;
    }
    return 'overview';
  });

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'overview') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Sanitize activeTab if permission revoked
  useEffect(() => {
    if (activeTab === 'team' && !canViewTeam) {
      handleTabChange('overview');
    }
  }, [activeTab, canViewTeam, handleTabChange]);

  // Active in-flight request tracker to prevent race conditions
  const activeRequestIdRef = useRef(0);
  const debounceTimerRef = useRef(null);

  // Page state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsData, setReportsData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Board and card navigation helper
  const getBoardUrl = useCallback((boardId, cardId = null) => {
    const wsId = selectedWorkspaceId !== 'all' ? selectedWorkspaceId : workspace?.id;
    const base = wsId ? `/w/${wsId}/p/${boardId}/board` : `/b/${boardId}`;
    return cardId ? `${base}?card=${cardId}` : base;
  }, [selectedWorkspaceId, workspace?.id]);

  // Real-time socket integration
  let socketContext = null;
  try {
    socketContext = useSocket();
  } catch {
    // Fallback when outside provider
  }
  const socket = socketContext?.socket;

  // Workspace options for dropdown selector
  const workspaceOptions = useMemo(() => {
    const wsMap = new Map();
    wsMap.set('all', 'All Workspaces (Consolidated)');

    (workspaces || []).forEach((w) => {
      if (w && w.id) wsMap.set(String(w.id), w.name || `Workspace #${w.id}`);
    });

    (reportsData?.workspaces || []).forEach((w) => {
      if (w && w.id) wsMap.set(String(w.id), w.name || `Workspace #${w.id}`);
    });

    if (workspace?.id && !wsMap.has(String(workspace.id))) {
      wsMap.set(String(workspace.id), workspace.name || `Workspace #${workspace.id}`);
    }

    return Array.from(wsMap.entries()).map(([value, label]) => ({
      value,
      id: value,
      label
    }));
  }, [workspaces, reportsData?.workspaces, workspace]);

  // Handle workspace change with searchParams sync
  const handleWorkspaceChange = useCallback((newWsId) => {
    setSelectedWorkspaceId(newWsId);
    setSelectedBoardId('all');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newWsId && newWsId !== 'all') {
        next.set('workspaceId', newWsId);
      } else {
        next.delete('workspaceId');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Dynamic document title
  useEffect(() => {
    if (selectedWorkspaceId === 'all') {
      document.title = 'Consolidated Reports & Analytics | TaskFlow';
    } else {
      const wsName = workspaceOptions.find((w) => String(w.value) === String(selectedWorkspaceId))?.label || workspace?.name || 'Workspace';
      document.title = `${wsName} - Reports & Analytics | TaskFlow`;
    }
  }, [selectedWorkspaceId, workspaceOptions, workspace?.name]);

  // Fetch report data over encrypted POST /api/secure with hybrid transport
  const fetchReports = useCallback(
    async (isManualRefresh = false) => {
      if (!canViewReports) return;

      const targetWs = selectedWorkspaceId || 'all';
      const requestId = ++activeRequestIdRef.current;
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await getWorkspaceReports(targetWs, {
          boardId: selectedBoardId,
          timeframe: selectedTimeframe,
          workspaceId: targetWs
        });

        // Ensure we only apply results from the latest request
        if (requestId === activeRequestIdRef.current) {
          setReportsData(data);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (err) {
        if (requestId === activeRequestIdRef.current) {
          console.error('Failed to load workspace reports:', err);
          setError(err.message || 'Unable to load workspace reports');
          if (isManualRefresh) {
            addToast?.({
              title: 'Error loading reports',
              message: err.message || 'Failed to fetch analytics data',
              type: 'danger'
            });
          }
        }
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [canViewReports, selectedWorkspaceId, selectedBoardId, selectedTimeframe, addToast]
  );

  // Trigger fetch when workspace or filters change
  useEffect(() => {
    if (canViewReports) {
      fetchReports();
    }
  }, [fetchReports, canViewReports]);

  // Real-time synchronization: debounced silent refresh on board/card events
  useEffect(() => {
    if (!socket || !canViewReports) return;

    const debouncedRefresh = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        fetchReports(false);
      }, 600);
    };

    socket.on('card:created', debouncedRefresh);
    socket.on('card:updated', debouncedRefresh);
    socket.on('card:moved', debouncedRefresh);
    socket.on('card:deleted', debouncedRefresh);
    socket.on('card:archived', debouncedRefresh);
    socket.on('card:restored', debouncedRefresh);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      socket.off('card:created', debouncedRefresh);
      socket.off('card:updated', debouncedRefresh);
      socket.off('card:moved', debouncedRefresh);
      socket.off('card:deleted', debouncedRefresh);
      socket.off('card:archived', debouncedRefresh);
      socket.off('card:restored', debouncedRefresh);
    };
  }, [socket, canViewReports, fetchReports]);

  // Export full workspace report
  const handleExportCsv = useCallback(() => {
    if (!canExportReports) {
      addToast?.({
        title: 'Permission Denied',
        message: 'You do not have permission to export reports',
        type: 'warning'
      });
      return;
    }

    try {
      exportWorkspaceReportCsv({
        reportsData,
        workspace,
        selectedBoardId,
        selectedTimeframe,
        canViewTeam
      });
      addToast?.({
        title: 'Report Exported',
        message: 'CSV report downloaded successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error('Error exporting CSV:', err);
      addToast?.({
        title: 'Export Failed',
        message: 'Could not export report.',
        type: 'danger'
      });
    }
  }, [canExportReports, reportsData, workspace, selectedBoardId, selectedTimeframe, canViewTeam, addToast]);

  // --- ACCESS & PERMISSION GUARDS ---

  // 1. Loading permissions state
  if (permissionsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-text-secondary">Verifying reporting authorization...</p>
      </div>
    );
  }

  // 2. Strict Access Denied State for Team Member, Viewer, Guest, etc.
  if (!canViewReports) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-app select-none text-center">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-text-primary">Reports Access Restricted</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Operational reports and analytics are designated for management roles (Owner, Admin, Project Manager, and Team Lead).
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/w/${workspace?.id || ''}/home`)}
              className="inline-flex items-center gap-2 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Workspace Home</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error state with retry
  if (error && !reportsData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-app select-none text-center">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-text-primary">Unable to Load Reports</h2>
            <p className="text-xs text-text-muted leading-relaxed">{error}</p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => fetchReports(true)}
              className="inline-flex items-center gap-2 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rawBoards = reportsData?.boards || [];
  const filteredBoards = selectedWorkspaceId === 'all'
    ? rawBoards
    : rawBoards.filter((b) => !b.workspace_id || String(b.workspace_id) === String(selectedWorkspaceId));

  const boardsBreakdown = reportsData?.boards_breakdown || [];
  const stageBreakdown = reportsData?.stage_breakdown || {};
  const membersWorkload = reportsData?.members_workload || [];
  const overdueTasksList = reportsData?.overdue_tasks_list || [];
  const velocity = reportsData?.velocity || [];
  const labelsBreakdown = reportsData?.labels_breakdown || {};
  const summary = reportsData?.summary || {};

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-4 sm:p-6 md:p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full space-y-6 pb-20">

        {/* Section A: Header & Unified Controls */}
        <ReportsHeader
          workspace={workspace}
          workspaces={workspaces}
          workspaceOptions={workspaceOptions}
          selectedWorkspaceId={selectedWorkspaceId}
          onWorkspaceChange={handleWorkspaceChange}
          boards={filteredBoards}
          selectedBoardId={selectedBoardId}
          onBoardChange={(bId) => setSelectedBoardId(bId)}
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={(tf) => setSelectedTimeframe(tf)}
          onRefresh={() => fetchReports(true)}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          canExport={canExportReports}
          onExportCsv={handleExportCsv}
        />

        {loading && !reportsData ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-surface border border-border rounded-xl">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-text-secondary">Generating management report...</p>
          </div>
        ) : (
          <>
            {/* View Mode Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-xl shadow-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => handleTabChange('overview')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'overview'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
                  }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Executive Overview</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('boards')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'boards'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
                  }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Boards & Projects</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-md font-bold ${activeTab === 'boards'
                      ? 'bg-white/15 text-white'
                      : 'bg-surface-elevated text-text-secondary border border-border'
                    }`}
                >
                  {boardsBreakdown.length}
                </span>
              </button>

              {canViewTeam && (
                <button
                  type="button"
                  onClick={() => handleTabChange('team')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'team'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
                    }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Team Workload</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-md font-bold ${activeTab === 'team'
                        ? 'bg-white/15 text-white'
                        : 'bg-surface-elevated text-text-secondary border border-border'
                      }`}
                  >
                    {membersWorkload.length}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleTabChange('risks')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'risks'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
                  }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Risks & Attention</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-md font-bold ${activeTab === 'risks'
                      ? 'bg-white/15 text-white'
                      : overdueTasksList.length > 0
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-surface-elevated text-text-secondary border border-border'
                    }`}
                >
                  {overdueTasksList.length}
                </span>
              </button>
            </div>

            {/* TAB 1: EXECUTIVE OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Section B: Overall Workspace Performance KPIs */}
                <ReportsKpiSummary
                  summary={summary}
                  canViewTeam={canViewTeam}
                />

                {/* Section C: Workflow Stage & Status Distribution + 7-Day Velocity (Balanced Side-by-Side Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <ReportsTaskStatus
                    stageBreakdown={stageBreakdown}
                    totalTasks={summary.total_tasks || 0}
                  />
                  <ReportsTrends velocity={velocity} />
                </div>

                {/* Section D: Project & Board Performance (Compact preview, 5 rows) */}
                <ReportsBoardPerformance
                  boards={boardsBreakdown}
                  getBoardUrl={getBoardUrl}
                  defaultPageSize={5}
                  onViewAll={() => handleTabChange('boards')}
                  title="Project & Board Performance"
                />

                {/* Section E: Team Workload (Compact preview, 5 rows) */}
                {canViewTeam && (
                  <ReportsTeamWorkload
                    members={membersWorkload}
                    onSelectMember={(member) => setSelectedMember(member)}
                    canViewTeam={canViewTeam}
                    defaultPageSize={5}
                    onViewAll={() => handleTabChange('team')}
                    title="Team Workload & Performance"
                  />
                )}

                {/* Section F: Overdue Deliverables & Actionable Items */}
                {overdueTasksList.length > 0 && (
                  <ReportsAttentionList
                    overdueTasks={overdueTasksList}
                    canViewTeam={canViewTeam}
                    getBoardUrl={getBoardUrl}
                    defaultPageSize={5}
                    onViewAll={() => handleTabChange('risks')}
                    title="Tasks Requiring Immediate Attention"
                  />
                )}

                {/* Section H: Label Breakdown & Tag Density */}
                <ReportsLabels labelsBreakdown={labelsBreakdown} />
              </div>
            )}

            {/* TAB 2: DEDICATED BOARDS & PROJECTS */}
            {activeTab === 'boards' && (
              <div className="space-y-6">
                <ReportsBoardPerformance
                  boards={boardsBreakdown}
                  getBoardUrl={getBoardUrl}
                  defaultPageSize={12}
                  title="All Projects & Boards"
                />
              </div>
            )}

            {/* TAB 3: DEDICATED TEAM WORKLOAD */}
            {activeTab === 'team' && canViewTeam && (
              <div className="space-y-6">
                <ReportsTeamWorkload
                  members={membersWorkload}
                  onSelectMember={(member) => setSelectedMember(member)}
                  canViewTeam={canViewTeam}
                  defaultPageSize={12}
                  title="All Team Members Workload & Capacity"
                />
              </div>
            )}

            {/* TAB 4: DEDICATED RISKS & OVERDUE */}
            {activeTab === 'risks' && (
              <div className="space-y-6">
                <ReportsAttentionList
                  overdueTasks={overdueTasksList}
                  canViewTeam={canViewTeam}
                  getBoardUrl={getBoardUrl}
                  defaultPageSize={10}
                  title="All Tasks Requiring Attention & Overdue Deliverables"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Member Dossier Slide-Over Drawer */}
      {selectedMember && (
        <ReportMemberDetailsDrawer
          member={selectedMember}
          workspace={workspace}
          onClose={() => setSelectedMember(null)}
          canExport={canExportReports}
          getBoardUrl={getBoardUrl}
        />
      )}
    </div>
  );
}

