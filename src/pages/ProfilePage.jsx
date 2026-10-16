// client/src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { User, ArrowLeft, ChevronRight } from 'lucide-react';
import ProfileTab from './account/tabs/ProfileTab';
import UserDropdown from '../components/ui/UserDropdown';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';

export default function ProfilePage({ workspace }) {
  const { workspaceId } = useParams();
  const location = useLocation();
  const [formDirty, setFormDirty] = useState(false);
  const { setDirty } = useUnsavedChanges();

  const activeWsId = workspace?.id || workspaceId;
  const isWorkspaceContext = !!activeWsId;

  useEffect(() => {
    setDirty('profileForm', formDirty);
    return () => setDirty('profileForm', false);
  }, [formDirty, setDirty]);

  useEffect(() => {
    document.title = 'Profile - Account | TaskFlow';
  }, []);

  const backUrl = isWorkspaceContext ? `/w/${activeWsId}/home` : (location.state?.from || '/');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app select-none">
      {/* Top Header with Breadcrumbs & Top-Right User Dropdown */}
      <header className="h-14 px-6 border-b border-border bg-surface flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 text-xs text-text-secondary">
          <Link
            to={backUrl}
            className="flex items-center gap-1.5 font-semibold text-text-primary hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          {workspace?.name && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              <span className="font-semibold text-text-primary">{workspace.name}</span>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-bold text-primary flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" />
            Profile
          </span>
        </div>

        {/* Top-Right Corner User Dropdown */}
        <div className="flex items-center gap-3">
          <UserDropdown workspaceId={activeWsId} />
        </div>
      </header>

      {/* Main Profile Form Content */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 overflow-y-auto bg-app"
      >
        <div className="max-w-4xl mx-auto px-6 md:px-8 py-8 w-full">
          <ProfileTab setFormDirty={setFormDirty} />
        </div>
      </main>
    </div>
  );
}
