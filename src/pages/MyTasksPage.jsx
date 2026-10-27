// client/src/pages/MyTasksPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Search,
  Users,
  Flame,
  LayoutList,
  Kanban,
  Check,
  X,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Briefcase,
  TrendingUp,
  Zap,
  Target,
  Layers
} from 'lucide-react';
import { getWorkspaceMyTasks } from '../api/workspaces';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionContext';
import { useSocket } from '../context/SocketProvider';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';
import Select from '../components/ui/Select';
import LabelPill from '../components/shared/LabelPill';
import { getListStatusConfig, getCardDefaultStatus } from '../lib/listStatusColors';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

function formatCardDueDate(dueDateStr, isComplete) {
  if (!dueDateStr) return null;
  try {
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return null;
    const now = new Date();
    const isOverdue = due < now && !isComplete;
    const isDueSoon = due - now < 24 * 60 * 60 * 1000 && due >= now && !isComplete;
    if (isToday(due)) return { text: 'Due Today', isOverdue, isDueSoon, isComplete, title: `Due Today: ${format(due, 'PPp')}` };
    if (isTomorrow(due)) return { text: 'Due Tomorrow', isOverdue: false, isDueSoon: true, isComplete, title: `Due Tomorrow: ${format(due, 'PPp')}` };
    return {
      text: format(due, 'MMM d'),
      isOverdue,
      isDueSoon,
      isComplete,
      title: `Due: ${format(due, 'PPp')}`
    };
  } catch {
    return null;
  }
}

