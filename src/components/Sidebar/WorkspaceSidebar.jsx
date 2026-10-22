import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionContext';
import { useSocket } from '../../context/SocketProvider';
import PromptDialog from '../shared/PromptDialog';
import { getThemeDotClass } from '../../lib/palettes';
import { getFileUrl } from '../../api/config';
import {
  Trello,
  Plus,
  Briefcase,
  LayoutGrid,
  ChevronDown,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Archive,
  Trash2,
  Pencil,
  Settings,
  Bell,
  Home,
  Users,
  User,
  Activity,
  BarChart3,
  Check,
  X,
  Layers,
  Calendar,
  CheckSquare,
  Rocket,
  MapPin,
  Sparkles,
  CalendarCheck,
  Search
} from 'lucide-react';

export default function WorkspaceSidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  workspaces = [],
  activeWorkspace,
  onSelectWorkspace,
  boards = [],
  activeBoardId,
  onSelectBoard,
  onCreateWorkspaceClick,
  onCreateBoardClick,
  onViewArchive,
  onOpenNotifications,
  onArchiveWorkspace,
  onDeleteWorkspace,
  onRenameWorkspace,
  onOpenSettings,
  onOpenProfile
}) {
  const navigate = useNavigate();
  const socketCtx = useSocket() || {};
  const unreadCount = socketCtx.unreadCount || 0;
  const byBoardUnread = socketCtx.byBoardUnread || {};
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isWsActionsOpen, setIsWsActionsOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [workspaceRenameValue, setWorkspaceRenameValue] = useState('');
  const [wsSearchQuery, setWsSearchQuery] = useState('');
  const menuRef = useRef(null);
  const wsDropdownRef = useRef(null);
  const [wsDropdownPos, setWsDropdownPos] = useState({ top: 0, left: 0, minWidth: 260 });
  const [railTooltip, setRailTooltip] = useState(null);

  const filteredWorkspaces = useMemo(() => {
    if (!wsSearchQuery.trim()) return workspaces;
    const q = wsSearchQuery.trim().toLowerCase();
    return workspaces.filter((w) => (w.name || '').toLowerCase().includes(q));
  }, [workspaces, wsSearchQuery]);

  // Keep portaled workspace dropdown positioned exactly below menuRef
  useEffect(() => {
    if (!isWsDropdownOpen) return;
    const updateDropdownPos = () => {
      if (!menuRef.current) return;
      const rect = menuRef.current.getBoundingClientRect();
      setWsDropdownPos({
        top: Math.round(rect.bottom + 6),
        left: Math.round(rect.left),
        minWidth: Math.max(Math.round(rect.width), 260),
      });
    };
    updateDropdownPos();
    window.addEventListener('resize', updateDropdownPos);
    window.addEventListener('scroll', updateDropdownPos, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPos);
      window.removeEventListener('scroll', updateDropdownPos, true);
    };
  }, [isWsDropdownOpen]);

  const showTooltip = (e, text, badge = null) => {
    if (!text) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setRailTooltip({
      text,
      badge,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideTooltip = () => {
    setRailTooltip(null);
  };

  // Close tooltip on any scroll or window resize
  useEffect(() => {
    if (!railTooltip) return;
    const handleDismiss = () => setRailTooltip(null);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [railTooltip]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedMenu = menuRef.current && menuRef.current.contains(event.target);
      const clickedDropdown = wsDropdownRef.current && wsDropdownRef.current.contains(event.target);
      if (!clickedMenu && !clickedDropdown) {
        setIsWsDropdownOpen(false);
        setIsWsActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // Keyboard navigation: Escape key closes menus / mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isWsDropdownOpen) setIsWsDropdownOpen(false);
        if (isWsActionsOpen) setIsWsActionsOpen(false);
        if (isMobileOpen && onCloseMobile) onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWsDropdownOpen, isWsActionsOpen, isMobileOpen, onCloseMobile]);

  const { hasPermission, userRole } = usePermissions();

  const isOwner =
    (typeof userRole === 'string' ? userRole : userRole?.name)?.toLowerCase() === 'owner' ||
    (typeof userRole === 'string' ? userRole : userRole?.name)?.toLowerCase() === 'super admin' ||
    (activeWorkspace?.role_name || activeWorkspace?.role)?.toLowerCase() === 'owner' ||
    (activeWorkspace?.role_name || activeWorkspace?.role)?.toLowerCase() === 'super admin';

  const roleName = (typeof userRole === 'string' ? userRole : userRole?.name || activeWorkspace?.role_name || activeWorkspace?.role || '')?.toLowerCase();
  const isMemberOrBelow = ['team member', 'member', 'viewer', 'guest'].includes(roleName);

  const canCreateBoard = isOwner || hasPermission('project.create');
  const canEditWs = !isMemberOrBelow && (isOwner || hasPermission('workspace.edit'));
  const canCreateWs = isOwner || hasPermission('workspace.create') || hasPermission('workspace.edit');
  const canDeleteWs = isOwner || hasPermission('workspace.delete');
  const canViewRoadmap = isOwner || hasPermission('project.view') || hasPermission('task.view');
  const canViewSprint = isOwner || hasPermission('project.view') || hasPermission('task.view');
  const canViewIssues = isOwner || hasPermission('task.view');
  const canViewActivity = isOwner || hasPermission('activity.view');
  const canViewMembers = !isMemberOrBelow && (isOwner || hasPermission('member.invite') || hasPermission('member.remove') || hasPermission('member.assign_role') || hasPermission('role.view'));
  const canViewReports = !isMemberOrBelow && (isOwner || hasPermission('report.view_team') || hasPermission('report.view_all') || hasPermission('report.export') || hasPermission('role.view'));
  const canViewDailyTracker = isOwner || hasPermission('daily_tracker.view');
  const canViewSettings = !isMemberOrBelow && (isOwner || hasPermission('workspace.edit') || hasPermission('workspace.edit_settings'));

  const openRenameDialog = () => {
    setWorkspaceRenameValue(activeWorkspace?.name || '');
    setIsRenameDialogOpen(true);
    setIsWsActionsOpen(false);
  };

  const handleRenameConfirm = async (value) => {
    if (!value || !onRenameWorkspace) return;
    await onRenameWorkspace(value);
    setIsRenameDialogOpen(false);
  };

  const location = useLocation();

  // Explicit route active checks to prevent conflicting active highlights
  const isDashboardActive =
    location.pathname === `/w/${activeWorkspace?.id}/home` ||
    location.pathname === `/w/${activeWorkspace?.id}` ||
    location.pathname === `/w/${activeWorkspace?.id}/`;
  const isRoadmapActive = location.pathname.endsWith('/calendar') || location.pathname.endsWith('/roadmap');
  const isSprintActive = location.pathname.endsWith('/board') || location.pathname.endsWith('/sprint');
  const isIssuesActive = location.pathname.endsWith('/list') || location.pathname.endsWith('/issues');
  const isReportActive = location.pathname.endsWith('/reports');
  const isReleasesActive =
    !location.pathname.includes('/settings') &&
    !location.pathname.includes('/profile') &&
    !location.pathname.includes('/account') &&
    (location.pathname === `/w/${activeWorkspace?.id}/activity` || location.pathname.endsWith('/activity'));
  const isWorkspaceMembersActive =
    !location.pathname.includes('/settings') &&
    (location.pathname.endsWith('/members') || location.pathname.endsWith('/workspace-members'));
  const isCompanyMembersActive =
    !location.pathname.includes('/settings') && location.pathname.endsWith('/company-members');
  const isDailyTrackerActive = location.pathname.endsWith('/daily-tracker');
  const isSettingsActive = location.pathname.includes('/settings');
  const isAccountSettingsActive = location.pathname.includes('/account');

  // Determine current active project board ID fallback (priority: active board -> pinned board -> last visited board -> first board)
  const pinnedBoardId = (() => {
    try {
      return localStorage.getItem(`taskflow_pinned_board_${activeWorkspace?.id}`);
    } catch {
      return null;
    }
  })();
  const effectivePinnedBoardId =
    boards.some((b) => String(b.id) === String(pinnedBoardId))
      ? Number(pinnedBoardId)
      : null;

  const lastVisitedBoardId = (() => {
    try {
      return localStorage.getItem(`taskflow_last_board_${activeWorkspace?.id}`);
    } catch {
      return null;
    }
  })();

  const effectiveLastBoardId =
    boards.some((b) => String(b.id) === String(lastVisitedBoardId))
      ? Number(lastVisitedBoardId)
      : null;

  const effectiveActiveBoardId =
    boards.some((b) => Number(b.id) === Number(activeBoardId))
      ? Number(activeBoardId)
      : null;
  const fallbackBoardId = effectiveActiveBoardId || effectivePinnedBoardId || effectiveLastBoardId || boards[0]?.id;

  return (
    <>
      {/*  Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 bg-text-primary/40 z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside
        aria-label="Workspace navigation"
        className={`h-screen flex shrink-0 select-none overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileOpen
          ? 'fixed inset-y-0 left-0 z-50 shadow-2xl translate-x-0 lg:relative lg:z-20'
          : 'fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0 lg:z-20'
          }`}
      >
        {/* ======================================================== */}
        {/* RAIL 1: DEEP VIBRANT BRAND BLUE RAIL (Matching Reference) */}
        {/* ======================================================== */}
        <div className="w-16 bg-primary flex flex-col items-center py-4 px-0 shrink-0 z-10">
          {/* Logo Container at Top */}
          <Link
            to={activeWorkspace ? `/w/${activeWorkspace.id}/home` : '/'}
            className="w-10 h-10 rounded-full bg-primary bg-white/20 hover:bg-white/30 border border-white/30 flex items-center justify-center text-white font-black text-xl shadow-inner transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
            aria-label="TaskFlow Home"
            onMouseEnter={(e) => showTooltip(e, 'TaskFlow')}
            onMouseLeave={hideTooltip}
            onClick={hideTooltip}
          >
            <Trello className="w-5.5 h-5.5" />
          </Link>

          {/* Expand Sidebar Toggle Button (At TOP of Rail 1 when collapsed) */}
          {isCollapsed && (
            <button
              onClick={(e) => {
                hideTooltip();
                onToggleCollapse(e);
              }}
              aria-label="Expand Sidebar"
              onMouseEnter={(e) => showTooltip(e, 'Expand Sidebar', 'Ctrl+B')}
              onMouseLeave={hideTooltip}
              className="w-10 h-10 rounded-full bg-primary bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 mt-3 hidden lg:flex"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Divider between Logo/Toggle and Workspaces */}
          <div className="w-8 h-px bg-white/20 my-3 shrink-0" />

          {/* Workspace Circles Stack (Pure circles with zero clipping on any side) */}
          <div
            onScroll={hideTooltip}
            className="flex-1 overflow-y-auto space-y-2.5 w-full flex flex-col items-center no-scrollbar py-1"
          >
            {workspaces.map((ws) => {
              const isSelected = activeWorkspace?.id === ws.id;
              const wsIcon = ws.icon_url || ws.settings?.icon_url;
              return (
                <div key={ws.id} className="relative w-full flex items-center justify-center group shrink-0">
                  {/* Active selection capsule pill on far left edge */}
                  {isSelected ? (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-xs" />
                  ) : (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2 bg-white/50 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        hideTooltip();
                        onSelectWorkspace(ws);
                        navigate(`/w/${ws.id}/home`);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      onMouseEnter={(e) =>
                        showTooltip(
                          e,
                          ws.name,
                          ws.assigned_tasks_count > 0
                            ? `${ws.assigned_tasks_count} assigned task${ws.assigned_tasks_count > 1 ? 's' : ''}`
                            : (isSelected ? 'Active' : null)
                        )
                      }
                      onMouseLeave={hideTooltip}
                      aria-label={`${ws.name}${ws.assigned_tasks_count > 0 ? ` (${ws.assigned_tasks_count} assigned tasks)` : ''}`}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer overflow-hidden ${
                        wsIcon
                          ? isSelected
                            ? 'bg-white shadow-md ring-2 ring-white'
                            : 'bg-white shadow-xs ring-2 ring-white/50 hover:ring-white active:scale-95'
                          : isSelected
                            ? 'bg-white text-primary shadow-md font-black ring-2 ring-white/60'
                            : 'bg-white/15 text-white/90 hover:text-white hover:bg-white/25 active:scale-95'
                      }`}
                    >
                      {wsIcon ? (
                        <img
                          src={getFileUrl(wsIcon)}
                          alt={ws.name}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextElementSibling) {
                              e.target.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <span className={wsIcon ? 'hidden' : 'flex items-center justify-center'}>
                        {ws.name.charAt(0).toUpperCase()}
                      </span>
                    </button>
                    {ws.assigned_tasks_count > 0 && (
                      <span
                        className="absolute -top-1 -right-1 z-20 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[10px] font-black flex items-center justify-center ring-2 ring-primary shadow-xs pointer-events-none"
                        title={`${ws.assigned_tasks_count} assigned task${ws.assigned_tasks_count > 1 ? 's' : ''}`}
                      >
                        {ws.assigned_tasks_count > 99 ? '99+' : ws.assigned_tasks_count}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick Add Workspace Button (+) */}
            {canCreateWs && (
              <div className="w-full flex items-center justify-center pt-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    hideTooltip();
                    onCreateWorkspaceClick();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  onMouseEnter={(e) => showTooltip(e, 'Create Workspace')}
                  onMouseLeave={hideTooltip}
                  aria-label="Create Workspace"
                  className="w-10 h-10 rounded-full bg-primary border-2 border-dashed border-white/40 hover:border-white text-white/80 hover:text-white hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RAIL 2: LIGHT WORKSPACE NAVIGATION PANEL (Smooth sliding transition) */}
        {/* ======================================================== */}
        <div
          className={`bg-app flex flex-col h-full overflow-hidden shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed
            ? 'w-0 opacity-0 pointer-events-none'
            : 'w-60 lg:w-64 opacity-100'
            }`}
        >
          {/* Header: #WorkspaceName with actions dropdown */}
          <div className="h-16 px-4 flex items-center justify-between shrink-0">
            <div className="relative flex-1 min-w-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  if (!isWsDropdownOpen && menuRef.current) {
                    const rect = menuRef.current.getBoundingClientRect();
                    setWsDropdownPos({
                      top: Math.round(rect.bottom + 6),
                      left: Math.round(rect.left),
                      minWidth: Math.max(Math.round(rect.width), 260),
                    });
                  }
                  setIsWsDropdownOpen(!isWsDropdownOpen);
                  setWsSearchQuery('');
                }}
                className="w-full flex items-center justify-between gap-2 text-left group cursor-pointer focus:outline-none"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {activeWorkspace?.icon_url || activeWorkspace?.settings?.icon_url ? (
                      <img
                        src={getFileUrl(activeWorkspace.icon_url || activeWorkspace.settings?.icon_url)}
                        alt={activeWorkspace.name}
                        className="w-5 h-5 rounded-md object-cover shrink-0 ring-1 ring-border/50 bg-white"
                      />
                    ) : (
                      <span className="text-xl font-black text-primary shrink-0">#</span>
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[15px] sm:text-base font-extrabold text-text-primary truncate tracking-tight group-hover:text-primary transition-colors">
                        {activeWorkspace?.name || 'Workspace'}
                      </span>
                      {activeWorkspace?.assigned_tasks_count > 0 && (
                        <span
                          className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-danger text-white shrink-0 shadow-2xs"
                          title={`${activeWorkspace.assigned_tasks_count} assigned task${activeWorkspace.assigned_tasks_count > 1 ? 's' : ''}`}
                        >
                          {activeWorkspace.assigned_tasks_count > 99 ? '99+' : activeWorkspace.assigned_tasks_count}
                        </span>
                      )}
                    </div>
                  </div>
                  {activeWorkspace?.description && (
                    <span className="text-[11px] text-text-muted truncate pl-5">
                      {activeWorkspace.description}
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 shrink-0 ${isWsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Workspace Switcher & Actions Dropdown with Sassy Animation (Portaled to prevent sidebar overflow clipping) */}
              {isWsDropdownOpen && typeof document !== 'undefined' && createPortal(
                <div
                  ref={wsDropdownRef}
                  role="listbox"
                  className="fixed bg-surface border border-border/80 rounded-2xl shadow-2xl z-[9999] p-2 space-y-1.5 animate-sassy-dropdown-left overflow-hidden min-w-[280px] w-max max-w-[min(480px,calc(100vw-2rem))]"
                  style={{
                    top: `${wsDropdownPos.top}px`,
                    left: `${wsDropdownPos.left}px`,
                    minWidth: `${wsDropdownPos.minWidth}px`,
                  }}
                >
                  {/* Search bar inside dropdown */}
                  <div className="px-1 pt-1 pb-1">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={wsSearchQuery}
                        onChange={(e) => setWsSearchQuery(e.target.value)}
                        placeholder="Search workspaces..."
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface-muted border border-border/60 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      />
                      {wsSearchQuery && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWsSearchQuery('');
                          }}
                          className="absolute right-2 p-0.5 text-text-muted hover:text-text-primary rounded-full hover:bg-surface transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable list showing full workspace names without text wrapping */}
                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5">
                    {filteredWorkspaces.length > 0 ? (
                      filteredWorkspaces.map((ws) => {
                        const isSelected = activeWorkspace?.id === ws.id;
                        const wsIcon = ws.icon_url || ws.settings?.icon_url;
                        return (
                          <button
                            key={ws.id}
                            type="button"
                            onClick={() => {
                              onSelectWorkspace(ws);
                              setIsWsDropdownOpen(false);
                              setWsSearchQuery('');
                              if (onCloseMobile) onCloseMobile();
                            }}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-left transition-all cursor-pointer ${isSelected
                              ? 'bg-primary-tint text-primary font-bold'
                              : 'text-text-primary hover:bg-surface-muted'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {wsIcon ? (
                                <img
                                  src={getFileUrl(wsIcon)}
                                  alt={ws.name}
                                  className="w-5 h-5 rounded-md object-cover shrink-0 ring-1 ring-border/40 bg-white"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-md bg-primary-tint text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                                  {ws.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="whitespace-nowrap font-medium text-xs sm:text-sm">
                                {ws.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {ws.assigned_tasks_count > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-danger/10 text-danger border border-danger/25"
                                  title={`${ws.assigned_tasks_count} assigned task${ws.assigned_tasks_count > 1 ? 's' : ''}`}
                                >
                                  {ws.assigned_tasks_count > 99 ? '99+' : ws.assigned_tasks_count}
                                </span>
                              )}
                              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-xs text-text-muted text-center italic">
                        No workspaces found
                      </div>
                    )}
                  </div>

                  {canCreateWs && (
                    <div className="pt-1.5 mt-1 border-t border-border/60 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsWsDropdownOpen(false);
                          onCreateWorkspaceClick();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-bold text-primary hover:bg-primary-tint rounded-xl text-left transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>New Workspace</span>
                      </button>
                    </div>
                  )}
                </div>,
                document.body
              )}
            </div>

            {/* Collapse toggle button on Desktop */}
            <button
              onClick={onToggleCollapse}
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-xl transition-colors cursor-pointer hidden lg:flex items-center justify-center min-h-[34px] min-w-[34px]"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>

            {/* Close button on Mobile */}
            <button
              onClick={onCloseMobile}
              title="Close navigation"
              aria-label="Close navigation"
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-xl transition-colors cursor-pointer lg:hidden flex items-center justify-center min-h-[36px] min-w-[36px]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Navigation Links (Matching Reference UI labels & icons) */}
          <nav aria-label="Primary sections" className="p-3 space-y-1 shrink-0 border-b border-border/60">
            {/* Dashboard */}
            <NavLink
              to={`/w/${activeWorkspace?.id}/home`}
              onClick={() => { if (onCloseMobile) onCloseMobile(); }}
              className={() =>
                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${isDashboardActive
                  ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                }`
              }
            >
              <LayoutGrid className="w-4.5 h-4.5 shrink-0" />
              <span>Dashboard</span>
            </NavLink>

            {/* Roadmap / Calendar */}
            {canViewRoadmap && (
              <NavLink
                to={
                  fallbackBoardId
                    ? `/w/${activeWorkspace?.id}/p/${fallbackBoardId}/calendar`
                    : `/w/${activeWorkspace?.id}/roadmap`
                }
                onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                className={() =>
                  `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${isRoadmapActive
                    ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  }`
                }
              >
                <Calendar className="w-4.5 h-4.5 shrink-0" />
                <span>Roadmap</span>
              </NavLink>
            )}

            {/* Report */}
            {canViewReports && (
              <NavLink
                to={`/w/${activeWorkspace?.id}/reports`}
                onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                className={() =>
                  `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${isReportActive
                    ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  }`
                }
              >
                <BarChart3 className="w-4.5 h-4.5 shrink-0" />
                <span>Report</span>
              </NavLink>
            )}

            {/* Issues / List */}
            {canViewIssues && (
              <NavLink
                to={
                  fallbackBoardId
                    ? `/w/${activeWorkspace?.id}/p/${fallbackBoardId}/list`
                    : `/w/${activeWorkspace?.id}/list`
                }
                onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                className={() =>
                  `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${isIssuesActive
                    ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  }`
                }
              >
                <CheckSquare className="w-4.5 h-4.5 shrink-0" />
                <span>Issues</span>
              </NavLink>
            )}

            {/* Releases / Activity */}
            {canViewActivity && (
              <NavLink
                to={`/w/${activeWorkspace?.id}/activity`}
                onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                className={() =>
                  `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${isReleasesActive
                    ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  }`
                }
              >
                <Activity className="w-4.5 h-4.5 shrink-0" />
                <span>Releases</span>
              </NavLink>
            )}

            {/* Workspace Members */}
            {canViewMembers && (
              <NavLink
                to={`/w/${activeWorkspace?.id}/members`}
                onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                className={() =>
                  `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${isWorkspaceMembersActive
                    ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  }`
                }
              >
                <Users className="w-4.5 h-4.5 shrink-0" />
                <span>Workspace Members</span>
              </NavLink>
            )}

            {/* Workspace setting */}
            {canViewSettings && (
              <NavLink
                to={`/w/${activeWorkspace?.id}/settings/general`}
                onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                className={() =>
                  `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${isSettingsActive
                    ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  }`
                }
              >
                <Settings className="w-4.5 h-4.5 shrink-0" />
                <span>Workspace setting</span>
              </NavLink>
            )}
          </nav>

          {/* Boards List Section */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Boards & Projects
              </span>
              {canCreateBoard && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateBoardClick();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title="Create new board"
                  aria-label="Create new board"
                  className="p-1.5 text-text-secondary hover:text-primary bg-surface-muted hover:bg-primary-tint rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              {boards.length === 0 ? (
                <p className="text-xs text-text-muted italic px-2 py-2">No boards yet.</p>
              ) : (
                boards.map((b) => {
                  const dotColor = getThemeDotClass(b.background_color);
                  const bUnread = byBoardUnread?.[b.id] || byBoardUnread?.[String(b.id)] || 0;
                  return (
                    <NavLink
                      key={b.id}
                      to={`/w/${activeWorkspace?.id}/p/${b.id}/board`}
                      onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium text-left transition-all cursor-pointer ${isActive
                          ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                        }`
                      }
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 border border-border-strong`} />
                      <span className="truncate flex-1">{b.name}</span>
                      {bUnread > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full shrink-0">
                          {bUnread}
                        </span>
                      )}
                    </NavLink>
                  );
                })
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
              {/* Members (Company Directory) */}
              {canViewMembers && (
                <NavLink
                  to={`/w/${activeWorkspace?.id}/company-members`}
                  onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                  className={() =>
                    `w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] font-medium transition-colors cursor-pointer ${isCompanyMembersActive
                      ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Users className="w-4.5 h-4.5 text-primary shrink-0" />
                    <span>Members</span>
                  </span>
                </NavLink>
              )}

              {/* Daily Tracker */}
              {canViewDailyTracker && (
                <NavLink
                  to={`/w/${activeWorkspace?.id}/daily-tracker`}
                  onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                  className={() =>
                    `w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] font-medium transition-colors cursor-pointer ${isDailyTrackerActive
                      ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <CalendarCheck className="w-4.5 h-4.5 text-primary shrink-0" />
                    <span>Daily Tracker</span>
                  </span>
                </NavLink>
              )}

              <NavLink
                to={`/w/${activeWorkspace?.id}/notifications`}
                onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                className={({ isActive }) =>
                  `w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] font-medium transition-colors cursor-pointer ${isActive
                    ? 'bg-primary-tint text-primary font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  }`
                }
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Bell className="w-4.5 h-4.5 text-primary shrink-0" />
                  <span>Notifications</span>
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to={`/w/${activeWorkspace?.id}/archive`}
                onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                className={({ isActive }) =>
                  `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-colors cursor-pointer ${isActive
                    ? 'bg-warning-tint text-warning font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  }`
                }
              >
                <Archive className="w-4.5 h-4.5 text-warning shrink-0" />
                <span className="truncate">Archived</span>
              </NavLink>
            </div>
          </div>

          {/* Settings in Rail 2 */}
          <div className="px-3 pb-3 shrink-0 space-y-1 border-t border-border/50 pt-2">

            <NavLink
              to={`/w/${activeWorkspace?.id}/account`}
              onClick={() => { if (onCloseMobile) onCloseMobile(); }}
              className={() =>
                `w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13.5px] sm:text-sm font-semibold transition-all cursor-pointer ${isAccountSettingsActive
                  ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                }`
              }
            >
              <User className="w-4.5 h-4.5 shrink-0" />
              <span>Account Settings</span>
            </NavLink>
          </div>
        </div>

        <PromptDialog
          isOpen={isRenameDialogOpen}
          title="Rename workspace"
          label="Workspace name"
          placeholder="Enter workspace name"
          defaultValue={workspaceRenameValue}
          confirmText="Save"
          onConfirm={handleRenameConfirm}
          onCancel={() => setIsRenameDialogOpen(false)}
        />

        {/* Theme-matched Rail Tooltip Popup (Instant, Smooth slide animation, Zero delay) */}
        {railTooltip && typeof document !== 'undefined' && createPortal(
          <div
            role="tooltip"
            className="fixed z-[9999] pointer-events-none animate-tooltip-rail"
            style={{
              top: `${railTooltip.top}px`,
              left: `${railTooltip.left}px`,
            }}
          >
            <div className="relative flex items-center gap-2 bg-surface text-text-primary px-3 py-1.5 rounded-xl border border-border shadow-xl whitespace-nowrap">
              {/* Subtle caret indicator pointing left towards the workspace circle */}
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-surface border-l border-b border-border" />
              <span className="text-xs font-semibold tracking-tight text-text-primary max-w-[280px] sm:max-w-[360px] truncate">
                {railTooltip.text}
              </span>
              {railTooltip.badge && (
                <span className="text-[10px] font-bold tracking-wider uppercase bg-primary-tint text-primary px-1.5 py-0.5 rounded-md">
                  {railTooltip.badge}
                </span>
              )}
            </div>
          </div>,
          document.body
        )}
      </aside>
    </>
  );
}
