// client/src/pages/WorkspaceHomePage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  List,
  CheckCircle2,
  FolderPlus,
  Search,
  Users,
  CheckSquare,
  Columns3,
  ArrowUpRight,
  Settings,
  Archive,
  FolderKanban,
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Flame,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { Select } from '../components/ui/Select';
import { getBoardBgClass, getBoardStyle } from '../lib/palettes';
import { getTimeBasedGreeting, fetchServerGreeting, getCurrentServerDate } from '../lib/serverTime';
import { getFileUrl } from '../api/config';

function formatBoardDate(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return format(d, 'MMM d, yyyy');
  } catch {
    return 'Recently';
  }
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Created' },
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
  { value: 'tasks_desc', label: 'Most Tasks' },
  { value: 'tasks_asc', label: 'Fewest Tasks' }
];

export default function WorkspaceHomePage({
  workspace,
  boards = [],
  user,
  onCreateBoard,
  onOpenInvite
}) {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const currentWsId = workspace?.id || workspaceId;

  // Search, filter, sorting, view mode, and pinned board states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pinned' | 'with_tasks' | 'empty'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('taskflow_dashboard_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Pinned/Default board for this workspace
  const [pinnedBoardId, setPinnedBoardId] = useState(() => {
    try {
      return localStorage.getItem(`taskflow_pinned_board_${currentWsId}`) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const id = localStorage.getItem(`taskflow_pinned_board_${currentWsId}`);
      setPinnedBoardId(id || null);
    } catch {}
  }, [currentWsId]);

  // Persist view mode preference
  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('taskflow_dashboard_view_mode', mode);
    } catch {}
  };

  // Toggle pinned/default board
  const handleTogglePinBoard = (e, boardId) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIdStr = String(boardId);
    const newPinnedId = String(pinnedBoardId) === targetIdStr ? null : targetIdStr;
    setPinnedBoardId(newPinnedId);
    try {
      if (newPinnedId) {
        localStorage.setItem(`taskflow_pinned_board_${currentWsId}`, newPinnedId);
      } else {
        localStorage.removeItem(`taskflow_pinned_board_${currentWsId}`);
      }
    } catch {}
  };

  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Workspace Overview | TaskFlow`;
  }, [workspace]);

  const [greeting, setGreeting] = useState(() => getTimeBasedGreeting(getCurrentServerDate()));

  useEffect(() => {
    let mounted = true;
    fetchServerGreeting().then((srvGreeting) => {
      if (mounted && srvGreeting) {
        setGreeting(srvGreeting);
      }
    });

    const interval = setInterval(() => {
      if (mounted) {
        setGreeting(getTimeBasedGreeting(getCurrentServerDate()));
      }
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const displayName = user?.name || user?.username?.split('@')[0] || 'there';

  // Aggregate workspace metrics
  const totalTasks = useMemo(() => {
    return boards.reduce((acc, b) => acc + (Number(b.card_count) || 0), 0);
  }, [boards]);

  const totalLists = useMemo(() => {
    return boards.reduce((acc, b) => acc + (Number(b.list_count) || 0), 0);
  }, [boards]);

  const boardsWithTasksCount = useMemo(() => {
    return boards.filter((b) => (Number(b.card_count) || 0) > 0).length;
  }, [boards]);

  const emptyBoardsCount = useMemo(() => {
    return boards.filter((b) => (Number(b.card_count) || 0) === 0).length;
  }, [boards]);

  const pinnedBoardsCount = useMemo(() => {
    return boards.filter((b) => String(b.id) === String(pinnedBoardId)).length;
  }, [boards, pinnedBoardId]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, filterStatus, viewMode]);

  // Filter & Sort boards
  const filteredAndSortedBoards = useMemo(() => {
    let result = [...boards];

    // 1. Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) => b.name?.toLowerCase().includes(q));
    }

    // 2. Status filter
    if (filterStatus === 'pinned') {
      result = result.filter((b) => String(b.id) === String(pinnedBoardId));
    } else if (filterStatus === 'with_tasks') {
      result = result.filter((b) => (Number(b.card_count) || 0) > 0);
    } else if (filterStatus === 'empty') {
      result = result.filter((b) => (Number(b.card_count) || 0) === 0);
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'tasks_desc') {
        return (Number(b.card_count) || 0) - (Number(a.card_count) || 0);
      }
      if (sortBy === 'tasks_asc') {
        return (Number(a.card_count) || 0) - (Number(b.card_count) || 0);
      }
      // 'recent' fallback
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return result;
  }, [boards, searchQuery, filterStatus, sortBy, pinnedBoardId]);

  // Bounded pagination: 6 per page for grid (2 rows of 3), 10 for list
  const itemsPerPage = viewMode === 'grid' ? 6 : 10;
  const totalPages = Math.ceil(filteredAndSortedBoards.length / itemsPerPage) || 1;
  const paginatedBoards = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedBoards.slice(start, start + itemsPerPage);
  }, [filteredAndSortedBoards, currentPage, itemsPerPage]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-6 sm:p-8 lg:p-10 no-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        {/* ======================================================== */}
        {/* HERO / WORKSPACE GREETING BANNER                         */}
        {/* ======================================================== */}
        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-xs relative z-20 transition-all">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-tint text-primary border border-primary/20 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Workspace Overview
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-muted border border-border text-text-secondary flex items-center gap-1.5">
                  {(workspace?.icon_url || workspace?.settings?.icon_url) && (
                    <img
                      src={getFileUrl(workspace.icon_url || workspace.settings?.icon_url)}
                      alt=""
                      className="w-4 h-4 rounded-sm object-cover"
                    />
                  )}
                  {workspace?.name || 'TaskFlow Workspace'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success-tint text-success-text border border-success/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Active
                </span>
              </div>

              <h1 tabIndex={-1} className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-primary tracking-tight">
                {greeting}, {displayName}!
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                Welcome to your command center. You have <strong className="text-text-primary font-semibold">{boards.length} active projects</strong> and <strong className="text-text-primary font-semibold">{totalTasks} tasks</strong> in flight. Let's make today productive.
              </p>
              {workspace?.description && (
                <p className="text-xs text-text-secondary/90 bg-surface-muted/60 border border-border/80 px-3.5 py-2 rounded-xl max-w-2xl font-medium leading-relaxed shadow-2xs">
                  {workspace.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {onCreateBoard && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onCreateBoard}
                  leftIcon={<FolderPlus className="w-4 h-4" />}
                  className="rounded-xl font-semibold bg-primary hover:bg-primary-hover shadow-xs"
                >
                  Create Project
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* KEY WORKSPACE METRICS (Modern Rounded SaaS Cards)         */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-surface border border-border rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Projects
              </span>
              <div className="w-9 h-9 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                <LayoutGrid className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                {boards.length}
              </p>
              <p className="text-xs text-text-secondary font-medium mt-0.5 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-success-text" />
                <span>Active workspaces</span>
              </p>
            </div>
          </div>

          <div className="p-5 bg-surface border border-border rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Total Tasks
              </span>
              <div className="w-9 h-9 rounded-xl bg-info-tint text-info-text flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                {totalTasks}
              </p>
              <p className="text-xs text-text-secondary font-medium mt-0.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-info-text" />
                <span>Across all boards</span>
              </p>
            </div>
          </div>

          <div className="p-5 bg-surface border border-border rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Workflow Lists
              </span>
              <div className="w-9 h-9 rounded-xl bg-warning-tint text-warning-text flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                <Columns3 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                {totalLists}
              </p>
              <p className="text-xs text-text-secondary font-medium mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-warning-text" />
                <span>Sprint pipelines</span>
              </p>
            </div>
          </div>

          <div className="p-5 bg-surface border border-border rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Team Health
              </span>
              <div className="w-9 h-9 rounded-xl bg-success-tint text-success-text flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-success-text tracking-tight flex items-center gap-2">
                100%
              </p>
              <p className="text-xs text-text-secondary font-medium mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-success-text" />
                <span>All systems healthy</span>
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PROJECTS & BOARDS GALLERY (Bounded, Scalable, No Scroll)  */}
        {/* ======================================================== */}
        <div className="space-y-4">
          {/* Controls Bar: Search, Filters, Sort, View Toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary-tint text-primary flex items-center justify-center">
                <FolderKanban className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                Projects & Boards
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary border border-border">
                {filteredAndSortedBoards.length} of {boards.length}
              </span>
            </div>

            {boards.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <label htmlFor="filter-projects-input" className="sr-only">
                    Search projects
                  </label>
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    id="filter-projects-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 transition-all shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="min-w-[150px]">
                  <Select
                    value={sortBy}
                    onChange={(val) => setSortBy(val || 'recent')}
                    options={SORT_OPTIONS}
                    size="sm"
                    aria-label="Sort projects"
                  />
                </div>

                {/* View Mode Toggle: Grid vs Compact List */}
                <div className="flex items-center bg-surface border border-border rounded-xl p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleViewMode('grid')}
                    title="Grid Card View"
                    aria-label="Grid Card View"
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === 'grid'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleViewMode('list')}
                    title="Compact Table View"
                    aria-label="Compact Table View"
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === 'list'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Filter Status Pills */}
          {boards.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filterStatus === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                All Projects ({boards.length})
              </button>
              {pinnedBoardsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('pinned')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                    filterStatus === 'pinned'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span>Pinned ({pinnedBoardsCount})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterStatus('with_tasks')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filterStatus === 'with_tasks'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                Active with Tasks ({boardsWithTasksCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('empty')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filterStatus === 'empty'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                Empty Boards ({emptyBoardsCount})
              </button>
            </div>
          )}

          {/* Projects Content */}
          {boards.length === 0 ? (
            <div className="p-12 sm:p-16 bg-surface border border-border rounded-3xl text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-primary-tint text-primary border border-primary/20 mx-auto flex items-center justify-center shadow-xs">
                <FolderKanban className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-text-primary">No projects yet in this workspace</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Get started by creating your first project board. Organize tasks, manage deadlines, and build something great.
                </p>
              </div>
              {onCreateBoard && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onCreateBoard}
                  leftIcon={<FolderPlus className="w-4 h-4" />}
                  className="rounded-xl font-semibold bg-primary hover:bg-primary-hover shadow-xs"
                >
                  Create your first project
                </Button>
              )}
            </div>
          ) : filteredAndSortedBoards.length === 0 ? (
            <div className="p-10 bg-surface border border-border rounded-2xl text-center text-xs text-text-secondary shadow-xs">
              No projects matching your search or filter criteria.
            </div>
          ) : viewMode === 'grid' ? (
            /* ======================================================== */
            /* 1. PAGINATED CARD GRID (Max 6 per page, clean 2x3 layout) */
            /* ======================================================== */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedBoards.map((b) => {
                  const bgClass = getBoardBgClass(b.background_color);
                  const bgStyle = getBoardStyle(b.background_color);
                  const cardCount = Number(b.card_count) || 0;
                  const listCount = Number(b.list_count) || 0;
                  const isPinned = String(pinnedBoardId) === String(b.id);
                  const completedCount = Number(b.completed_card_count) || 0;
                  const progressPercent = cardCount === 0 ? 0 : Math.min(100, Math.round((completedCount / cardCount) * 100));

                  return (
                    <Link
                      key={b.id}
                      to={`/w/${currentWsId}/p/${b.id}/board`}
                      className={`bg-surface rounded-2xl border ${
                        isPinned ? 'border-primary/60 ring-1 ring-primary/20' : 'border-border'
                      } hover:border-primary/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 p-5 pt-6 flex flex-col justify-between min-h-[185px] group text-left relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
                    >
                      {/* Board Palette Accent Bar at top */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5 bg-primary/20 group-hover:h-2 transition-all"
                        style={bgStyle?.backgroundColor ? { backgroundColor: bgStyle.backgroundColor } : undefined}
                      />

                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className="w-9 h-9 rounded-xl bg-surface-muted border border-border flex items-center justify-center text-primary shrink-0 shadow-2xs group-hover:border-primary/40 transition-colors"
                              style={
                                bgStyle?.backgroundColor
                                  ? { backgroundColor: `${bgStyle.backgroundColor}15`, color: bgStyle.backgroundColor, borderColor: `${bgStyle.backgroundColor}35` }
                                  : undefined
                              }
                            >
                              <LayoutGrid className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm sm:text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate block">
                                {b.name}
                              </span>
                              <span className="text-[11px] text-text-secondary font-medium">
                                {isPinned ? (
                                  <span className="text-warning-text font-bold">★ Pinned Project</span>
                                ) : (
                                  'Project Board'
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleTogglePinBoard(e, b.id)}
                              title={isPinned ? 'Unpin this project' : 'Pin as default project'}
                              aria-label={isPinned ? `Unpin ${b.name}` : `Pin ${b.name} as default`}
                              className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center ${
                                isPinned
                                  ? 'bg-warning-tint text-warning-text'
                                  : 'bg-surface text-text-muted hover:text-text-primary border border-border'
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                            </button>

                            <div className="w-7 h-7 rounded-lg bg-surface group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center border border-border shadow-2xs">
                              <ArrowUpRight className="w-3.5 h-3.5 text-text-secondary group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar Visualization */}
                        <div className="pt-0.5 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
                            <span>Project Progress</span>
                            <span className="font-semibold text-text-primary">{progressPercent}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Meta Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-muted text-text-secondary border border-border shadow-2xs">
                            <CheckSquare className="w-3 h-3 text-text-muted" />
                            {cardCount} {cardCount === 1 ? 'task' : 'tasks'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-muted text-text-secondary border border-border shadow-2xs">
                            <Columns3 className="w-3 h-3 text-text-muted" />
                            {listCount} {listCount === 1 ? 'list' : 'lists'}
                          </span>
                          {Number(b.member_count) > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-muted text-text-secondary border border-border shadow-2xs">
                              <Users className="w-3 h-3 text-text-muted" />
                              {b.member_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row */}
                      <div className="pt-3 mt-3 border-t border-border/70 flex items-center justify-between text-xs text-text-secondary">
                        <span className="text-[11px] text-text-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatBoardDate(b.created_at)}
                        </span>
                        <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          Open Board <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/80 text-xs text-text-secondary">
                  <span aria-label={`Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredAndSortedBoards.length)} of ${filteredAndSortedBoards.length} projects`}>
                    Showing <strong className="text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                    <strong className="text-text-primary">
                      {Math.min(currentPage * itemsPerPage, filteredAndSortedBoards.length)}
                    </strong>{' '}
                    of <strong className="text-text-primary">{filteredAndSortedBoards.length}</strong> projects
                  </span>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1 px-1">
                      {[...Array(totalPages)].map((_, idx) => {
                        const pageNum = idx + 1;
                        if (
                          totalPages <= 7 ||
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          Math.abs(pageNum - currentPage) <= 1
                        ) {
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                                currentPage === pageNum
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return (
                            <span key={pageNum} className="text-text-muted px-1">
                              …
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* 2. COMPACT TABLE VIEW (High density, zero endless scroll) */
            /* ======================================================== */
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted/80 border-b border-border text-text-secondary uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Project Board</th>
                        <th className="py-3 px-3 font-semibold min-w-[120px]">Project Progress</th>
                        <th className="py-3 px-3 font-semibold text-center">Tasks</th>
                        <th className="py-3 px-3 font-semibold text-center">Lists</th>
                        <th className="py-3 px-3 font-semibold text-center">Members</th>
                        <th className="py-3 px-3 font-semibold">Created</th>
                        <th className="py-3 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedBoards.map((b) => {
                        const cardCount = Number(b.card_count) || 0;
                        const listCount = Number(b.list_count) || 0;
                        const memberCount = Number(b.member_count) || 0;
                        const isPinned = String(pinnedBoardId) === String(b.id);
                        const completedCount = Number(b.completed_card_count) || 0;
                        const progressPercent = cardCount === 0 ? 0 : Math.min(100, Math.round((completedCount / cardCount) * 100));

                        const rowBgStyle = getBoardStyle(b.background_color);

                        return (
                          <tr
                            key={b.id}
                            onClick={() => navigate(`/w/${currentWsId}/p/${b.id}/board`)}
                            className="hover:bg-surface-hover/70 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-primary shrink-0 group-hover:border-primary/40 transition-colors">
                                  <span
                                    className="w-3 h-3 rounded-full bg-primary"
                                    style={rowBgStyle?.backgroundColor ? { backgroundColor: rowBgStyle.backgroundColor } : undefined}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-text-primary text-xs sm:text-sm group-hover:text-primary transition-colors truncate block">
                                      {b.name}
                                    </span>
                                    {isPinned && (
                                      <Star className="w-3.5 h-3.5 fill-warning-text text-warning-text shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-[11px] text-text-secondary">
                                    {isPinned ? (
                                      <span className="text-warning-text font-bold">★ Pinned Project</span>
                                    ) : (
                                      'Project Board'
                                    )}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-text-primary">{progressPercent}%</span>
                                </div>
                                <ProgressBar value={progressPercent} max={100} variant="primary" size="sm" />
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <Badge variant="secondary" size="sm">
                                {cardCount} tasks
                              </Badge>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-medium text-text-secondary">{listCount}</span>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-medium text-text-secondary">{memberCount}</span>
                            </td>

                            <td className="py-3 px-3 text-text-secondary text-[11px] whitespace-nowrap">
                              {formatBoardDate(b.created_at)}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePinBoard(e, b.id)}
                                  title={isPinned ? 'Unpin this project' : 'Pin as default project'}
                                  aria-label={isPinned ? `Unpin ${b.name}` : `Pin ${b.name} as default`}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    isPinned
                                      ? 'bg-warning-tint text-warning-text'
                                      : 'text-text-muted hover:text-text-primary hover:bg-surface-muted'
                                  }`}
                                >
                                  <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                                </button>
                                <Link
                                  to={`/w/${currentWsId}/p/${b.id}/board`}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                                >
                                  <span>Open</span>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/80 text-xs text-text-secondary">
                  <span aria-label={`Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredAndSortedBoards.length)} of ${filteredAndSortedBoards.length} projects`}>
                    Showing <strong className="text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                    <strong className="text-text-primary">
                      {Math.min(currentPage * itemsPerPage, filteredAndSortedBoards.length)}
                    </strong>{' '}
                    of <strong className="text-text-primary">{filteredAndSortedBoards.length}</strong> projects
                  </span>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1 px-1">
                      {[...Array(totalPages)].map((_, idx) => {
                        const pageNum = idx + 1;
                        if (
                          totalPages <= 7 ||
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          Math.abs(pageNum - currentPage) <= 1
                        ) {
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                                currentPage === pageNum
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return (
                            <span key={pageNum} className="text-text-muted px-1">
                              …
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* MY WORK & WORKSPACE MANAGEMENT QUICK ACCESS              */}
        {/* ======================================================== */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-info-tint text-info-text flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
              Workspace Hub & Quick Actions
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to={`/w/${currentWsId}/members`}
              className="p-5 bg-surface hover:bg-surface-muted border border-border hover:border-primary/40 rounded-2xl shadow-xs transition-all flex flex-col justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  Team Members
                </p>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                  Manage collaborators, assign workspace roles, and invite new members.
                </p>
              </div>
            </Link>

            <Link
              to={`/w/${currentWsId}/reports`}
              className="p-5 bg-surface hover:bg-surface-muted border border-border hover:border-primary/40 rounded-2xl shadow-xs transition-all flex flex-col justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-info-tint text-info-text flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  Reports & Analytics
                </p>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                  Track sprint velocity, completion rates, and team workload trends.
                </p>
              </div>
            </Link>

            <Link
              to={`/w/${currentWsId}/settings/general`}
              className="p-5 bg-surface hover:bg-surface-muted border border-border hover:border-primary/40 rounded-2xl shadow-xs transition-all flex flex-col justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Settings className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  Workspace Settings
                </p>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                  Configure workspace preferences, security policies, and integrations.
                </p>
              </div>
            </Link>

            <Link
              to={`/w/${currentWsId}/archive`}
              className="p-5 bg-surface hover:bg-surface-muted border border-border hover:border-primary/40 rounded-2xl shadow-xs transition-all flex flex-col justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Archive className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  Archived Items
                </p>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                  Restore previously archived projects, lists, and completed tasks.
                </p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
