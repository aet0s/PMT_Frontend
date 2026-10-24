// client/src/pages/SettingsPage.jsx
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Briefcase,
  SlidersHorizontal,
  Bell,
  Database,
  ShieldAlert
} from 'lucide-react';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../components/ui/Toast';
import Spinner from '../components/ui/Spinner';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import { getTenantItem, setTenantItem } from '../lib/storage';

// Lazy-loaded tab components
const GeneralTab = lazy(() => import('./settings/tabs/GeneralTab'));
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
  onDeleteWorkspace
}) {
  const { workspaceId, tab: routeTab } = useParams();
  const effectiveWsId = workspaceId || activeWorkspace?.id;
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

  const isOwner =
    (typeof userRole === 'string' ? userRole : userRole?.name)?.toLowerCase() === 'owner' ||
    (typeof userRole === 'string' ? userRole : userRole?.name)?.toLowerCase() === 'super admin' ||
    (activeWorkspace?.role_name || activeWorkspace?.role)?.toLowerCase() === 'owner' ||
    (activeWorkspace?.role_name || activeWorkspace?.role)?.toLowerCase() === 'super admin';

  const roleName = (typeof userRole === 'string' ? userRole : userRole?.name || activeWorkspace?.role_name || activeWorkspace?.role || '')?.toLowerCase();
  const isMemberOrBelow = ['team member', 'member', 'viewer', 'guest'].includes(roleName);

  const canAccessSettings =
    !isMemberOrBelow &&
    (isOwner ||
    hasPermission('workspace.edit'));

  // Tab definitions with icons and permission requirements
  const allTabs = useMemo(
    () => [
      { id: 'general', label: 'General', icon: <Briefcase className="w-4 h-4" />, perms: ['workspace.edit', 'workspace.delete', 'workspace.archive'] },
      { id: 'project', label: 'Workspace Defaults', icon: <SlidersHorizontal className="w-4 h-4" />, perm: 'workspace.edit' },
      { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, perm: 'workspace.edit' },
      { id: 'data', label: 'Data & Export', icon: <Database className="w-4 h-4" />, perms: ['import_export.export', 'import_export.import', 'workspace.edit'] },
      { id: 'security-log', label: 'Activity & Security Log', icon: <ShieldAlert className="w-4 h-4" />, perms: ['audit.view', 'company.manage_security'] }
    ],
    []
  );

  // Filter allowed tabs based on permissions
  const allowedTabs = useMemo(() => {
    if (permissionsLoading) return allTabs;
    if (isOwner) return allTabs;
    return allTabs.filter((t) => {
      if (t.perms) return t.perms.some((p) => hasPermission(p));
      if (t.perm) return hasPermission(t.perm);
      return true;
    });
  }, [allTabs, hasPermission, permissionsLoading, isOwner]);

  // Determine active tab: URL path > propTab > routeTab > stored tab > 'general'
  const pathMatch = location.pathname.match(/\/settings\/([^/?#]+)/);
  let pathTab = pathMatch ? pathMatch[1] : null;
  if (pathTab === 'activity-log' || pathTab === 'activity') pathTab = 'security-log';

  const currentTabId = useMemo(() => {
    if (pathTab && allTabs.some((t) => t.id === pathTab)) return pathTab;
    if (propTab && allTabs.some((t) => t.id === propTab)) return propTab;
    if (routeTab && allTabs.some((t) => t.id === routeTab)) return routeTab;
    const stored = getTenantItem(tenantId, 'last_settings_tab', null);
    if (stored && allTabs.some((t) => t.id === stored)) return stored;
    return allowedTabs[0]?.id || 'general';
  }, [pathTab, propTab, routeTab, allTabs, allowedTabs, tenantId]);

  // Persist current tab whenever it changes
  useEffect(() => {
    if (currentTabId) {
      setTenantItem(tenantId, 'last_settings_tab', currentTabId);
    }
  }, [currentTabId, tenantId]);

  // If path is just /settings without a tab suffix, redirect to persisted or default tab
  useEffect(() => {
    if (effectiveWsId && !pathTab) {
      navigate(`/w/${effectiveWsId}/settings/${currentTabId}`, { replace: true });
    } else if (pathTab === 'roles' && effectiveWsId) {
      navigate(`/w/${effectiveWsId}/profile/roles`, { replace: true });
    } else if (pathTab === 'members' && effectiveWsId) {
      navigate(`/w/${effectiveWsId}/members`, { replace: true });
    } else if (pathTab === 'invitations' && effectiveWsId) {
      navigate(`/w/${effectiveWsId}/company-members`, { replace: true });
    }
  }, [effectiveWsId, pathTab, currentTabId, navigate]);

  // Guard: if user does not have permission to access workspace settings at all
  useEffect(() => {
    if (permissionsLoading || !userRole) return;
    if (!canAccessSettings && effectiveWsId) {
      toast.show('You do not have permission to access workspace settings', 'error');
      navigate(`/w/${effectiveWsId}/home`, { replace: true });
    }
  }, [canAccessSettings, permissionsLoading, userRole, effectiveWsId, navigate, toast]);

  // Redirect to first allowed tab if user lacks permission for requested tab
  // (Guard: only run when permissions and role have loaded to prevent premature refresh redirection)
  useEffect(() => {
    if (permissionsLoading || !userRole || !canAccessSettings) return;
    const currentTabObj = allTabs.find((t) => t.id === currentTabId);
    const hasAccess =
      isOwner ||
      !currentTabObj ||
      (!currentTabObj.perm && !currentTabObj.perms) ||
      (currentTabObj.perms ? currentTabObj.perms.some((p) => hasPermission(p)) : hasPermission(currentTabObj.perm));
    if (!hasAccess) {
      const fallbackTab = allowedTabs[0]?.id || 'general';
      toast.show('You do not have permission to view that settings tab', 'error');
      navigate(`/w/${effectiveWsId}/settings/${fallbackTab}`, { replace: true });
    }
  }, [currentTabId, allTabs, allowedTabs, hasPermission, permissionsLoading, userRole, isOwner, canAccessSettings, effectiveWsId, navigate, toast]);

  const currentTab = allowedTabs.find((t) => t.id === currentTabId) || allowedTabs[0] || allTabs[0];

  useEffect(() => {
    document.title = `${currentTab.label} - Workspace Settings | TaskFlow`;
  }, [currentTab]);

  if (!permissionsLoading && !canAccessSettings) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app space-y-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-text-secondary">Redirecting to workspace home...</p>
      </div>
    );
  }

  const handleTabChange = (newTabId) => {
    setTenantItem(tenantId, 'last_settings_tab', newTabId);
    navigate(`/w/${effectiveWsId}/settings/${newTabId}`);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-app select-none">
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
            {currentTab.id === 'project' && (
              <ProjectTab
                workspace={activeWorkspace}
                onWorkspaceUpdated={onWorkspaceUpdated}
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
