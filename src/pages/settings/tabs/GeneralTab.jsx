import React, { useState, useEffect } from 'react';
import { Briefcase, AlertTriangle, Archive, Trash2, Check, Sparkles } from 'lucide-react';
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
  const { hasPermission } = usePermissions();
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

    // Optimistically notify parent
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
      // Rollback on failure
      setName(prevName);
      setDescription(prevDescription);
      onWorkspaceUpdated?.(workspace);
      setFormDirty?.(true);
      toast.show(err.message || 'Failed to update workspace', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl text-left">
      <div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">General Settings</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Manage your workspace name, identity, and lifecycle controls.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 bg-surface border border-border rounded-xl p-5 shadow-xs">
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
            placeholder="A short description of this workspace's purpose..."
            className="w-full px-3.5 py-2 bg-surface text-text-primary text-xs rounded-lg border border-border hover:border-border-strong focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:bg-surface-muted disabled:text-text-muted"
          />
        </div>

        {canEdit && (
          <div className="flex justify-end pt-2">
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
        <div className="border border-danger/30 rounded-xl p-5 bg-danger-tint/10 space-y-4">
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
