// client/src/pages/SettingsPage.jsx
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
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
import Spinner from '../components/ui/Spinner';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import { getTenantItem, setTenantItem } from '../lib/storage';

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
  const { userRole, hasPermission, loading: permissionsLoading } = usePermissions();

  const [formDirty, setFormDirty] = useState(false);
  const { setDirty } = useUnsavedChanges();

  const tenantId = activeWorkspace?.company_id || activeWorkspace?.id || 'default';

  useEffect(() => {
    setDirty('settingsForm', formDirty);
    return () => setDirty('settingsForm', false);
  }, [formDirty, setDirty]);

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
      { id: 'security-log', label: 'Security Log', icon: <ShieldAlert className="w-4 h-4" />, perms: ['audit.view', 'company.manage_security'] }
    ],
    []
  );

  // Filter allowed tabs based on permissions
  const allowedTabs = useMemo(() => {
    if (permissionsLoading) return allTabs;
    return allTabs.filter((t) => {
      if (t.perms) return t.perms.some((p) => hasPermission(p));
      if (t.perm) return hasPermission(t.perm);
      return true;
    });
  }, [allTabs, hasPermission, permissionsLoading]);

  // Determine active tab: URL path > propTab > routeTab > stored tab > 'general'
  const pathMatch = location.pathname.match(/\/settings\/([^/?#]+)/);
  const pathTab = pathMatch ? pathMatch[1] : null;

  const currentTabId = useMemo(() => {
    if (pathTab && allTabs.some((t) => t.id === pathTab)) return pathTab;
    if (propTab && allTabs.some((t) => t.id === propTab)) return propTab;
    if (routeTab && allTabs.some((t) => t.id === routeTab)) return routeTab;
    const stored = getTenantItem(tenantId, 'last_settings_tab', null);
    if (stored && allTabs.some((t) => t.id === stored)) return stored;
    return 'general';
  }, [pathTab, propTab, routeTab, allTabs, tenantId]);

  // Persist current tab whenever it changes
  useEffect(() => {
    if (currentTabId) {
      setTenantItem(tenantId, 'last_settings_tab', currentTabId);
    }
  }, [currentTabId, tenantId]);

  // If path is just /settings without a tab suffix, redirect to persisted or default tab
  useEffect(() => {
    if (workspaceId && !pathTab) {
      navigate(`/w/${workspaceId}/settings/${currentTabId}`, { replace: true });
    }
  }, [workspaceId, pathTab, currentTabId, navigate]);

  // Redirect to first allowed tab if user lacks permission for requested tab
  // (Guard: only run when permissions and role have loaded to prevent premature refresh redirection)
  useEffect(() => {
    if (permissionsLoading || !userRole) return;
    const currentTabObj = allTabs.find((t) => t.id === currentTabId);
    const hasAccess =
      !currentTabObj ||
      (!currentTabObj.perm && !currentTabObj.perms) ||
      (currentTabObj.perms ? currentTabObj.perms.some((p) => hasPermission(p)) : hasPermission(currentTabObj.perm));
    if (!hasAccess) {
      const fallbackTab = allowedTabs[0]?.id || 'general';
      toast.show('You do not have permission to view that settings tab', 'error');
      navigate(`/w/${workspaceId}/settings/${fallbackTab}`, { replace: true });
    }
  }, [currentTabId, allTabs, allowedTabs, hasPermission, permissionsLoading, userRole, workspaceId, navigate, toast]);

  const currentTab = allowedTabs.find((t) => t.id === currentTabId) || allowedTabs[0] || allTabs[0];

  useEffect(() => {
    document.title = `${currentTab.label} - Workspace Settings | TaskFlow`;
  }, [currentTab]);

  const handleTabChange = (newTabId) => {
    setTenantItem(tenantId, 'last_settings_tab', newTabId);
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
          <span className="font-medium truncate max-w-[160px] text-text-secondary">
            {activeWorkspace?.name || 'Workspace'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-semibold text-text-primary">Settings</span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-bold text-primary">{currentTab.label}</span>
        </div>
      </header>

      {/* Top Horizontal Tabs Navigation Bar */}
      <nav aria-label="Settings Tabs" className="border-b border-border bg-surface shrink-0">
        <div className="px-6 md:px-8">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5">
            {allowedTabs.map((t) => {
              const isActive = t.id === currentTab.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  className={`group flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-tint text-primary font-bold shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                  }`}
                >
                  <span className={isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary transition-colors'}>
                    {t.icon}
                  </span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Tab Content Panel */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 overflow-y-auto bg-app"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 w-full">
          <Suspense
            fallback={
              <div className="p-16 flex flex-col items-center justify-center space-y-3">
                <Spinner size="lg" />
                <p className="text-xs text-text-secondary font-medium">Loading settings...</p>
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
        </div>
      </main>
    </div>
  );
}
