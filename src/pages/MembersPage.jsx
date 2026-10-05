// client/src/pages/MembersPage.jsx
import React, { useEffect } from 'react';
import MembersTab from './settings/tabs/MembersTab';

export default function MembersPage({ workspace, onOpenInvite }) {
  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Members | TaskFlow`;
  }, [workspace]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full">
        <MembersTab workspace={workspace} onOpenInvite={onOpenInvite} />
      </div>
    </div>
  );
}
