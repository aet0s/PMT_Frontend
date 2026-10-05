// client/src/pages/settings/tabs/MembersTab.jsx
import React, { useState, useEffect } from 'react';
import { Users, UserX, Shield, UserPlus, Search } from 'lucide-react';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/Toast';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { getWorkspaceMembers, updateWorkspaceMember, removeWorkspaceMember } from '../../../api/workspaces';
import { usePermissions } from '../../../context/PermissionContext';

export default function MembersTab({ workspace, onOpenInvite }) {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canManageMembers = hasPermission('workspace.manage_members');

  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: () => {}
  });

  const loadMembers = async () => {
    if (!workspace?.id) return;
    setIsLoading(true);
    try {
      const data = await getWorkspaceMembers(workspace.id);
      setMembers(data.members || []);
    } catch (err) {
      toast.show(err.message || 'Failed to load members', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [workspace?.id]);

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateWorkspaceMember(workspace.id, memberId, newRole);
      toast.show('Member role updated', 'success');
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      toast.show(err.message || 'Failed to update member role', 'error');
    }
  };

  const handleRemoveMember = (member) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${member.name} (${member.email}) from this workspace?`,
      confirmText: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await removeWorkspaceMember(workspace.id, member.id);
          toast.show(`${member.name} removed from workspace`, 'success');
          setMembers((prev) => prev.filter((m) => m.id !== member.id));
        } catch (err) {
          toast.show(err.message || 'Failed to remove member', 'error');
        }
      }
    });
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-3xl text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Workspace Members</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage who has access to this workspace and their permission roles.
          </p>
        </div>

        {canManageMembers && onOpenInvite && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenInvite}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Invite Members
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter members by name or email..."
          className="w-full pl-9 pr-3.5 py-2 bg-surface text-xs text-text-primary border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Members List */}
      <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-text-muted">Loading members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">No members found.</div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={member.name} size="md" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">{member.name}</p>
                  <p className="text-[11px] text-text-secondary truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <div className="w-32">
                  <Select
                    size="sm"
                    value={member.role || 'member'}
                    disabled={!canManageMembers}
                    onChange={(val) => handleRoleChange(member.id, val)}
                    options={[
                      { value: 'admin', label: 'Admin' },
                      { value: 'member', label: 'Member' },
                      { value: 'viewer', label: 'Viewer' }
                    ]}
                  />
                </div>

                {canManageMembers && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member)}
                    title="Remove member"
                    aria-label={`Remove ${member.name}`}
                    className="p-2 text-text-muted hover:text-danger hover:bg-danger-tint/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
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
