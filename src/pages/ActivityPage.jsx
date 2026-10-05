// client/src/pages/ActivityPage.jsx
import React, { useEffect } from 'react';
import SecurityLogTab from './settings/tabs/SecurityLogTab';

export default function ActivityPage({ workspace }) {
  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Activity | TaskFlow`;
  }, [workspace]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full">
        <SecurityLogTab workspace={workspace} />
      </div>
    </div>
  );
}
