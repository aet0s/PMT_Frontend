// client/src/pages/settings/tabs/GeneralTab.jsx
import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  AlertTriangle,
  Archive,
  Trash2,
  Check,
  Sparkles,
  Shield,
  Layers,
  Calendar,
  Lock,
  Info
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { updateWorkspace } from '../../../api/workspaces';
import { usePermissions } from '../../../context/PermissionContext';
import { useSocket } from '../../../context/SocketProvider';

export default function GeneralTab({
  workspace,
  onWorkspaceUpdated,
  onArchiveWorkspace,
  onDeleteWorkspace,
  setFormDirty
}) {
  const toast = useToast();
  const { hasPermission, userRole } = usePermissions();
  const { socket, originId } = useSocket();
  const canEdit = hasPermission('workspace.edit_settings');
  const canDelete = hasPermission('workspace.delete');

  const [name, setName] = useState(workspace?.name || '');
  const [description, setDescription] = useState(workspace?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: () => {}
  });

  useEffect(() => {
    setName(workspace?.name || '');
    setDescription(workspace?.description || '');
    setFormDirty?.(false);
  }, [workspace, setFormDirty]);

  useEffect(() => {
    if (!socket || !workspace?.id) return;
    socket.emit('join_workspace', { workspaceId: workspace.id });

    const onWorkspaceUpdatedEvent = ({ workspace: updatedWs, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      if (updatedWs) {
        if (updatedWs.name !== undefined) setName(updatedWs.name);
        if (updatedWs.description !== undefined) setDescription(updatedWs.description);
        onWorkspaceUpdated?.(updatedWs);
      }
    };

    socket.on('workspace:updated', onWorkspaceUpdatedEvent);

    return () => {
      socket.off('workspace:updated', onWorkspaceUpdatedEvent);
      socket.emit('leave_workspace', { workspaceId: workspace.id });
    };
  }, [socket, workspace?.id, originId, onWorkspaceUpdated]);

  const handleNameChange = (e) => {
    setName(e.target.value);
    setFormDirty?.(e.target.value !== (workspace?.name || ''));
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    setFormDirty?.(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.show('Workspace name cannot be empty', 'error');
      return;
    }

    const prevName = workspace?.name || '';
    const prevDescription = workspace?.description || '';
    const optimisticWs = { ...workspace, name: name.trim(), description: description.trim() };

    onWorkspaceUpdated?.(optimisticWs);
    setFormDirty?.(false);

    setIsSaving(true);
    try {
      const res = await updateWorkspace(workspace.id, { name: name.trim(), description: description.trim() });
      toast.show('Workspace details updated successfully', 'success');
      if (res?.workspace) {
        onWorkspaceUpdated?.(res.workspace);
      }
    } catch (err) {
      setName(prevName);
      setDescription(prevDescription);
      onWorkspaceUpdated?.(workspace);
      setFormDirty?.(true);
      toast.show(err.message || 'Failed to update workspace', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const createdDate = workspace?.created_at
    ? new Date(workspace.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Active';

  return (
    <div className="space-y-6 w-full text-left">
      {/* Header */}
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            General Settings
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage your workspace identity, description, and administrative lifecycle controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-surface-muted text-text-secondary border border-border rounded-lg text-xs font-semibold">
            Workspace ID: #{workspace?.id}
          </span>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings & Danger Zone (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-5 bg-surface border border-border rounded-xl p-6 shadow-xs">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-primary">Workspace Profile</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                The name and summary displayed to all team members across boards and invitations.
              </p>
            </div>

            <Input
              label="Workspace Name"
              value={name}
              onChange={handleNameChange}
              disabled={!canEdit || isSaving}
              required
              placeholder="e.g. Acme Engineering"
              leftIcon={<Briefcase className="w-4 h-4 text-text-secondary" />}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Workspace Description
              </label>
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                disabled={!canEdit || isSaving}
                rows={3}
                placeholder="A short description of this workspace's mission and team scope..."
                className="w-full px-3.5 py-2.5 bg-surface text-text-primary text-xs rounded-lg border border-border hover:border-border-strong focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:bg-surface-muted disabled:text-text-muted transition"
              />
            </div>

            {canEdit && (
              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSaving}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </form>

          {/* Danger Zone */}
          {(canEdit || canDelete) && (
            <div className="border border-danger/30 rounded-xl p-6 bg-danger-tint/10 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-danger-text font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <span>Danger Zone</span>
              </div>
              <p className="text-xs text-text-secondary">
                Irreversible actions regarding this workspace and all associated boards.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Archive Workspace',
                        message: `Are you sure you want to archive "${workspace?.name}"? All boards will be hidden from normal view.`,
                        confirmText: 'Archive Workspace',
                        variant: 'warning',
                        onConfirm: () => onArchiveWorkspace?.(workspace)
                      });
                    }}
                    leftIcon={<Archive className="w-4 h-4 text-warning" />}
                  >
                    Archive Workspace
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Delete Workspace',
                        message: `Are you sure you want to permanently delete "${workspace?.name}"? This cannot be undone and will delete all boards, lists, and cards.`,
                        confirmText: 'Delete Permanently',
                        variant: 'danger',
                        onConfirm: () => onDeleteWorkspace?.(workspace)
                      });
                    }}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete Workspace
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Workspace Summary & Governance Card (1 col) */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Workspace Metadata
            </h3>

            <div className="divide-y divide-border text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-text-secondary">Created Date</span>
                <span className="font-semibold text-text-primary">{createdDate}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-text-secondary">Privacy</span>
                <span className="px-2 py-0.5 rounded-full bg-success-tint text-success-text text-[10px] font-bold">
                  Restricted
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-text-secondary">Your Role</span>
                <span className="font-bold text-primary">{userRole?.name || 'Owner'}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-text-secondary">Multi-Tenant Isolation</span>
                <span className="px-2 py-0.5 rounded-full bg-info-tint text-info-text text-[10px] font-bold">
                  Enforced
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Governance & Policies
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Workspace settings apply to all boards and lists. Role permissions can be configured in the Roles & Permissions tab to control member capabilities.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