export default function MyTasksPage({
  workspace,
  workspaces = [],
  onCardClick
}) {
  const { user: authUser } = useAuth();
  const { userRole } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Socket for real-time reactivity
  let socket = null;
  try {
    const sockCtx = useSocket();
    socket = sockCtx?.socket;
  } catch {}

  // Data States
  const [tasksData, setTasksData] = useState({
    user: null,
    canSwitchMember: false,
    teamMembers: [],
    boards: [],
    summary: {
      total_assigned: 0,
      active_count: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
      overdue: 0,
      due_soon: 0,
      assigned_by_me: 0,
      completion_rate: 0
    }
  });

  // Owner check for member switcher
  const roleStr = (userRole?.name || workspace?.role || '').toLowerCase();
  const isOwner =
    roleStr === 'owner' ||
    roleStr === 'super admin' ||
    (userRole?.is_system === 1 && (userRole?.rank >= 100 || userRole?.is_editable === 0)) ||
    Boolean(tasksData?.canSwitchMember);

  // Active user filter (locked to logged-in user unless requester is verified owner)
  const urlUserId = searchParams.get('userId');
  const [selectedUserId, setSelectedUserId] = useState(urlUserId || '');

  // Tab State: 'assigned' | 'delegated' | 'completed'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'assigned');

  // Filter States - Default Workspace is 'all' (selected all workspace)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(searchParams.get('workspaceId') || 'all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all'); // 'all' | 'in_progress' | 'todo' | 'review' | 'done' | 'overdue'
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'list'
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Data Loading & Status States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState([]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load Tasks from Server with Server-Side Pagination & Filtering
  const loadMyTasks = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        limit: 20,
        tab: activeTab,
        workspaceId: selectedWorkspaceId,
        boardId: selectedBoardId,
        stage: selectedStage,
        search: debouncedSearch.trim()
      };
      if (selectedUserId && isOwner) {
        params.userId = selectedUserId;
      }

      const requestWsId = (selectedWorkspaceId && selectedWorkspaceId !== 'all')
        ? selectedWorkspaceId
        : (workspace?.id || 'all');
      const data = await getWorkspaceMyTasks(requestWsId, params);
      setTasksData(data || {});
      setCards(data?.cards || []);
      setPagination(data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load my-tasks:', err);
      setError(err?.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedWorkspaceId, currentPage, activeTab, selectedBoardId, selectedStage, debouncedSearch, selectedUserId, isOwner, workspace?.id]);

  useEffect(() => {
    loadMyTasks();
  }, [loadMyTasks]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;
    let timer = null;
    const debouncedReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => loadMyTasks(true), 600);
    };

    socket.on('card:created', debouncedReload);
    socket.on('card:updated', debouncedReload);
    socket.on('card:deleted', debouncedReload);
    socket.on('card:moved', debouncedReload);
    socket.on('user:workspace_tasks_updated', debouncedReload);

    return () => {
      if (timer) clearTimeout(timer);
      socket.off('card:created', debouncedReload);
      socket.off('card:updated', debouncedReload);
      socket.off('card:deleted', debouncedReload);
      socket.off('card:moved', debouncedReload);
      socket.off('user:workspace_tasks_updated', debouncedReload);
    };
  }, [socket, loadMyTasks]);

  // Switch Target User (strictly Owner only)
  const handleSelectUser = (userId) => {
    setSelectedUserId(userId ? String(userId) : '');
    setCurrentPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (userId) next.set('userId', String(userId));
      else next.delete('userId');
      return next;
    }, { replace: true });
  };

  // Switch Workspace Filter
  const handleWorkspaceChange = (newWsId) => {
    setSelectedWorkspaceId(newWsId);
    setSelectedBoardId('all');
    setCurrentPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newWsId && newWsId !== 'all') next.set('workspaceId', newWsId);
      else next.delete('workspaceId');
      return next;
    }, { replace: true });
  };

  // Switch Tab
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSelectedStage('all');
    setCurrentPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    }, { replace: true });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedWorkspaceId('all');
    setSelectedBoardId('all');
    setSelectedStage('all');
    setCurrentPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('workspaceId');
      return next;
    }, { replace: true });
  };

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
    selectedWorkspaceId !== 'all' ||
    selectedBoardId !== 'all' ||
    selectedStage !== 'all'
  );

  // Card click: navigate directly to that board and open card modal
  const handleCardClick = (card) => {
    const targetWsId = card.workspace_id || (workspace?.id ? String(workspace.id) : null);
    if (onCardClick) {
      onCardClick({ id: card.id, board_id: card.board_id, workspace_id: targetWsId });
    } else if (targetWsId) {
      navigate(`/w/${targetWsId}/p/${card.board_id}/board?card=${card.id}`);
    }
  };

  // Workspace dropdown options
  const workspaceOptions = useMemo(() => {
    const list = [{ value: 'all', label: 'All Workspaces' }];
    const wsMap = new Map();
    (workspaces || []).forEach((w) => {
      if (w?.id) wsMap.set(String(w.id), w.name || `Workspace #${w.id}`);
    });
    (tasksData?.workspaces || []).forEach((w) => {
      if (w?.id) wsMap.set(String(w.id), w.name || `Workspace #${w.id}`);
    });
    if (workspace?.id && !wsMap.has(String(workspace.id))) {
      wsMap.set(String(workspace.id), workspace.name || `Workspace #${workspace.id}`);
    }
    wsMap.forEach((name, id) => {
      list.push({ value: id, label: name });
    });
    return list;
  }, [workspaces, tasksData?.workspaces, workspace]);

  // Dropdown options
  const boardOptions = useMemo(() => {
    const list = [{ value: 'all', label: 'All Projects & Boards' }];
    (tasksData.boards || []).forEach((b) => {
      if (selectedWorkspaceId === 'all' || !b.workspace_id || String(b.workspace_id) === String(selectedWorkspaceId)) {
        list.push({
          value: String(b.id),
          label: selectedWorkspaceId === 'all' && b.workspace_name
            ? `${b.workspace_name} • ${b.name}`
            : b.name
        });
      }
    });
    return list;
  }, [tasksData.boards, selectedWorkspaceId]);

  const stageOptions = [
    { value: 'all', label: 'All Stages' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'todo', label: 'To Do' },
    { value: 'review', label: 'In Review' },
    { value: 'overdue', label: 'Overdue Only' }
  ];

  const memberOptions = useMemo(() => {
    const list = [
      { value: '', label: `Myself (${authUser?.name || 'You'})` }
    ];
    (tasksData.teamMembers || []).forEach((m) => {
      if (Number(m.id) !== Number(authUser?.id)) {
        list.push({
          value: String(m.id),
          label: `${m.name} (${m.role_name || 'Member'})${m.active_tasks_count > 0 ? ` · ${m.active_tasks_count} active` : ''}`
        });
      }
    });
    return list;
  }, [tasksData.teamMembers, authUser]);

  // Grouped Cards by Stage for 3-list Board view (To Do, In Progress, In Review)
  const groupedCards = useMemo(() => {
    const groups = {
      todo: [],
      in_progress: [],
      review: []
    };

    cards.forEach((c) => {
      const stage = (c.stage || '').toLowerCase().trim();
      const listName = (c.list_name || '').toLowerCase().trim();

      // Skip completed tasks as they belong strictly in the dedicated Completed Work tab
      if (c.is_complete || stage === 'done' || listName.includes('done') || listName.includes('completed')) {
        return;
      }

      if (stage === 'review' || listName.includes('review') || listName.includes('qa')) {
        groups.review.push(c);
      } else if (stage === 'in_progress' || listName.includes('progress') || listName.includes('doing') || listName.includes('wip')) {
        groups.in_progress.push(c);
      } else {
        groups.todo.push(c);
      }
    });

    return groups;
  }, [cards]);

  const targetUser = tasksData.user || authUser;
  const isViewingSelf = !selectedUserId || Number(selectedUserId) === Number(authUser?.id);
  const canShowMemberSwitcher = Boolean(isOwner && tasksData.canSwitchMember);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app select-none">
      {/* ======================================================== */}
      {/* 1. STATS OVERVIEW CARDS                                   */}
      {/* ======================================================== */}
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 border-b border-border/40 bg-surface/50 shrink-0">
        <div className="max-w-[1680px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Total Assigned */}
          <div
            onClick={() => { handleTabChange('assigned'); setSelectedStage('all'); }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              activeTab === 'assigned' && selectedStage === 'all'
                ? 'bg-primary/5 border-primary ring-1 ring-primary/20'
                : 'bg-surface border-border/70 hover:border-primary/40'
            }`}
          >
            <div className="flex items-center justify-between text-text-muted mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Assigned</span>
              <CheckSquare className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-text-primary">
                {tasksData.summary?.total_assigned || 0}
              </span>
              <span className="text-[11px] font-semibold text-text-muted">
                {tasksData.summary?.completion_rate || 0}% done
              </span>
            </div>
          </div>

          {/* 2. In Progress */}
          <div
            onClick={() => { handleTabChange('assigned'); setSelectedStage('in_progress'); }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              activeTab === 'assigned' && selectedStage === 'in_progress'
                ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/20'
                : 'bg-surface border-border/70 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-text-muted mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                {tasksData.summary?.in_progress || 0}
              </span>
              <span className="text-[11px] font-semibold text-text-muted">active now</span>
            </div>
          </div>

          {/* 3. To Do */}
          <div
            onClick={() => { handleTabChange('assigned'); setSelectedStage('todo'); }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              activeTab === 'assigned' && selectedStage === 'todo'
                ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500/20'
                : 'bg-surface border-border/70 hover:border-indigo-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-text-muted mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">To Do</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {tasksData.summary?.todo || 0}
              </span>
              <span className="text-[11px] font-semibold text-text-muted">backlog</span>
            </div>
          </div>

          {/* 4. Overdue */}
          <div
            onClick={() => { handleTabChange('assigned'); setSelectedStage('overdue'); }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              selectedStage === 'overdue'
                ? 'bg-danger/10 border-danger ring-1 ring-danger/20'
                : 'bg-surface border-border/70 hover:border-danger/40'
            }`}
          >
            <div className="flex items-center justify-between text-text-muted mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Overdue</span>
              <AlertCircle className={`w-4 h-4 ${(tasksData.summary?.overdue || 0) > 0 ? 'text-danger' : 'text-text-muted'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-black ${(tasksData.summary?.overdue || 0) > 0 ? 'text-danger' : 'text-text-primary'}`}>
                {tasksData.summary?.overdue || 0}
              </span>
              <span className="text-[11px] font-semibold text-text-muted">past due</span>
            </div>
          </div>

          {/* 5. Completed */}
          <div
            onClick={() => handleTabChange('completed')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              activeTab === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/20'
                : 'bg-surface border-border/70 hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-text-muted mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {tasksData.summary?.completed || 0}
              </span>
              <span className="text-[11px] font-semibold text-text-muted">milestones</span>
            </div>
          </div>

          {/* 6. Assigned by Me */}
          <div
            onClick={() => handleTabChange('delegated')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              activeTab === 'delegated'
                ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/20'
                : 'bg-surface border-border/70 hover:border-purple-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-text-muted mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Assigned by Me</span>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                {tasksData.summary?.assigned_by_me || 0}
              </span>
              <span className="text-[11px] font-semibold text-text-muted">delegated</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TABS, SEARCH & FILTER TOOLBAR                         */}
      {/* ======================================================== */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 bg-surface border-b border-border/60 shrink-0 shadow-2xs space-y-2.5">
        <div className="max-w-[1680px] mx-auto space-y-2.5">
          {/* Top Row: Navigation Tabs (Left) + Member Switcher & View Switcher (Right) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Main Tabs */}
            <div className="flex items-center gap-1 p-1 bg-surface-muted/90 rounded-xl border border-border/60 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleTabChange('assigned')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'assigned'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Assigned to Me</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'assigned'
                      ? 'bg-primary-tint text-primary-text'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  {tasksData.summary?.active_count ?? tasksData.summary?.total_assigned ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('delegated')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'delegated'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Assigned by Me</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'delegated'
                      ? 'bg-primary-tint text-primary-text'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  {tasksData.summary?.assigned_by_me || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('completed')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'completed'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Completed Work</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'completed'
                      ? 'bg-success-tint text-success-text'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  {tasksData.summary?.completed || 0}
                </span>
              </button>
            </div>

            {/* Right: Team Member Switcher (strictly Owner only) & View Switcher */}
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
              {canShowMemberSwitcher && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-text-muted hidden lg:inline">Viewing:</span>
                  <div className="w-48 sm:w-56">
                    <Select
                      options={memberOptions}
                      value={selectedUserId}
                      onChange={handleSelectUser}
                      size="sm"
                      aria-label="Switch team member"
                      placeholder="Switch Team Member"
                    />
                  </div>
                </div>
              )}

              {canShowMemberSwitcher && <div className="h-5 w-px bg-border/60 hidden sm:block" />}

              {/* View Mode Toggle: Grouped vs List */}
              <div className="flex items-center p-0.5 bg-surface-muted rounded-xl border border-border/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  title="Grouped by workflow stage"
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    viewMode === 'grouped'
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Board</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Compact flat list view"
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">List</span>
                </button>
              </div>

              {/* Work Metrics & Velocity Panel Toggle Button */}
              <button
                type="button"
                onClick={() => setIsRightPanelOpen((prev) => !prev)}
                title={isRightPanelOpen ? 'Hide Work Metrics & Velocity panel' : 'Show Work Metrics & Velocity panel'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  isRightPanelOpen
                    ? 'bg-primary-tint border-primary/30 text-primary shadow-2xs font-bold'
                    : 'bg-surface border-border/70 text-text-muted hover:text-text-primary hover:bg-surface-muted'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Metrics</span>
              </button>
            </div>
          </div>

          {/* Sub Row: Search & Filters (Clean, Aligned Row) */}
          <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {/* Search Input */}
              <div className="relative w-full sm:w-64 max-w-xs">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-8 pr-7 py-1.5 bg-surface-muted/80 border border-border/70 rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Workspace Filter */}
              <div className="w-44 sm:w-48">
                <Select
                  options={workspaceOptions}
                  value={selectedWorkspaceId}
                  onChange={handleWorkspaceChange}
                  size="sm"
                  aria-label="Filter by workspace"
                  placeholder="All Workspaces"
                />
              </div>

              {/* Board / Project Filter */}
              <div className="w-48 sm:w-52">
                <Select
                  options={boardOptions}
                  value={selectedBoardId}
                  onChange={(val) => {
                    setSelectedBoardId(val);
                    setCurrentPage(1);
                  }}
                  size="sm"
                  aria-label="Filter by project or board"
                  placeholder="All Projects & Boards"
                />
              </div>

              {/* Stage Filter (visible on Assigned tab) */}
              {activeTab === 'assigned' && (
                <div className="w-36 sm:w-40">
                  <Select
                    options={stageOptions}
                    value={selectedStage}
                    onChange={(val) => {
                      setSelectedStage(val);
                      setCurrentPage(1);
                    }}
                    size="sm"
                    aria-label="Filter by stage"
                  />
                </div>
              )}

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-danger/30 bg-danger/5 hover:bg-danger/10 text-xs font-semibold text-danger transition-colors cursor-pointer"
                  title="Reset active filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Right: Showing Tasks Count Indicator */}
            <div className="text-xs text-text-muted font-medium whitespace-nowrap ml-auto">
              Showing <span className="font-bold text-text-primary">{pagination.total || cards.length}</span> {pagination.total === 1 ? 'task' : 'tasks'}
            </div>
          </div>
        </div>

        {/* Owner-Inspection Banner if viewing someone else */}
        {!isViewingSelf && targetUser && (
          <div className="max-w-[1680px] mx-auto mt-2.5 flex items-center justify-between px-3.5 py-2 bg-primary/10 border border-primary/20 rounded-xl text-xs font-medium text-primary">
            <div className="flex items-center gap-2">
              <Avatar src={targetUser.avatar_url} name={targetUser.name} size="xs" />
              <span>Viewing work dashboard for <strong>{targetUser.name}</strong> ({targetUser.role_name || 'Member'})</span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectUser('')}
              className="text-xs font-bold underline hover:text-primary-hover cursor-pointer"
            >
              Return to My Tasks
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. MAIN TASK CONTENT AREA                                 */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1680px] mx-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 text-text-muted">
              <Spinner className="w-8 h-8 text-primary mb-3" />
              <p className="text-xs font-semibold">Loading assignments & tasks...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-danger-tint border border-danger/30 text-danger text-xs text-center">
              {error}
            </div>
          ) : (
            <div className="flex items-start gap-6 relative">
              {/* Left Main Task Content Area (Columns, List, Completed Grid, etc.) */}
              <div className="flex-1 min-w-0 space-y-6">
                {cards.length === 0 ? (
                  /* Empty State */
                  <div className="text-center py-24 bg-surface border border-border/70 rounded-3xl p-8 max-w-lg mx-auto shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-primary-tint text-primary flex items-center justify-center mx-auto mb-4">
                      <CheckSquare className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-text-primary mb-1">No Tasks Found</h3>
                    <p className="text-xs text-text-secondary max-w-sm mx-auto mb-6">
                      {hasActiveFilters
                        ? 'No tasks match your active filter criteria. Try clearing search or filters.'
                        : activeTab === 'delegated'
                        ? 'You have not delegated or assigned any cards in this workspace yet.'
                        : activeTab === 'completed'
                        ? 'No completed tasks recorded yet. Finished cards will show up here.'
                        : 'You have zero active tasks assigned right now. You are all caught up!'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : viewMode === 'grouped' && (activeTab === 'assigned' || activeTab === 'delegated') && selectedStage === 'all' ? (
                  /* 3-List Board Page Design (To Do -> In Progress -> In Review) with fixed board column widths */
                  <div className="flex items-start gap-5 overflow-x-auto pb-6 max-w-full">
                    <TaskBoardColumn
                      title="To Do"
                      icon={Clock}
                      count={groupedCards.todo.length}
                      statusKey="todo"
                      headerClass="list-status-todo"
                      cards={groupedCards.todo}
                      onCardClick={handleCardClick}
                      workspaceId={workspace?.id}
                    />
                    <TaskBoardColumn
                      title="In Progress"
                      icon={Flame}
                      count={groupedCards.in_progress.length}
                      statusKey="in_progress"
                      headerClass="list-status-in-progress"
                      cards={groupedCards.in_progress}
                      onCardClick={handleCardClick}
                      workspaceId={workspace?.id}
                    />
                    <TaskBoardColumn
                      title="In Review"
                      icon={CheckSquare}
                      count={groupedCards.review.length}
                      statusKey="review"
                      headerClass="list-status-review"
                      cards={groupedCards.review}
                      onCardClick={handleCardClick}
                      workspaceId={workspace?.id}
                    />
                  </div>
                ) : activeTab === 'completed' && viewMode === 'grouped' ? (
                  /* 3rd Tab: Completed Work - Small board card design with card width matching Board columns */
                  <div className="flex flex-wrap items-start gap-5 pb-6 max-w-full">
                    {cards.map((card) => (
                      <div key={card.id} className="w-[300px] sm:w-[320px] lg:w-[340px] shrink-0">
                        <BoardCardItem
                          card={card}
                          onCardClick={handleCardClick}
                          workspaceId={workspace?.id}
                        />
                      </div>
                    ))}
                  </div>
                ) : viewMode === 'list' ? (
                  /* Flat List View */
                  <div className="space-y-2">
                    {cards.map((card) => (
                      <BoardCardItem
                        key={card.id}
                        card={card}
                        onCardClick={handleCardClick}
                        workspaceId={workspace?.id}
                        isListView={true}
                      />
                    ))}
                  </div>
                ) : (
                  /* Filtered Stage Board View - Cards matching Board column width */
                  <div className="flex flex-wrap items-start gap-5 pb-6 max-w-full">
                    {cards.map((card) => (
                      <div key={card.id} className="w-[300px] sm:w-[320px] lg:w-[340px] shrink-0">
                        <BoardCardItem
                          card={card}
                          onCardClick={handleCardClick}
                          workspaceId={workspace?.id}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Server-Side Pagination Footer */}
                {pagination.total > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border/60">
                    <span className="text-xs text-text-secondary">
                      Showing <span className="font-bold text-text-primary">{(pagination.page - 1) * pagination.limit + 1}</span>–<span className="font-bold text-text-primary">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-bold text-text-primary">{pagination.total}</span> tasks
                    </span>

                    {pagination.totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={pagination.page <= 1 || loading}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          Previous
                        </button>

                        <span className="px-3 py-1.5 text-xs font-semibold text-text-primary">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>

                        <button
                          type="button"
                          disabled={pagination.page >= pagination.totalPages || loading}
                          onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                          className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side Widget Panel: My Work Metrics & Velocity Dashboard (Visible across all tabs & stages, scrolls naturally) */}
              {isRightPanelOpen && (
                <WorkMetricsDashboardCard
                  summary={tasksData.summary || {}}
                  cards={cards}
                  onCardClick={handleCardClick}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: WorkMetricsDashboardCard - Personal Workload & Velocity Analytics
// ─────────────────────────────────────────────────────────────────────────────
function WorkMetricsDashboardCard({ summary = {}, cards = [], onCardClick }) {
  const completionRate = summary.completion_rate ?? (
    summary.total_assigned > 0
      ? Math.round(((summary.completed || 0) / summary.total_assigned) * 100)
      : 0
  );

  // Workload grouped by Project / Board
  const projectBreakdown = useMemo(() => {
    const map = {};
    cards.forEach((c) => {
      const bName = c.board_name || 'General Project';
      if (!map[bName]) {
        map[bName] = {
          name: bName,
          workspaceName: c.workspace_name,
          color: c.board_bg || '#6366f1',
          total: 0,
          completed: 0,
          inProgress: 0
        };
      }
      map[bName].total++;
      if (c.is_complete) map[bName].completed++;
      if (c.stage === 'in_progress') map[bName].inProgress++;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [cards]);

  // Upcoming Milestones / Urgent Tasks
  const upcomingMilestones = useMemo(() => {
    return cards
      .filter((c) => !c.is_complete && (c.is_overdue || c.due_date))
      .sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return new Date(a.due_date || 0) - new Date(b.due_date || 0);
      })
      .slice(0, 3);
  }, [cards]);

  // SVG circular progress calculation (r = 34, stroke = 7, circ = 2 * PI * 34 = 213.63)
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, completionRate)) / 100) * circumference;

  return (
    <div className="w-80 lg:w-88 xl:w-96 shrink-0 hidden md:block sticky top-4 self-start">
      <div className="bg-surface border border-border/80 rounded-3xl p-5 shadow-xs space-y-5 select-none max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
        {/* Header: Title, Icon & Live Badge */}
        <div className="flex items-center justify-between pb-1 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-text-primary leading-tight">
                Work Metrics & Velocity
              </h3>
              <p className="text-[11px] text-text-muted font-medium">Personal Workload Analytics</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-tint text-success-text border border-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Active
          </span>
        </div>

        {/* 1. Completion Rate Circular Ring & Key Counters */}
        <div className="bg-surface-muted/50 border border-border/60 rounded-2xl p-4 flex items-center gap-4">
          {/* Radial Ring */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 88 88">
              <circle
                cx="44"
                cy="44"
                r={radius}
                stroke="currentColor"
                strokeWidth="7"
                fill="transparent"
                className="text-border/40"
              />
              <circle
                cx="44"
                cy="44"
                r={radius}
                stroke="currentColor"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-primary transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-black text-text-primary leading-none">
                {completionRate}%
              </span>
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-0.5">
                Done
              </span>
            </div>
          </div>

          {/* Micro Summary Counters Grid */}
          <div className="flex-1 grid grid-cols-2 gap-2 text-left">
            <div className="p-2 rounded-xl bg-surface border border-border/50">
              <span className="text-[10px] font-bold uppercase text-text-muted block">Total</span>
              <span className="text-sm font-black text-text-primary">{summary.total_assigned || cards.length}</span>
            </div>
            <div className="p-2 rounded-xl bg-surface border border-border/50">
              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">Done</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{summary.completed || 0}</span>
            </div>
            <div className="p-2 rounded-xl bg-surface border border-border/50">
              <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block">Active</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">{summary.active_count || cards.length}</span>
            </div>
            <div className="p-2 rounded-xl bg-surface border border-border/50">
              <span className={`text-[10px] font-bold uppercase block ${(summary.overdue || 0) > 0 ? 'text-danger' : 'text-text-muted'}`}>
                Overdue
              </span>
              <span className={`text-sm font-black ${(summary.overdue || 0) > 0 ? 'text-danger' : 'text-text-muted'}`}>
                {summary.overdue || 0}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Workload Breakdown by Project */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Project Workload</span>
            </div>
            <span className="text-[11px] font-medium text-text-muted">
              {projectBreakdown.length} {projectBreakdown.length === 1 ? 'project' : 'projects'}
            </span>
          </div>

          <div className="space-y-2.5">
            {projectBreakdown.length > 0 ? (
              projectBreakdown.map((proj) => {
                const pct = proj.total > 0 ? Math.round((proj.completed / proj.total) * 100) : 0;
                return (
                  <div key={proj.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text-secondary truncate max-w-[190px]" title={proj.name}>
                        {proj.name}
                      </span>
                      <span className="text-[11px] font-bold text-text-muted shrink-0">
                        {proj.total} {proj.total === 1 ? 'task' : 'tasks'} ({pct}%)
                      </span>
                    </div>
                    {/* Multi-segment progress track */}
                    <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        title={`${proj.completed} completed`}
                      />
                      <div
                        style={{ width: `${proj.total > 0 ? Math.round((proj.inProgress / proj.total) * 100) : 0}%` }}
                        className="h-full bg-amber-500 transition-all duration-500"
                        title={`${proj.inProgress} in progress`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-text-muted italic py-1">No active projects found.</p>
            )}
          </div>
        </div>

        {/* 3. Upcoming Milestones & Deadlines */}
        <div className="space-y-3 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span>Upcoming Milestones</span>
            </div>
            {(summary.due_soon > 0 || summary.overdue > 0) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning-text border border-warning/20">
                {(summary.due_soon || 0) + (summary.overdue || 0)} priority
              </span>
            )}
          </div>

          <div className="space-y-2">
            {upcomingMilestones.length > 0 ? (
              upcomingMilestones.map((card) => {
                const dueDateInfo = formatCardDueDate(card.due_date, card.is_complete);
                return (
                  <div
                    key={card.id}
                    onClick={() => onCardClick?.(card)}
                    className="p-2.5 rounded-xl border border-border/70 hover:border-primary/40 bg-surface hover:bg-surface-muted transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        #{card.task_number || card.id}
                      </span>
                      {dueDateInfo && (
                        <span
                          className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                            dueDateInfo.isOverdue
                              ? 'bg-danger-tint text-danger-text'
                              : dueDateInfo.isDueSoon
                              ? 'bg-warning-tint text-warning-text'
                              : 'bg-surface-muted text-text-secondary'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {dueDateInfo.text}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                      {card.title}
                    </h4>
                    {card.board_name && (
                      <span className="text-[10.5px] text-text-muted mt-0.5 truncate block">
                        • {card.board_name}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  All milestones on schedule! 🎉
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Velocity Status Banner */}
        <div className="pt-2 border-t border-border/50">
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/15 flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <p className="text-[11px] font-medium text-text-secondary leading-snug">
              {completionRate >= 80
                ? 'High velocity! You have closed out the majority of assigned tasks.'
                : (summary.overdue || 0) > 0
                ? `Attention: You have ${summary.overdue} overdue task(s) requiring follow-up.`
                : 'Steady momentum! Keep progressing active tasks toward review.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: TaskBoardColumn - Matches Board List.jsx design
// ─────────────────────────────────────────────────────────────────────────────
function TaskBoardColumn({ title, count, headerClass, icon: Icon, cards, onCardClick, workspaceId }) {
  return (
    <div className="w-[300px] sm:w-[320px] lg:w-[340px] shrink-0 flex flex-col min-w-0">
      {/* Column Header matching Board page List.jsx */}
      <div
        className={`bg-surface border border-border-strong/70 rounded-2xl px-4 py-3 flex items-center justify-between select-none shadow-xs mb-3 transition-all ${headerClass}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {Icon && <Icon className="w-4 h-4 shrink-0 text-text-primary" />}
          <h3 className="text-base sm:text-[17px] font-extrabold text-text-primary truncate">
            {title}
          </h3>
          <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full border shadow-2xs bg-surface-muted text-text-secondary border-border-strong/50">
            {count}
          </span>
        </div>
      </div>

      {/* Cards List Stack */}
      <div className="space-y-3">
        {cards.length > 0 ? (
          cards.map((card) => (
            <BoardCardItem
              key={card.id}
              card={card}
              onCardClick={onCardClick}
              workspaceId={workspaceId}
            />
          ))
        ) : (
          <div className="py-10 px-4 rounded-2xl border border-dashed border-border/70 bg-surface/30 text-center flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-text-muted">No tasks in {title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: BoardCardItem - Matches Board Card.jsx design exactly
// ─────────────────────────────────────────────────────────────────────────────
function BoardCardItem({ card, onCardClick, workspaceId, isListView = false }) {
  const status = getCardDefaultStatus(card, card.list_name);
  const statusConfig = getListStatusConfig(status);
  const dueDateInfo = formatCardDueDate(card.due_date, card.is_complete);
  const checklist = card.checklist || { total: 0, completed: 0 };
  const hasChecklist = checklist.total > 0;

  // Extract clean plain text snippet from description HTML
  const descriptionSnippet = card.description && card.description !== '<p></p>'
    ? card.description.replace(/<[^>]*>/g, '').trim()
    : '';

  // Compact List View Row
  if (isListView) {
    return (
      <div
        tabIndex={0}
        role="button"
        onClick={() => onCardClick?.(card)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCardClick?.(card);
          }
        }}
        className="group bg-surface border border-border/80 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {card.is_complete ? (
            <span className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          ) : (
            <span className="text-[11px] font-bold text-text-muted shrink-0 min-w-10">
              #{card.task_number || card.id}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h4 className={`text-xs sm:text-sm font-bold truncate ${card.is_complete ? 'line-through text-text-muted' : 'text-text-primary group-hover:text-primary transition-colors'}`}>
              {card.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted flex-wrap">
              {card.workspace_name && <span>{card.workspace_name}</span>}
              {card.board_name && <span>• {card.board_name}</span>}
              {card.list_name && <span className="text-text-secondary">• {card.list_name}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {dueDateInfo && (
            <span className={`text-[11px] font-semibold ${dueDateInfo.isOverdue ? 'text-danger' : 'text-text-muted'}`}>
              {dueDateInfo.text}
            </span>
          )}
          {card.members && card.members.length > 0 && (
            <Avatar name={card.members[0].name} src={card.members[0].avatar_url} size="xs" />
          )}
        </div>
      </div>
    );
  }

  // Small Board Card Design matching Board Card.jsx
  return (
    <div
      tabIndex={0}
      role="button"
      onClick={() => onCardClick?.(card)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick?.(card);
        }
      }}
      className={`w-full group relative bg-surface border border-border/80 rounded-2xl p-3.5 transition-all duration-200 cursor-pointer select-none space-y-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
        statusConfig
          ? `${statusConfig.cardClass} hover:border-t-primary/40 hover:border-x-primary/40`
          : 'border-border/80 hover:border-primary/40'
      }`}
    >
      {/* Top Header: Task Number, Workspace / Board Badges & Labels */}
      <div className="flex items-center justify-between gap-1.5 min-h-[22px]">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-[10.5px] font-bold text-text-muted uppercase tracking-wider">
            Task #{card.task_number || card.id}
          </span>

          {card.workspace_name && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-primary/10 text-primary border border-primary/20 truncate max-w-[100px]"
              title={`Workspace: ${card.workspace_name}`}
            >
              <Briefcase className="w-2.5 h-2.5 shrink-0 text-primary" />
              <span className="truncate">{card.workspace_name}</span>
            </span>
          )}

          {card.board_name && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-surface-muted text-text-secondary border border-border/60 truncate max-w-[110px]"
              title={`Board: ${card.board_name}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="truncate">{card.board_name}</span>
            </span>
          )}

          {card.labels && card.labels.length > 0 &&
            card.labels.map((l) => (
              <LabelPill key={l.id} name={l.name} color={l.color} size="xs" />
            ))}
        </div>

        {card.list_name && (
          <span
            className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wide uppercase shrink-0 ${
              card.is_complete
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : card.stage === 'in_progress'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : card.stage === 'review'
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
            }`}
          >
            {card.list_name}
          </span>
        )}
      </div>

      {/* Card Title & Complete Status */}
      <div className="flex items-start gap-2">
        {card.is_complete && (
          <span className="mt-0.5 w-4 h-4 rounded-full bg-success text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Check className="w-3 h-3 stroke-[3]" />
          </span>
        )}
        <h4
          className={`text-[13.5px] sm:text-[14px] font-bold leading-snug break-words transition-colors ${
            card.is_complete
              ? 'line-through text-text-muted'
              : 'text-text-primary group-hover:text-primary'
          }`}
        >
          {card.title}
        </h4>
      </div>

      {/* Description Snippet */}
      {descriptionSnippet && (
        <p className="text-[11.5px] text-text-secondary line-clamp-2 leading-relaxed">
          {descriptionSnippet}
        </p>
      )}

      {/* Card Footer: Assignee Avatars on Left, Metadata Icons on Right */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-text-secondary text-xs">
        {/* Assignee Avatars */}
        <div className="flex items-center gap-1.5 shrink-0">
          {card.members && card.members.length > 0 ? (
            <div className="flex -space-x-1.5">
              {card.members.slice(0, 3).map((m) => (
                <Avatar
                  key={m.id}
                  name={m.name}
                  src={m.avatar_url}
                  size="xs"
                  className="rounded-full ring-2 ring-surface shadow-2xs"
                  title={m.name}
                />
              ))}
              {card.members.length > 3 && (
                <span className="text-[10px] font-bold text-text-muted pl-1.5 self-center">
                  +{card.members.length - 3}
                </span>
              )}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border border-dashed border-border flex items-center justify-center text-[9px] text-text-muted">
              —
            </div>
          )}
        </div>

        {/* Metadata: Due Date, Checklist, Comments */}
        <div className="flex items-center gap-2 text-xs text-text-muted font-medium">
          {/* Due Date badge */}
          {dueDateInfo && (
            <div
              title={dueDateInfo.title}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                dueDateInfo.isComplete
                  ? 'bg-success-tint text-success-text'
                  : dueDateInfo.isOverdue
                  ? 'bg-danger-tint text-danger-text'
                  : dueDateInfo.isDueSoon
                  ? 'bg-warning-tint text-warning-text'
                  : 'bg-surface-muted text-text-secondary'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{dueDateInfo.text}</span>
            </div>
          )}

          {/* Checklist progress */}
          {hasChecklist && (
            <span className="flex items-center gap-1 text-[10.5px] font-medium text-text-secondary">
              <CheckSquare className="w-3 h-3 text-text-muted" />
              <span>{checklist.completed}/{checklist.total}</span>
            </span>
          )}

          {/* Comments count */}
          {card.comment_count > 0 && (
            <span className="flex items-center gap-1 text-[10.5px] text-text-muted">
              <MessageSquare className="w-2.5 h-2.5 text-text-muted" />
              <span>{card.comment_count}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
