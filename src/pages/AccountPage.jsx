// client/src/pages/AccountPage.jsx
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Shield,
  Laptop,
  SlidersHorizontal
} from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import { usePermissions } from '../context/PermissionContext';

const RolesTab = lazy(() => import('./settings/tabs/RolesTab'));
const SecurityTab = lazy(() => import('./account/tabs/SecurityTab'));
const SessionsTab = lazy(() => import('./account/tabs/SessionsTab'));
const PreferencesTab = lazy(() => import('./account/tabs/PreferencesTab'));

export default function AccountPage({ tab: propTab, workspace }) {
  const { workspaceId, tab: routeTab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [formDirty, setFormDirty] = useState(false);
  const { setDirty } = useUnsavedChanges();

  const activeWsId = workspace?.id || workspaceId;
  const isWorkspaceContext = !!activeWsId;

  useEffect(() => {
    setDirty('accountForm', formDirty);
    return () => setDirty('accountForm', false);
  }, [formDirty, setDirty]);

  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewRoles = isWorkspaceContext && (permissionsLoading || hasPermission('role.view'));
  const effectiveWorkspace = workspace || (activeWsId ? { id: Number(activeWsId) } : null);

  const tabs = useMemo(
    () => [
      ...(canViewRoles
        ? [{ id: 'roles', label: 'Roles & Permissions', icon: <Shield className="w-4 h-4" /> }]
        : []),
      { id: 'security', label: 'Security', icon: <ShieldCheck className="w-4 h-4" /> },
      { id: 'sessions', label: 'Active Sessions', icon: <Laptop className="w-4 h-4" /> },
      { id: 'preferences', label: 'Preferences', icon: <SlidersHorizontal className="w-4 h-4" /> }
    ],
    [canViewRoles]
  );

  const defaultTabId = canViewRoles ? 'roles' : 'security';

  // Tab persistence: URL path > propTab > routeTab > stored localStorage tab > defaultTabId
  const pathMatch = location.pathname.match(/\/(?:profile|account)\/([^/?#]+)/);
  const pathTab = pathMatch ? pathMatch[1] : null;

  const currentTabId = useMemo(() => {
    if (pathTab && tabs.some((t) => t.id === pathTab)) return pathTab;
    if (propTab && tabs.some((t) => t.id === propTab)) return propTab;
    if (routeTab && tabs.some((t) => t.id === routeTab)) return routeTab;
    const stored = localStorage.getItem('last_account_tab');
    if (stored && tabs.some((t) => t.id === stored)) return stored;
    return defaultTabId;
  }, [pathTab, propTab, routeTab, tabs, defaultTabId]);

  useEffect(() => {
    if (currentTabId) {
      localStorage.setItem('last_account_tab', currentTabId);
    }
  }, [currentTabId]);

  // If path is just /account without a tab suffix, redirect to persisted or default tab
  useEffect(() => {
    if (!pathTab || pathTab === 'profile') {
      if (isWorkspaceContext) {
        navigate(`/w/${activeWsId}/account/${currentTabId}`, { replace: true });
      } else {
        navigate(`/account/${currentTabId}`, { replace: true });
      }
    }
  }, [pathTab, currentTabId, isWorkspaceContext, activeWsId, navigate]);

  const currentTab = tabs.find((t) => t.id === currentTabId) || tabs[0];

  useEffect(() => {
    if (currentTab?.label) {
      document.title = `${currentTab.label} - Settings | TaskFlow`;
    }
  }, [currentTab]);

  const handleTabChange = (newTabId) => {
    localStorage.setItem('last_account_tab', newTabId);
    if (isWorkspaceContext) {
      navigate(`/w/${activeWsId}/account/${newTabId}`);
    } else {
      navigate(`/account/${newTabId}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app select-none">
      {/* Top Horizontal Tabs Navigation Bar */}
      <nav aria-label="Account Tabs" className="border-b border-border bg-surface shrink-0">
        <div className="px-6 md:px-8">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5">
            {tabs.map((t) => {
              const isActive = t.id === currentTab?.id;
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
                <p className="text-xs text-text-secondary font-medium">Loading account tab...</p>
              </div>
            }
          >
            {currentTab?.id === 'roles' && (
              <RolesTab workspace={effectiveWorkspace} />
            )}
            {currentTab?.id === 'security' && (
              <SecurityTab setFormDirty={setFormDirty} />
            )}
            {currentTab?.id === 'sessions' && (
              <SessionsTab />
            )}
            {currentTab?.id === 'preferences' && (
              <PreferencesTab setFormDirty={setFormDirty} />
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
