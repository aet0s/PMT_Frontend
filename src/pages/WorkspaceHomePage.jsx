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
  ShieldCheck,
  Settings,
  Archive,
  UserPlus,
  FolderKanban,
  Sparkles,
  Calendar
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
    document.title = `${workspace?.name || 'Workspace'} - Home / My Work | TaskFlow`;
  }, [workspace]);

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
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-6 sm:p-8 lg:p-10">
      <div className="max-w-6xl mx-auto w-full space-y-9">
        
        {/* Workspace Welcome & Action Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-2 border-b border-border">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-tint text-primary border border-primary/20">
                Workspace Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface border border-border text-text-secondary">
                {workspace?.role || user?.role || 'Member'}
              </span>
            </div>
            <h1 tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              {workspace?.name || 'Your Workspace'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              Overview of your active projects, team workflow, and workspace tools.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenInvite && (
              <Button
                variant="outline"
                size="md"
                onClick={onOpenInvite}
                leftIcon={<UserPlus className="w-4 h-4" />}
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
              >
                Create Project
              </Button>
            )}
          </div>
        </div>

        {/* Live Workspace Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 bg-surface border border-border rounded-2xl shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary-tint text-primary border border-primary/10 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-extrabold text-text-primary">{boards.length}</p>
              <p className="text-xs text-text-secondary truncate font-medium">Active Projects</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-surface border border-border rounded-2xl shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-extrabold text-text-primary">{totalTasks}</p>
              <p className="text-xs text-text-secondary truncate font-medium">Total Tasks</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-surface border border-border rounded-2xl shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Columns3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-extrabold text-text-primary">{totalLists}</p>
              <p className="text-xs text-text-secondary truncate font-medium">Workflow Lists</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-surface border border-border rounded-2xl shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </p>
              <p className="text-xs text-text-secondary truncate font-medium">Workspace Healthy</p>
            </div>
          </div>
        </div>

        {/* Projects and Boards Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                Projects & Boards
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary border border-border">
                {boards.length}
              </span>
            </div>

            {boards.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter projects..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}
          </div>

          {boards.length === 0 ? (
            <div className="p-12 sm:p-16 bg-surface border border-border rounded-2xl text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-primary-tint text-primary border border-primary/20 mx-auto flex items-center justify-center shadow-xs">
                <FolderKanban className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-text-primary">No projects yet in this workspace</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Get started by creating your first project board. Organize tasks, track deadlines, and collaborate with your team.
                </p>
              </div>
              {onCreateBoard && (
                <Button variant="primary" size="md" onClick={onCreateBoard} leftIcon={<FolderPlus className="w-4 h-4" />}>
                  Create your first project
                </Button>
              )}
            </div>
          ) : filteredBoards.length === 0 ? (
            <div className="p-8 bg-surface border border-border rounded-2xl text-center text-xs text-text-secondary">
              No projects matching "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBoards.map((b) => {
                const bgClass = getBoardBgClass(b.background_color);
                const bgStyle = getBoardStyle(b.background_color);

                return (
                  <Link
                    key={b.id}
                    to={`/w/${workspaceId}/p/${b.id}/board`}
                    style={bgStyle}
                    className={`${bgClass} rounded-2xl border border-black/8 hover:border-primary/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between min-h-[160px] group text-left relative overflow-hidden`}
                  >
                    {/* Top Row: Icon, Title & Hover Arrow */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-surface border border-black/5 flex items-center justify-center text-text-primary shrink-0 shadow-2xs">
                            <LayoutGrid className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                            {b.name}
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-surface/70 group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center shrink-0 border border-black/5 shadow-2xs">
                          <ArrowUpRight className="w-3.5 h-3.5 text-text-secondary group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* Middle Row: Meta Badges */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-surface text-text-secondary border border-black/5 shadow-2xs">
                          <CheckSquare className="w-3 h-3 text-text-muted" />
                          {b.card_count || 0} {Number(b.card_count) === 1 ? 'task' : 'tasks'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-surface text-text-secondary border border-black/5 shadow-2xs">
                          <Columns3 className="w-3 h-3 text-text-muted" />
                          {b.list_count || 0} {Number(b.list_count) === 1 ? 'list' : 'lists'}
                        </span>
                        {Number(b.member_count) > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-surface text-text-secondary border border-black/5 shadow-2xs">
                            <Users className="w-3 h-3 text-text-muted" />
                            {b.member_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Date & Open action */}
                    <div className="pt-3 border-t border-black/5 flex items-center justify-between text-xs text-text-secondary">
                      <span className="text-[11px] text-text-muted flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formatBoardDate(b.created_at)}
                      </span>
                      <span className="text-[11px] font-semibold text-primary group-hover:underline">
                        Open Board &rarr;
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Access & Workspace Management Hub */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Workspace Tools & Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to={`/w/${workspaceId}/members`}
              className="p-4 bg-surface hover:bg-surface-hover border border-border hover:border-border-strong rounded-xl shadow-xs transition-all flex items-start gap-3.5 group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                  Team Members
                </p>
                <p className="text-xs text-text-secondary line-clamp-1">
                  Manage members, roles, and pending invitations.
                </p>
              </div>
            </Link>

            <Link
              to={`/w/${workspaceId}/settings/general`}
              className="p-4 bg-surface hover:bg-surface-hover border border-border hover:border-border-strong rounded-xl shadow-xs transition-all flex items-start gap-3.5 group"
            >
              <div className="w-9 h-9 rounded-lg bg-surface-muted text-text-secondary flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                  Workspace Settings
                </p>
                <p className="text-xs text-text-secondary line-clamp-1">
                  Configure workspace name, security, and preferences.
                </p>
              </div>
            </Link>

            <Link
              to={`/w/${workspaceId}/archive`}
              className="p-4 bg-surface hover:bg-surface-hover border border-border hover:border-border-strong rounded-xl shadow-xs transition-all flex items-start gap-3.5 group"
            >
              <div className="w-9 h-9 rounded-lg bg-surface-muted text-text-secondary flex items-center justify-center shrink-0">
                <Archive className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                  Archived Items
                </p>
                <p className="text-xs text-text-secondary line-clamp-1">
                  View and restore archived boards, lists, and tasks.
                </p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
