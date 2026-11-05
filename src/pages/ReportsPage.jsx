// client/src/pages/ReportsPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
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

export default function ReportsPage({ workspace }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Canonical RBAC permissions
  const canViewReports = Boolean(hasPermission('report.view_project'));
  const canViewTeam = Boolean(hasPermission('report.view_team'));
  const canExportReports = Boolean(hasPermission('report.export'));

  // Board and card navigation helper
  const getBoardUrl = useCallback((boardId, cardId = null) => {
    const wsId = workspace?.id;
    const base = wsId ? `/w/${wsId}/p/${boardId}/board` : `/b/${boardId}`;
    return cardId ? `${base}?card=${cardId}` : base;
  }, [workspace?.id]);

  // Real-time socket integration
  let socketContext = null;
  try {
    socketContext = useSocket();
  } catch {
    // Fallback when outside provider
  }
  const socket = socketContext?.socket;

  // Page state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsData, setReportsData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Unified persistent filters
  const [selectedBoardId, setSelectedBoardId] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');

  // Selected member for detail drawer
  const [selectedMember, setSelectedMember] = useState(null);

  // Active in-flight request tracker to prevent race conditions
  const activeRequestIdRef = useRef(0);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Reports & Analytics | TaskFlow`;
  }, [workspace?.name]);

  // Fetch report data over encrypted POST /api/secure with hybrid transport
  const fetchReports = useCallback(
    async (isManualRefresh = false) => {
      if (!workspace?.id || !canViewReports) return;

      const requestId = ++activeRequestIdRef.current;
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
    [workspace?.id, canViewReports, selectedBoardId, selectedTimeframe, addToast]
  );

  // Trigger fetch when workspace or filters change
  useEffect(() => {
    if (canViewReports && workspace?.id) {
      fetchReports();
    }
  }, [fetchReports, canViewReports, workspace?.id]);

  // Real-time synchronization: debounced silent refresh on board/card events
  useEffect(() => {
    if (!socket || !workspace?.id || !canViewReports) return;

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
  }, [socket, workspace?.id, canViewReports, fetchReports]);

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
        message: 'Workspace CSV report downloaded successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error('Error exporting CSV:', err);
      addToast?.({
        title: 'Export Failed',
        message: 'Could not export workspace report.',
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
              Operational reports and workspace analytics are designated for management roles (Owner, Admin, Project Manager, and Team Lead).
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

  const boards = reportsData?.boards || [];
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
          boards={boards}
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
            {/* Section B: Overall Workspace Performance KPIs */}
            <ReportsKpiSummary
              summary={summary}
              canViewTeam={canViewTeam}
            />

            {/* Section C: Workflow Stage & Status Distribution */}
            <ReportsTaskStatus
              stageBreakdown={stageBreakdown}
              totalTasks={summary.total_tasks || 0}
            />

            {/* Section D: Project & Board Performance */}
            <ReportsBoardPerformance
              boards={boardsBreakdown}
              getBoardUrl={getBoardUrl}
            />

            {/* Section E: Team Workload & Individual Performance (Strictly gated by report.view_team) */}
            {canViewTeam && (
              <ReportsTeamWorkload
                members={membersWorkload}
                onSelectMember={(member) => setSelectedMember(member)}
                canViewTeam={canViewTeam}
              />
            )}

            {/* Section F: Overdue Deliverables & Actionable Items */}
            <ReportsAttentionList
              overdueTasks={overdueTasksList}
              canViewTeam={canViewTeam}
              getBoardUrl={getBoardUrl}
            />

            {/* Section G: 7-Day Velocity & Productivity Trends */}
            <ReportsTrends velocity={velocity} />

            {/* Section H: Label Breakdown & Tag Density */}
            <ReportsLabels labelsBreakdown={labelsBreakdown} />
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
