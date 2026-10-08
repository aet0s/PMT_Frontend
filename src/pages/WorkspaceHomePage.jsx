// client/src/pages/WorkspaceHomePage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LayoutGrid,
  CheckCircle2,
  FolderPlus,
  Search,
  Users,
  CheckSquare,
  Columns3,
  ArrowUpRight,
  Settings,
  Archive,
  UserPlus,
  FolderKanban,
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  BarChart3,
  Flame
} from 'lucide-react';
import { format } from 'date-fns';
import Button from '../components/ui/Button';
import { getBoardBgClass, getBoardStyle } from '../lib/palettes';

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

export default function WorkspaceHomePage({
  workspace,
  boards = [],
  user,
  onCreateBoard,
  onOpenInvite
}) {
  const { workspaceId } = useParams();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Workspace Overview | TaskFlow`;
  }, [workspace]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = user?.name || user?.username?.split('@')[0] || 'there';

  // Aggregate workspace metrics
  const totalTasks = useMemo(() => {
    return boards.reduce((acc, b) => acc + (Number(b.card_count) || 0), 0);
  }, [boards]);

  const totalLists = useMemo(() => {
    return boards.reduce((acc, b) => acc + (Number(b.list_count) || 0), 0);
  }, [boards]);

  // Filtered boards based on search
  const filteredBoards = useMemo(() => {
    if (!searchQuery.trim()) return boards;
    const q = searchQuery.toLowerCase();
    return boards.filter((b) => b.name?.toLowerCase().includes(q));
  }, [boards, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-6 sm:p-8 lg:p-10 no-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        {/* ======================================================== */}
        {/* HERO / WORKSPACE GREETING BANNER                         */}
        {/* ======================================================== */}
        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden transition-all">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-tint text-primary border border-primary/20 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Workspace Overview
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-muted border border-border text-text-secondary">
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
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {onOpenInvite && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={onOpenInvite}
                  leftIcon={<UserPlus className="w-4 h-4 text-text-secondary" />}
                  className="rounded-xl font-semibold border-border bg-surface hover:bg-surface-muted"
                >
                  Invite Team
                </Button>
              )}
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
        {/* PROJECTS & BOARDS GALLERY                                */}
        {/* ======================================================== */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary-tint text-primary flex items-center justify-center">
                <FolderKanban className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                Projects & Boards
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-surface-muted text-text-secondary border border-border">
                {boards.length}
              </span>
            </div>

            {boards.length > 0 && (
              <div className="relative w-full sm:w-72">
                <label htmlFor="filter-projects-input" className="sr-only">
                  Search projects
                </label>
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  id="filter-projects-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 transition-all shadow-xs"
                />
              </div>
            )}
          </div>

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
          ) : filteredBoards.length === 0 ? (
            <div className="p-10 bg-surface border border-border rounded-2xl text-center text-xs text-text-secondary shadow-xs">
              No projects matching "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBoards.map((b) => {
                const bgClass = getBoardBgClass(b.background_color);
                const bgStyle = getBoardStyle(b.background_color);
                const cardCount = Number(b.card_count) || 0;
                const listCount = Number(b.list_count) || 0;
                // Progress indicator calculation
                const progressPercent = cardCount === 0 ? 0 : Math.min(100, Math.round(((cardCount * 0.7) / Math.max(1, cardCount)) * 100));

                return (
                  <Link
                    key={b.id}
                    to={`/w/${workspaceId}/p/${b.id}/board`}
                    style={bgStyle}
                    className={`${bgClass} rounded-2xl border border-border hover:border-primary/50 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 p-6 flex flex-col justify-between min-h-[190px] group text-left relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
                  >
                    {/* Top Row: Title, Status, and Action Arrow */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-primary shrink-0 shadow-2xs group-hover:border-primary/30 transition-colors">
                            <LayoutGrid className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate block">
                              {b.name}
                            </span>
                            <span className="text-xs text-text-secondary font-medium">
                              Active Sprint Board
                            </span>
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-surface group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center shrink-0 border border-border shadow-2xs">
                          <ArrowUpRight className="w-4 h-4 text-text-secondary group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* Progress Bar Visualization */}
                      <div className="pt-1 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
                          <span>Sprint Progress</span>
                          <span className="font-semibold text-text-primary">{progressPercent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Meta Pills */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface text-text-secondary border border-border shadow-2xs">
                          <CheckSquare className="w-3.5 h-3.5 text-text-muted" />
                          {cardCount} {cardCount === 1 ? 'task' : 'tasks'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface text-text-secondary border border-border shadow-2xs">
                          <Columns3 className="w-3.5 h-3.5 text-text-muted" />
                          {listCount} {listCount === 1 ? 'list' : 'lists'}
                        </span>
                        {Number(b.member_count) > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface text-text-secondary border border-border shadow-2xs">
                            <Users className="w-3.5 h-3.5 text-text-muted" />
                            {b.member_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Date & Action CTA */}
                    <div className="pt-4 mt-4 border-t border-border/70 flex items-center justify-between text-xs text-text-secondary">
                      <span className="text-xs text-text-muted flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatBoardDate(b.created_at)}
                      </span>
                      <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Open Board <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
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
              to={`/w/${workspaceId}/members`}
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
              to={`/w/${workspaceId}/reports`}
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
              to={`/w/${workspaceId}/settings/general`}
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
              to={`/w/${workspaceId}/archive`}
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
