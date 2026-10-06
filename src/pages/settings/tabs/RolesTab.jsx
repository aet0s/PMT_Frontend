// client/src/pages/settings/tabs/RolesTab.jsx
import React from 'react';
import RoleEditorTab from '../../../components/Settings/RoleEditorTab';
import { useToast } from '../../../components/ui/Toast';

export default function RolesTab({ workspace }) {
  const toast = useToast();

  return (
    <div className="space-y-6 w-full text-left">
      <div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Roles & Permissions</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Configure role matrices, permission capabilities, and granular workspace controls.
        </p>
      </div>

      <RoleEditorTab
        workspaceId={workspace?.id}
        onToast={(msg, type) => toast.show(msg, type)}
      />
    </div>
  );
}
