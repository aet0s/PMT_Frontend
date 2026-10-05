// client/src/pages/AccountPage.jsx
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Laptop,
  Activity,
  SlidersHorizontal,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';

const ProfileTab = lazy(() => import('./account/tabs/ProfileTab'));
const SecurityTab = lazy(() => import('./account/tabs/SecurityTab'));
const SessionsTab = lazy(() => import('./account/tabs/SessionsTab'));
const ActivityTab = lazy(() => import('./account/tabs/ActivityTab'));
const PreferencesTab = lazy(() => import('./account/tabs/PreferencesTab'));

import { useUnsavedChanges } from '../lib/useUnsavedChanges';

export default function AccountPage() {
  const { tab: routeTab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const pathMatch = location.pathname.match(/\/account\/([^/?#]+)/);
  const tab = routeTab || (pathMatch ? pathMatch[1] : 'profile');

  const [formDirty, setFormDirty] = useState(false);
  const { setDirty } = useUnsavedChanges();

  useEffect(() => {
    setDirty('accountForm', formDirty);
    return () => setDirty('accountForm', false);
  }, [formDirty, setDirty]);

  const tabs = useMemo(
    () => [
      { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
      { id: 'security', label: 'Security & 2FA', icon: <ShieldCheck className="w-4 h-4" /> },
      { id: 'sessions', label: 'Active Sessions', icon: <Laptop className="w-4 h-4" /> },
      { id: 'activity', label: 'Activity Log', icon: <Activity className="w-4 h-4" /> },
      { id: 'preferences', label: 'Preferences', icon: <SlidersHorizontal className="w-4 h-4" /> }
    ],
    []
  );

  const currentTab = tabs.find((t) => t.id === tab) || tabs[0];

  useEffect(() => {
    document.title = `${currentTab.label} - Account Settings | TaskFlow`;
  }, [currentTab]);

  const handleTabChange = (newTabId) => {
    navigate(`/account/${newTabId}`);
  };

  const backUrl = location.state?.from || '/';

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-app select-none">
      {/* Top Header */}
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
          <span className="font-semibold text-text-primary">Account</span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-bold text-primary">{currentTab.label}</span>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Mobile Tab Selector */}
        <div className="md:hidden p-4 bg-surface border-b border-border shrink-0">
          <Select
            label="Account Section"
            value={currentTab.id}
            onChange={handleTabChange}
            options={tabs.map((t) => ({
              value: t.id,
              label: t.label,
              icon: t.icon
            }))}
          />
        </div>

        {/* Desktop Vertical Tab Sidebar */}
        <aside className="hidden md:flex w-64 border-r border-border bg-surface p-4 flex-col gap-1 shrink-0 overflow-y-auto">
          <h1 className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Account Settings
          </h1>
          {tabs.map((t) => {
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
                <p className="text-xs text-text-secondary font-medium">Loading account tab...</p>
              </div>
            }
          >
            {currentTab.id === 'profile' && (
              <ProfileTab setFormDirty={setFormDirty} />
            )}
            {currentTab.id === 'security' && (
              <SecurityTab setFormDirty={setFormDirty} />
            )}
            {currentTab.id === 'sessions' && (
              <SessionsTab />
            )}
            {currentTab.id === 'activity' && (
              <ActivityTab />
            )}
            {currentTab.id === 'preferences' && (
              <PreferencesTab setFormDirty={setFormDirty} />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
