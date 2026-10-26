// client/src/components/Navigation/GlobalHeader.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Menu,
  Pencil,
  Check,
  ChevronDown,
  Search,
  X,
  Palette,
  MoreHorizontal,
  Archive,
  Trash2,
  LayoutGrid,
  Users,
  BarChart3,
  Settings,
  FolderKanban,
  Sparkles,
  Inbox,
  CalendarCheck,
  ShieldCheck,
  CheckSquare
} from 'lucide-react';
import NotificationBell from '../Notifications/NotificationBell';
import UserDropdown from '../ui/UserDropdown';
import { PALETTES } from '../../lib/palettes';
import { usePermissions } from '../../context/PermissionContext';

export default function GlobalHeader({
  workspace,
  board,
  boards = [],
  subPath = '',
  onOpenMobileSidebar,
  onSelectNotificationCard,
  onOpenAllNotifications,
  // Board-specific callbacks
  canEditBoard: propCanEditBoard,
  canDeleteBoard: propCanDeleteBoard,
  canArchiveBoard: propCanArchiveBoard,
  onUpdateBoard,
  onArchiveBoard,
  onDeleteBoard,
  isActivityOpen = false,
  onToggleActivity,
  className = ''
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission, userRole } = usePermissions();
  const userRank = Number(userRole?.rank || 0);
  const roleName = String(userRole?.name || '').toLowerCase();
  const isTopLevel = userRank >= 40 || ['owner', 'admin', 'project manager', 'team lead'].includes(roleName);

  const canEditBoard = propCanEditBoard ?? (isTopLevel || hasPermission('project.edit_settings'));
  const canDeleteBoard = propCanDeleteBoard ?? (isTopLevel || hasPermission('project.delete'));
  const canArchiveBoard = propCanArchiveBoard ?? (isTopLevel || hasPermission('project.archive'));
  const canViewActivity = hasPermission('activity.view');

  // Search input state (bound to URL ?search=)
  const searchQuery = searchParams.get('search') || '';
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('search', val);
      else next.delete('search');
      return next;
    });
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('search');
      return next;
    });
  };

  // Inline board rename state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(board?.name || '');

  useEffect(() => {
    if (board?.name) {
      setTitleInput(board.name);
    }
  }, [board?.name]);

  const handleSaveRename = async () => {
    if (!titleInput.trim() || titleInput === board?.name) {
      setIsEditingTitle(false);
      return;
    }
    if (onUpdateBoard && board?.id) {
      try {
        await onUpdateBoard(board.id, { name: titleInput.trim() });
      } catch (err) {
        console.error('Failed to rename board:', err);
      }
    }
    setIsEditingTitle(false);
  };

  // Quick Board Switcher dropdown
  const [isBoardSwitcherOpen, setIsBoardSwitcherOpen] = useState(false);
  const boardSwitcherRef = useRef(null);

  // Board actions menu dropdown
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const boardMenuRef = useRef(null);

  // Palette picker dropdown
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const paletteRef = useRef(null);
  const paletteButtonRef = useRef(null);

  // Click outside listener for all dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boardSwitcherRef.current && !boardSwitcherRef.current.contains(e.target)) {
        setIsBoardSwitcherOpen(false);
      }
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target)) {
        setIsBoardMenuOpen(false);
      }
      if (
        paletteRef.current &&
        !paletteRef.current.contains(e.target) &&
        paletteButtonRef.current &&
        !paletteButtonRef.current.contains(e.target)
      ) {
        setIsPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine active view context
  const pathParts = subPath ? subPath.split('/') : [];
  const isProjectRoute = pathParts[0] === 'p' && pathParts[1];
  const isWorkspaceToolRoute = ['audit', 'home', 'members', 'company-members', 'reports', 'settings', 'archive', 'notifications', 'daily-tracker', 'my-tasks'].includes(subPath);
  const isOnBoard = Boolean(board && (isProjectRoute || !isWorkspaceToolRoute));

  // Page title and icon mapping for non-board pages
  const pageMeta = useMemo(() => {
    if (isOnBoard) return null;
    const cleanSub = subPath.split('/')[0] || 'home';
    switch (cleanSub) {
      case 'home':
        return { title: workspace?.name || 'Workspace', badge: 'Overview', icon: FolderKanban };
      case 'my-tasks':
        return { title: 'My Tasks & Work', badge: 'Personal Hub', icon: CheckSquare };
      case 'members':
        return { title: 'Workspace Members', badge: 'Access', icon: Users };
      case 'company-members':
        return { title: 'Company Members', badge: 'Directory', icon: Users };
      case 'reports':
        return { title: 'Reports & Insights', badge: 'Analytics', icon: BarChart3 };
      case 'settings':
        return { title: 'Workspace Settings', badge: 'Admin', icon: Settings };
      case 'account':
        return { title: 'Account Settings', badge: 'Preferences', icon: Settings };
      case 'profile':
        return { title: 'User Profile', badge: 'Account', icon: Users };
      case 'archive':
        return { title: 'Archived Items', badge: 'History', icon: Archive };
      case 'notifications':
        return { title: 'Notifications', badge: 'Inbox', icon: Inbox };
      case 'daily-tracker':
        return { title: 'Daily Tracker', badge: 'Daily Tasks', icon: CalendarCheck };
      case 'audit':
        return { title: 'Enterprise Audit Log', badge: 'Compliance', icon: ShieldCheck };
      case 'calendar':
        return { title: 'Calendar & Schedule', badge: 'Timeline', icon: Sparkles };
      case 'list':
      case 'issues':
        return { title: 'Issues & Tasks', badge: 'Backlog', icon: LayoutGrid };
      default:
        return { title: workspace?.name || 'Workspace', badge: 'Workspace', icon: FolderKanban };
    }
  }, [isOnBoard, subPath, workspace?.name]);

  const PageIcon = pageMeta?.icon || LayoutGrid;

  return (
    <header
      className={`relative z-30 h-16 px-4 sm:px-6 lg:px-8 bg-app flex items-center justify-between shrink-0 select-none border-b border-border/40 ${className}`}
    >
      {/* ======================================================== */}
      {/* LEFT ZONE: Mobile Menu Toggle + Title / Switcher         */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 md:flex-initial">
        {/* Mobile Hamburger Drawer Button */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-muted border border-border rounded-xl lg:hidden transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 shadow-2xs"
          title="Open Menu"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isOnBoard ? (
          // --- BOARD TITLE MODE ---
          isEditingTitle && canEditBoard ? (
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                onBlur={handleSaveRename}
                className="text-base sm:text-lg font-bold text-text-primary bg-surface border border-primary rounded-xl px-2.5 py-1 focus:outline-none min-w-[140px]"
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="p-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl cursor-pointer transition-colors shrink-0"
                title="Save board name"
                aria-label="Save board name"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`flex items-center gap-2 group min-w-0 ${canEditBoard ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={canEditBoard ? () => setIsEditingTitle(true) : undefined}
                title={canEditBoard ? 'Click to rename project' : undefined}
              >
                <h2 className="text-base sm:text-lg lg:text-xl font-black text-text-primary tracking-tight truncate group-hover:text-primary transition-colors flex items-center gap-2">
                  <span className="truncate">{board.name}</span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-tint text-primary shrink-0">
                    Active Sprint
                  </span>
                </h2>
                {canEditBoard && (
                  <Pencil className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
                )}
              </div>

              {/* Quick Board Switcher Dropdown */}
              {boards && boards.length > 1 && (
                <div className="relative shrink-0" ref={boardSwitcherRef}>
                  <button
                    type="button"
                    onClick={() => setIsBoardSwitcherOpen((prev) => !prev)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      isBoardSwitcherOpen
                        ? 'bg-primary-tint text-primary border-primary/40'
                        : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-muted border-border shadow-2xs'
                    }`}
                    title="Switch Project"
                    aria-label="Switch Project"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isBoardSwitcherOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isBoardSwitcherOpen && (
                    <div className="absolute left-0 top-full mt-2 w-64 max-h-80 overflow-y-auto bg-surface border border-border/80 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-sassy-dropdown-left">
                      <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border/60 mb-1 flex items-center justify-between">
                        <span>Projects & Boards</span>
                        <span>{boards.length}</span>
                      </div>
                      {boards.map((b) => {
                        const isCurrent = Number(b.id) === Number(board.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setIsBoardSwitcherOpen(false);
                              if (!isCurrent) {
                                navigate(`/w/${workspace?.id}/p/${b.id}/board`);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-primary-tint text-primary font-bold'
                                : 'text-text-primary hover:bg-surface-muted'
                            }`}
                          >
                            <span className="truncate flex-1">{b.name}</span>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        ) : (
          // --- PAGE TITLE MODE (Non-board pages) ---
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0">
              <PageIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base sm:text-lg font-black text-text-primary tracking-tight truncate">
                {pageMeta?.title}
              </h2>
              {pageMeta?.badge && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-muted text-text-secondary border border-border/60 shrink-0">
                  {pageMeta.badge}
                </span>
              )}
            </div>

            {/* Quick Switch to Projects Dropdown from ANY page */}
            {boards && boards.length > 0 && (
              <div className="relative shrink-0 ml-1" ref={boardSwitcherRef}>
                <button
                  type="button"
                  onClick={() => setIsBoardSwitcherOpen((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isBoardSwitcherOpen
                      ? 'bg-primary-tint text-primary border-primary/40'
                      : 'bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-muted border-border shadow-2xs'
                  }`}
                  title="Jump to Project"
                  aria-label="Jump to Project"
                >
                  <span className="hidden md:inline">Projects</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isBoardSwitcherOpen ? 'rotate-180' : ''}`} />
                </button>

                {isBoardSwitcherOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 max-h-80 overflow-y-auto bg-surface border border-border/80 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-sassy-dropdown-left">
                    <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border/60 mb-1 flex items-center justify-between">
                      <span>Select Project</span>
                      <span>{boards.length}</span>
                    </div>
                    {boards.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setIsBoardSwitcherOpen(false);
                          navigate(`/w/${workspace?.id}/p/${b.id}/board`);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer text-text-primary hover:bg-surface-muted"
                      >
                        <span className="truncate flex-1">{b.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* CENTER ZONE: Global Search & Action Badges               */}
      {/* ======================================================== */}
      <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 px-2 min-w-0">
        {/* Universal Pill Search */}
        <div className="relative hidden md:block w-52 lg:w-72 xl:w-80">
          <label htmlFor="global-search-input" className="sr-only">
            Search task, project, label
          </label>
          <input
            id="global-search-input"
            type="text"
            placeholder="Search task, project, label ..."
            value={localSearch}
            onChange={handleSearchChange}
            className="w-full pl-4 pr-10 py-1.5 bg-surface-muted/60 border border-border/80 rounded-full text-text-primary placeholder:text-text-muted text-xs focus:outline-none focus:border-primary focus:bg-surface focus-visible:ring-2 focus-visible:ring-primary/20 transition-all min-h-[38px] shadow-2xs"
          />
          {localSearch ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          )}
        </div>

        {/* Board Specific Controls: Palette, Activity, Actions Menu */}
        {isOnBoard && (
          <>
            {/* Theme Palette Button */}
            {canEditBoard && (
              <button
                ref={paletteButtonRef}
                type="button"
                onClick={() => setIsPaletteOpen((prev) => !prev)}
                className="p-2 bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border rounded-xl transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shadow-2xs"
                title="Change Board Theme"
                aria-label="Change Board Theme"
              >
                <Palette className="w-4 h-4" />
              </button>
            )}

            {/* Board Actions Overflow Menu (Archive, Delete, Rename) - STRICTLY GATED BY RBAC PERMISSIONS */}
            {((canEditBoard && onUpdateBoard) || (canArchiveBoard && onArchiveBoard) || (canDeleteBoard && onDeleteBoard)) && (
              <div className="relative" ref={boardMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsBoardMenuOpen((prev) => !prev)}
                  className="p-2 bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border rounded-xl transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shadow-2xs"
                  title="Board Actions"
                  aria-label="Board Actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {isBoardMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border/80 rounded-2xl shadow-xl z-50 py-1.5 text-text-primary animate-sassy-dropdown">
                    {canEditBoard && onUpdateBoard && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsBoardMenuOpen(false);
                          setIsEditingTitle(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer text-left"
                      >
                        <Pencil className="w-3.5 h-3.5 text-text-secondary" />
                        Rename Board
                      </button>
                    )}
                    {canArchiveBoard && onArchiveBoard && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsBoardMenuOpen(false);
                          if (onArchiveBoard) onArchiveBoard();
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-warning-text hover:bg-warning-tint transition-colors cursor-pointer text-left"
                      >
                        <Archive className="w-3.5 h-3.5 text-warning" />
                        Archive Board
                      </button>
                    )}
                    {canDeleteBoard && onDeleteBoard && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsBoardMenuOpen(false);
                          if (onDeleteBoard) onDeleteBoard();
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-danger-text hover:bg-danger-tint transition-colors cursor-pointer text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                        Delete Board
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Global Notification Bell (Universal on every page) */}
        <NotificationBell
          onSelectNotificationCard={onSelectNotificationCard}
          onOpenAllNotifications={onOpenAllNotifications}
        />
      </div>

      {/* ======================================================== */}
      {/* RIGHT ZONE: Top Right Corner User Dropdown               */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2.5 shrink-0 pl-2">
        <UserDropdown workspaceId={workspace?.id} />
      </div>

      {/* ======================================================== */}
      {/* FLOATING PALETTE PICKER (Rendered below Palette Button)   */}
      {/* ======================================================== */}
      {isOnBoard && isPaletteOpen && (
        <div
          ref={paletteRef}
          className="absolute right-4 sm:right-20 top-18 bg-surface border border-border rounded-2xl shadow-xl p-4 z-50 w-80 space-y-3 text-left animate-sassy-dropdown"
        >
          <div className="flex items-center justify-between pb-1 border-b border-border/50">
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Project Background Theme
            </span>
            <button
              type="button"
              onClick={() => setIsPaletteOpen(false)}
              className="text-text-muted hover:text-text-primary cursor-pointer p-1 rounded-lg"
              aria-label="Close palette picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {PALETTES.map((p) => (
              <div
                key={p.name}
                onClick={() => {
                  if (onUpdateBoard && board?.id) {
                    onUpdateBoard(board.id, { background_color: p.bg });
                  }
                  setIsPaletteOpen(false);
                }}
                className={`h-14 rounded-xl ${p.bg} cursor-pointer border-2 transition-all p-2 flex flex-col justify-end ${
                  board?.background_color === p.bg
                    ? 'border-primary shadow-sm scale-102 ring-2 ring-primary/20'
                    : 'border-border hover:border-border-strong hover:scale-101'
                }`}
              >
                <span className="text-[11px] font-semibold text-text-primary truncate">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
