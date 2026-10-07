import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../context/PermissionContext';
import { useSocket } from '../../context/SocketProvider';
import Avatar from '../ui/Avatar';
import PromptDialog from '../shared/PromptDialog';
import { getThemeDotClass } from '../../lib/palettes';
import {
  Trello,
  Plus,
  Briefcase,
  LayoutGrid,
  LogOut,
  ChevronDown,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Archive,
  Trash2,
  Pencil,
  Settings,
  User,
  Bell,
  Home,
  Users,
  Activity,
  BarChart3
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
  const { user, logoutUser } = useAuth();
  const { unreadCount, byBoardUnread } = useSocket();
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isWsActionsOpen, setIsWsActionsOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [workspaceRenameValue, setWorkspaceRenameValue] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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

  const { hasPermission } = usePermissions();
  const canCreateBoard = hasPermission('board.create') || hasPermission('project.create');
  const canEditWs = hasPermission('workspace.edit_settings');
  const canDeleteWs = hasPermission('workspace.delete');

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

  const handleSelectBoardMobile = (id) => {
    onSelectBoard(id);
    if (onCloseMobile) onCloseMobile();
  };

  // Minimized Sidebar on Desktop
  if (isCollapsed) {
    return (
      <aside className="hidden lg:flex w-16 h-screen bg-surface border-r border-border flex-col items-center py-3 shrink-0 select-none z-20 transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          title="Expand Sidebar"
          aria-label="Expand Sidebar"
          className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm text-white hover:bg-primary-hover active:bg-primary-active transition-colors cursor-pointer shrink-0 mb-4"
        >
          <Trello className="w-5 h-5 shrink-0" />
        </button>

        <Link
          to={`/w/${activeWorkspace?.id}/home`}
          className="mb-4 flex flex-col items-center shrink-0"
          title={activeWorkspace?.name || 'Workspace'}
        >
          <div className="w-9 h-9 rounded-xl bg-surface-muted border border-border flex items-center justify-center text-primary font-bold text-xs shadow-xs hover:border-primary transition-colors">
            <Briefcase className="w-4 h-4 shrink-0" />
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto space-y-3 w-full px-2.5 py-2">
          <NavLink
            to={`/w/${activeWorkspace?.id}/home`}
            title="Home / My Work"
            aria-label="Home / My Work"
            className={({ isActive }) =>
              `w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-primary-tint text-primary border-2 border-primary shadow-xs font-semibold'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border'
              }`
            }
          >
            <Home className="w-4 h-4" />
          </NavLink>

          <NavLink
            to={`/w/${activeWorkspace?.id}/members`}
            title="Members"
            aria-label="Members"
            className={({ isActive }) =>
              `w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-primary-tint text-primary border-2 border-primary shadow-xs font-semibold'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border'
              }`
            }
          >
            <Users className="w-4 h-4" />
          </NavLink>

          <NavLink
            to={`/w/${activeWorkspace?.id}/activity`}
            title="Activity Feed"
            aria-label="Activity Feed"
            className={({ isActive }) =>
              `w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-primary-tint text-primary border-2 border-primary shadow-xs font-semibold'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border'
              }`
            }
          >
            <Activity className="w-4 h-4" />
          </NavLink>

          <NavLink
            to={`/w/${activeWorkspace?.id}/reports`}
            title="Reports"
            aria-label="Reports"
            className={({ isActive }) =>
              `w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-primary-tint text-primary border-2 border-primary shadow-xs font-semibold'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border'
              }`
            }
          >
            <BarChart3 className="w-4 h-4" />
          </NavLink>

          <div className="w-6 h-px bg-border mx-auto my-1" />

          {boards.map((b) => {
            const bUnread = byBoardUnread?.[b.id] || byBoardUnread?.[String(b.id)] || 0;
            return (
              <NavLink
                key={b.id}
                to={`/w/${activeWorkspace?.id}/p/${b.id}/board`}
                title={bUnread > 0 ? `${b.name} (${bUnread} unread)` : b.name}
                aria-label={b.name}
                className={({ isActive }) =>
                  `relative w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-primary-tint text-primary-text border-2 border-primary shadow-xs font-semibold'
                      : 'bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border'
                  }`
                }
              >
                <div className={`w-3 h-3 rounded-full ${getThemeDotClass(b.background_color)} shrink-0 border border-border-strong`} />
                {bUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-surface animate-pulse" />
                )}
              </NavLink>
            );
          })}
          <NavLink
            to={`/w/${activeWorkspace?.id}/notifications`}
            title="Notifications Hub"
            aria-label="Notifications Hub"
            className={({ isActive }) =>
              `relative w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-primary-tint text-primary border-2 border-primary font-semibold'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border'
              }`
            }
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full ring-2 ring-surface animate-pulse" />
            )}
          </NavLink>
          <NavLink
            to={`/w/${activeWorkspace?.id}/archive`}
            title="View Archived"
            aria-label="View Archived"
            className={({ isActive }) =>
              `w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-warning-tint text-warning border-2 border-warning font-semibold'
                  : 'bg-surface hover:bg-surface-muted text-warning-text border border-border'
              }`
            }
          >
            <Archive className="w-4 h-4" />
          </NavLink>
        </div>

        <div className="pt-3 border-t border-border flex flex-col items-center gap-2 shrink-0 w-full px-2">
          <NavLink
            to={`/w/${activeWorkspace?.id}/profile`}
            title="My Profile"
            aria-label="My Profile"
            className={({ isActive }) =>
              `w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                isActive
                  ? 'bg-primary-tint text-primary border-primary'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary hover:text-primary border border-border'
              }`
            }
          >
            <User className="w-4 h-4" />
          </NavLink>
          <NavLink
            to={`/w/${activeWorkspace?.id}/settings/general`}
            title="Settings"
            aria-label="Settings"
            className={({ isActive }) =>
              `w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                isActive
                  ? 'bg-primary-tint text-primary border-primary'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border'
              }`
            }
          >
            <Settings className="w-4 h-4" />
          </NavLink>
          <button
            onClick={logoutUser}
            title="Log Out"
            aria-label="Log Out"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface hover:bg-danger-tint text-text-secondary hover:text-danger-text border border-border transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleCollapse}
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-xl transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 bg-text-primary/25 z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`w-72 h-screen bg-surface border-r border-border flex flex-col shrink-0 select-none transition-all duration-300 overflow-hidden ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 shadow-xl translate-x-0 lg:relative lg:z-20'
            : 'fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0 lg:z-20'
        }`}
      >
        {/* Top Header / Branding + Collapse Toggle */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-xs text-white shrink-0">
              <Trello className="w-5 h-5" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-text-primary truncate">
              TaskFlow
            </span>
          </div>

          <button
            onClick={onToggleCollapse}
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-xl transition-colors cursor-pointer shrink-0 hidden lg:block"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace Selector Dropdown */}
        <div className="p-4 border-b border-border shrink-0">
          <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">
            Current Workspace
          </label>
          <div className="relative" ref={menuRef}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsWsDropdownOpen(!isWsDropdownOpen);
                  setIsWsActionsOpen(false);
                }}
                className="min-w-0 flex-1 flex items-center justify-between p-2.5 bg-surface hover:bg-surface-hover active:bg-surface-active border border-border hover:border-border-strong rounded-xl text-left transition-colors cursor-pointer min-h-[40px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary-tint text-primary-text border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                    {activeWorkspace?.name?.charAt(0)?.toUpperCase() || 'W'}
                  </div>
                  <span className="text-xs font-bold text-text-primary truncate">
                    {activeWorkspace?.name || 'Select Workspace'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isWsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {activeWorkspace && (canEditWs || canDeleteWs) && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWsActionsOpen(!isWsActionsOpen);
                      setIsWsDropdownOpen(false);
                    }}
                    className="p-2.5 bg-surface hover:bg-surface-hover border border-border hover:border-border-strong rounded-xl text-text-secondary hover:text-text-primary transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                    title="Workspace settings & actions"
                    aria-label="Workspace settings & actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {isWsActionsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-lg z-30 py-1 text-text-primary">
                      {canEditWs && (
                        <>
                          <button
                            type="button"
                            onClick={openRenameDialog}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-text-primary hover:bg-surface-muted transition-colors cursor-pointer text-left"
                          >
                            <Pencil className="w-3.5 h-3.5 text-text-secondary" />
                            Rename Workspace
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsWsActionsOpen(false);
                              if (onArchiveWorkspace) onArchiveWorkspace();
                            }}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-warning-text hover:bg-warning-tint transition-colors cursor-pointer text-left"
                          >
                            <Archive className="w-3.5 h-3.5 text-warning" />
                            Archive Workspace
                          </button>
                        </>
                      )}
                      {canDeleteWs && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsWsActionsOpen(false);
                            if (onDeleteWorkspace) onDeleteWorkspace();
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-danger-text hover:bg-danger-tint transition-colors cursor-pointer text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-danger" />
                          Delete Workspace
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Workspace Selection Dropdown */}
            {isWsDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto p-1.5 space-y-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      onSelectWorkspace(ws);
                      setIsWsDropdownOpen(false);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      activeWorkspace?.id === ws.id
                        ? 'bg-primary-tint text-primary-text border border-primary/20 font-semibold'
                        : 'text-text-primary hover:bg-surface-muted'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-surface-muted text-text-primary flex items-center justify-center font-bold text-[10px] shrink-0 border border-border">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate flex-1">{ws.name}</span>
                  </button>
                ))}
                {canEditWs && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsWsDropdownOpen(false);
                      onCreateWorkspaceClick();
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary-tint transition-colors border border-dashed border-primary/30 mt-1 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Create Workspace
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Primary Workspace Navigation Links */}
        <div className="px-4 pt-3 pb-1 space-y-1 shrink-0 border-b border-border">
          <NavLink
            to={`/w/${activeWorkspace?.id}/home`}
            onClick={() => { if (onCloseMobile) onCloseMobile(); }}
            className={({ isActive }) =>
              `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
                isActive
                  ? 'bg-primary-tint text-primary-text border border-primary/20 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
              }`
            }
          >
            <Home className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate">Home / My Work</span>
          </NavLink>

          <NavLink
            to={`/w/${activeWorkspace?.id}/members`}
            onClick={() => { if (onCloseMobile) onCloseMobile(); }}
            className={({ isActive }) =>
              `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
                isActive
                  ? 'bg-primary-tint text-primary-text border border-primary/20 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
              }`
            }
          >
            <Users className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate">Members</span>
          </NavLink>

          <NavLink
            to={`/w/${activeWorkspace?.id}/activity`}
            onClick={() => { if (onCloseMobile) onCloseMobile(); }}
            className={({ isActive }) =>
              `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
                isActive
                  ? 'bg-primary-tint text-primary-text border border-primary/20 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
              }`
            }
          >
            <Activity className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate">Activity Feed</span>
          </NavLink>

          <NavLink
            to={`/w/${activeWorkspace?.id}/reports`}
            onClick={() => { if (onCloseMobile) onCloseMobile(); }}
            className={({ isActive }) =>
              `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
                isActive
                  ? 'bg-primary-tint text-primary-text border border-primary/20 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
              }`
            }
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate">Reports</span>
          </NavLink>
        </div>

        {/* Boards List Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-primary" />
              Boards
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
                className="p-1 text-text-secondary hover:text-text-primary bg-surface-muted hover:bg-surface-hover border border-border rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {boards.length === 0 ? (
              <p className="text-xs text-text-muted italic px-2 py-3">No boards yet. Create one!</p>
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
                      `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer min-h-[40px] ${
                        isActive
                          ? 'bg-primary-tint text-primary-text font-semibold border border-primary/20 shadow-xs'
                          : 'text-text-primary hover:bg-surface-muted border border-transparent'
                      }`
                    }
                  >
                    <div className={`w-3.5 h-3.5 rounded-full ${dotColor} shrink-0 border border-border-strong`} />
                    <span className="truncate flex-1">{b.name}</span>
                    {bUnread > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-white rounded-full shrink-0 shadow-2xs">
                        {bUnread > 99 ? '99+' : bUnread}
                      </span>
                    )}
                  </NavLink>
                );
              })
            )}
          </div>

          <div className="mt-4 space-y-1.5 pt-3 border-t border-border">
            <NavLink
              to={`/w/${activeWorkspace?.id}/notifications`}
              onClick={() => { if (onCloseMobile) onCloseMobile(); }}
              className={({ isActive }) =>
                `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
                  isActive
                    ? 'bg-primary-tint text-primary-text border border-primary/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                }`
              }
            >
              <span className="flex items-center gap-2.5 truncate">
                <Bell className="w-4 h-4 shrink-0 text-primary" />
                <span>Notifications</span>
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-white rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>

            <NavLink
              to={`/w/${activeWorkspace?.id}/archive`}
              onClick={() => { if (onCloseMobile) onCloseMobile(); }}
              className={({ isActive }) =>
                `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
                  isActive
                    ? 'bg-warning-tint text-warning-text border border-warning/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                }`
              }
            >
              <Archive className="w-4 h-4 shrink-0 text-warning" />
              <span className="truncate">Archived Items</span>
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

        {/* Bottom Navigation Footer: My Profile, Settings & Logout */}
        <div className="p-3.5 border-t border-border bg-surface-muted/60 flex flex-col gap-2 shrink-0">
          <NavLink
            to={`/w/${activeWorkspace?.id}/profile`}
            onClick={() => { if (onCloseMobile) onCloseMobile(); }}
            className={({ isActive }) =>
              `w-full flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all group min-h-[44px] text-left ${
                isActive
                  ? 'bg-primary-tint text-primary-text border-primary/40 font-semibold'
                  : 'bg-surface hover:bg-primary-tint/50 border-border hover:border-primary/30'
              }`
            }
            title="Open My Profile"
            aria-label="Open My Profile"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user?.name} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate group-hover:text-primary transition-colors">{user?.name}</p>
                <p className="text-[11px] text-text-secondary truncate">My Profile</p>
              </div>
            </div>
            <User className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors shrink-0" />
          </NavLink>

          <div className="flex items-center gap-1.5 pt-0.5">
            <NavLink
              to={`/w/${activeWorkspace?.id}/settings/general`}
              onClick={() => { if (onCloseMobile) onCloseMobile(); }}
              className={({ isActive }) =>
                `flex-1 flex items-center justify-center gap-2 py-2 px-3 border rounded-xl text-xs font-semibold cursor-pointer transition-colors min-h-[40px] ${
                  isActive
                    ? 'bg-primary-tint text-primary-text border-primary/40 font-semibold'
                    : 'bg-surface hover:bg-surface-hover active:bg-surface-active border-border text-text-primary'
                }`
              }
            >
              <Settings className="w-3.5 h-3.5 text-primary" />
              Settings
            </NavLink>

            <button
              type="button"
              onClick={logoutUser}
              title="Log Out"
              aria-label="Log Out"
              className="p-2 bg-surface hover:bg-danger-tint border border-border hover:border-danger/30 text-text-secondary hover:text-danger-text rounded-xl cursor-pointer transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
