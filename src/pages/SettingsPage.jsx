// client/src/pages/SettingsPage.jsx
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useParams, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Mail,
  Shield,
  SlidersHorizontal,
  Bell,
  Database,
  ShieldAlert,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../components/ui/Toast';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';

// Lazy-loaded tab components
const GeneralTab = lazy(() => import('./settings/tabs/GeneralTab'));
const MembersTab = lazy(() => import('./settings/tabs/MembersTab'));
const InvitationsTab = lazy(() => import('./settings/tabs/InvitationsTab'));
const RolesTab = lazy(() => import('./settings/tabs/RolesTab'));
const ProjectTab = lazy(() => import('./settings/tabs/ProjectTab'));
const NotificationsTab = lazy(() => import('./settings/tabs/NotificationsTab'));
const DataTab = lazy(() => import('./settings/tabs/DataTab'));
const SecurityLogTab = lazy(() => import('./settings/tabs/SecurityLogTab'));

export default function SettingsPage({
  tab: propTab,
  workspaces = [],
  activeWorkspace,
  onWorkspaceUpdated,
  onArchiveWorkspace,
  onDeleteWorkspace,
  onOpenInvite
}) {
  const { workspaceId, tab: routeTab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const [formDirty, setFormDirty] = useState(false);
  const { setDirty } = useUnsavedChanges();

  useEffect(() => {
    setDirty('settingsForm', formDirty);
    return () => setDirty('settingsForm', false);
  }, [formDirty, setDirty]);

  // Extract active tab: propTab > routeTab > pathname regex > fallback 'general'
  const pathMatch = location.pathname.match(/\/settings\/([^/?#]+)/);
  const pathTab = pathMatch ? pathMatch[1] : null;
  const tab = propTab || routeTab || pathTab || 'general';

  // Tab definitions with icons and permission requirements
  const allTabs = useMemo(
    () => [
      { id: 'general', label: 'General', icon: <Briefcase className="w-4 h-4" />, perm: null },
      { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" />, perm: null },
      { id: 'invitations', label: 'Invitations', icon: <Mail className="w-4 h-4" />, perm: 'member.invite' },
      { id: 'roles', label: 'Roles & Permissions', icon: <Shield className="w-4 h-4" />, perm: 'role.view' },
      { id: 'project', label: 'Project Defaults', icon: <SlidersHorizontal className="w-4 h-4" />, perm: null },
      { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, perm: null },
      { id: 'data', label: 'Data & Export', icon: <Database className="w-4 h-4" />, perm: null },
      { id: 'security-log', label: 'Security Log', icon: <ShieldAlert className="w-4 h-4" />, perm: 'audit.view' }
    ],
    []
  );

  // Filter allowed tabs based on permissions
  const allowedTabs = useMemo(() => {
    if (permissionsLoading) return allTabs;
    return allTabs.filter((t) => !t.perm || hasPermission(t.perm));
  }, [allTabs, hasPermission, permissionsLoading]);

  // Redirect to first allowed tab if user lacks permission for requested tab
  useEffect(() => {
    if (permissionsLoading) return;
    const currentTabObj = allTabs.find((t) => t.id === tab);
    if (currentTabObj?.perm && !hasPermission(currentTabObj.perm)) {
      const fallbackTab = allowedTabs[0]?.id || 'general';
      toast.show('You do not have permission to view that settings tab', 'error');
      navigate(`/w/${workspaceId}/settings/${fallbackTab}`, { replace: true });
    }
  }, [tab, allTabs, allowedTabs, hasPermission, permissionsLoading, workspaceId, navigate, toast]);

  const currentTab = allowedTabs.find((t) => t.id === tab) || allowedTabs[0] || allTabs[0];

  useEffect(() => {
    document.title = `${currentTab.label} - Workspace Settings | TaskFlow`;
  }, [currentTab]);

  const handleTabChange = (newTabId) => {
    navigate(`/w/${workspaceId}/settings/${newTabId}`);
  };

  const backUrl = location.state?.from || `/w/${workspaceId}/home`;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-app select-none">
      {/* Top Header with Breadcrumbs and Back Link */}
      <header className="h-14 px-6 border-b border-border bg-surface flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 text-xs text-text-secondary">
          <Link
            to={backUrl}
            className="flex items-center gap-1.5 font-semibold text-text-primary hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-medium truncate max-w-[140px] text-text-secondary">
            {activeWorkspace?.name || 'Workspace'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-semibold text-text-primary">Settings</span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-bold text-primary">{currentTab.label}</span>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Mobile Tab Selector (< 768px) */}
        <div className="md:hidden p-4 bg-surface border-b border-border shrink-0">
          <Select
            label="Settings Section"
            value={currentTab.id}
            onChange={handleTabChange}
            options={allowedTabs.map((t) => ({
              value: t.id,
              label: t.label,
              icon: t.icon
            }))}
          />
        </div>

        {/* Desktop Vertical Tab Sidebar (>= 768px) */}
        <aside className="hidden md:flex w-64 border-r border-border bg-surface p-4 flex-col gap-1 shrink-0 overflow-y-auto">
          <h1 className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Workspace Settings
          </h1>
          {allowedTabs.map((t) => {
            const isActive = t.id === currentTab.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary-tint text-primary-text font-bold shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                }`}
              >
                <span className={isActive ? 'text-primary' : 'text-text-muted'}>
                  {t.icon}
                </span>
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Tab Content Panel */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-6 md:p-8 bg-app"
        >
          <Suspense
            fallback={
              <div className="p-12 flex flex-col items-center justify-center space-y-3">
                <Spinner size="lg" />
                <p className="text-xs text-text-secondary font-medium">Loading settings tab...</p>
              </div>
            }
          >
            {currentTab.id === 'general' && (
              <GeneralTab
                workspace={activeWorkspace}
                onWorkspaceUpdated={onWorkspaceUpdated}
                onArchiveWorkspace={onArchiveWorkspace}
                onDeleteWorkspace={onDeleteWorkspace}
                setFormDirty={setFormDirty}
              />
            )}
            {currentTab.id === 'members' && (
              <MembersTab
                workspace={activeWorkspace}
                onOpenInvite={onOpenInvite}
              />
            )}
            {currentTab.id === 'invitations' && (
              <InvitationsTab
                workspace={activeWorkspace}
                onOpenInvite={onOpenInvite}
              />
            )}
            {currentTab.id === 'roles' && (
              <RolesTab workspace={activeWorkspace} />
            )}
            {currentTab.id === 'project' && (
              <ProjectTab
                workspace={activeWorkspace}
                setFormDirty={setFormDirty}
              />
            )}
            {currentTab.id === 'notifications' && (
              <NotificationsTab
                workspace={activeWorkspace}
                setFormDirty={setFormDirty}
              />
            )}
            {currentTab.id === 'data' && (
              <DataTab workspace={activeWorkspace} />
            )}
            {currentTab.id === 'security-log' && (
              <SecurityLogTab workspace={activeWorkspace} />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
