// client/src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import ProfileTab from './account/tabs/ProfileTab';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';

export default function ProfilePage() {
  const [formDirty, setFormDirty] = useState(false);
  const { setDirty } = useUnsavedChanges();

  useEffect(() => {
    setDirty('profileForm', formDirty);
    return () => setDirty('profileForm', false);
  }, [formDirty, setDirty]);

  useEffect(() => {
    document.title = 'Profile - Account | TaskFlow';
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app select-none">
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
