import React, { useState, useEffect } from 'react';
import {
  Users,
  UserX,
  Shield,
  UserPlus,
  Search,
  Mail,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Clock,
  KeyRound,
  LayoutGrid,
  Briefcase,
  Lock,
  Sparkles
} from 'lucide-react';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import {
  getWorkspaceMembers,
  getWorkspaceRoles,
  updateWorkspaceMember,
  removeWorkspaceMember
} from '../../../api/workspaces';
import {
  getWorkspaceInvitations,
  regenerateInvitation,
  revokeInvitation
} from '../../../api/invitations';
import { usePermissions } from '../../../context/PermissionContext';
import { useSocket } from '../../../context/SocketProvider';

export default function MembersTab({ workspace, onOpenInvite }) {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const { socket, originId } = useSocket();
  const canManageMembers = hasPermission('workspace.manage_members') || hasPermission('member.assign_role');
  const canInvite = hasPermission('workspace.invite_members') || hasPermission('member.invite');

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'pending'
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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
    setIsLoadingMembers(true);
    try {
      const data = await getWorkspaceMembers(workspace.id);
      setMembers(data.members || []);
    } catch (err) {
      toast.show(err.message || 'Failed to load members', 'error');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadRoles = async () => {
    if (!workspace?.id) return;
    try {
      const data = await getWorkspaceRoles(workspace.id);
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Failed to load workspace roles:', err);
    }
  };

  const loadInvitations = async () => {
    if (!workspace?.id) return;
    setIsLoadingInvitations(true);
    try {
      const data = await getWorkspaceInvitations(workspace.id);
      setInvitations(data.invitations || []);
    } catch (err) {
      // Non-admins might not be authorized to view invitations, quietly ignore if 403
      if (err.status !== 403) {
        toast.show(err.message || 'Failed to load invitations', 'error');
      }
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  useEffect(() => {
    loadMembers();
    loadRoles();
    loadInvitations();
  }, [workspace?.id]);

  useEffect(() => {
    if (!socket || !workspace?.id) return;
    socket.emit('join_workspace', { workspaceId: workspace.id });

    const onMemberAdded = ({ member, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      if (member) {
        setMembers((prev) => {
          if (prev.some((m) => m.id === member.id)) return prev;
          return [...prev, member];
        });
        // Remove from pending invitations if present
        if (member.email) {
          setInvitations((prev) => prev.filter((i) => i.email?.toLowerCase() !== member.email?.toLowerCase()));
        }
      }
    };

    const onMemberUpdated = ({ targetUserId, roleId, role, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id !== targetUserId) return m;
          const matchedRole = roles.find((r) => r.id === roleId);
          return {
            ...m,
            role: role || matchedRole?.name || m.role,
            role_id: roleId || m.role_id,
            role_details: matchedRole || m.role_details
          };
        })
      );
    };

    const onMemberRemoved = ({ targetUserId, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      setMembers((prev) => prev.filter((m) => m.id !== targetUserId));
    };

    const onInviteCreated = ({ invitation, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      if (invitation) {
        setInvitations((prev) => {
          if (prev.some((i) => i.id === invitation.id)) return prev;
          return [invitation, ...prev];
        });
      }
    };

    const onInviteRevoked = ({ invitationId, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    };

    socket.on('workspace:member_added', onMemberAdded);
    socket.on('workspace:member_updated', onMemberUpdated);
    socket.on('workspace:member_removed', onMemberRemoved);
    socket.on('workspace:invitation_created', onInviteCreated);
    socket.on('workspace:invitation_revoked', onInviteRevoked);

    return () => {
      socket.off('workspace:member_added', onMemberAdded);
      socket.off('workspace:member_updated', onMemberUpdated);
      socket.off('workspace:member_removed', onMemberRemoved);
      socket.off('workspace:invitation_created', onInviteCreated);
      socket.off('workspace:invitation_revoked', onInviteRevoked);
      socket.emit('leave_workspace', { workspaceId: workspace.id });
    };
  }, [socket, workspace?.id, originId, roles]);

  const handleRoleChange = async (memberId, newRoleIdStr) => {
    const newRoleId = Number(newRoleIdStr);
    const selectedRole = roles.find((r) => r.id === newRoleId);
    if (!selectedRole) return;

    const prevMembers = [...members];
    // Optimistic update
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              role: selectedRole.name,
              role_id: newRoleId,
              role_details: selectedRole,
              permissions: selectedRole.permission_keys || m.permissions,
              permissions_count: (selectedRole.permission_keys || []).length
            }
          : m
      )
    );

    try {
      await updateWorkspaceMember(workspace.id, memberId, { role_id: newRoleId });
      toast.show(`Role changed to ${selectedRole.name}`, 'success');
    } catch (err) {
      // Rollback on failure
      setMembers(prevMembers);
      toast.show(err.message || 'Failed to update member role', 'error');
    }
  };

  const handleRemoveMember = (member) => {
    if (member.is_owner || member.role === 'Owner' || member.role === 'Super Admin') {
      toast.show('The Owner role is protected and cannot be removed', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${member.name} (${member.email}) from this workspace?`,
      confirmText: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        const prevMembers = members;
        setMembers((prev) => prev.filter((m) => m.id !== member.id));

        try {
          await removeWorkspaceMember(workspace.id, member.id);
          toast.show(`${member.name} removed from workspace`, 'success');
        } catch (err) {
          setMembers(prevMembers);
          toast.show(err.message || 'Failed to remove member', 'error');
        }
      }
    });
  };

  const handleCopyInviteLink = (inv) => {
    const inviteUrl = inv.invite_url || (inv.token
      ? `${window.location.origin}/register?invite_token=${inv.token}&email=${encodeURIComponent(inv.email)}`
      : `${window.location.origin}/register`);
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(inv.id);
    toast.show('Invitation link copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRegenerateInvite = async (inv) => {
    setRegeneratingId(inv.id);
    try {
      const res = await regenerateInvitation(inv.id);
      const newUrl = res.invite_url || (res.invite_token
        ? `${window.location.origin}/register?invite_token=${res.invite_token}&email=${encodeURIComponent(inv.email)}`
        : null);

      setInvitations((prev) =>
        prev.map((i) =>
          i.id === inv.id
            ? { ...i, token: res.invite_token, invite_url: newUrl, expires_at: res.expires_at }
            : i
        )
      );

      if (newUrl) {
        navigator.clipboard.writeText(newUrl);
        setCopiedId(inv.id);
        setTimeout(() => setCopiedId(null), 2500);
      }

      toast.show('New invitation link generated and copied to clipboard!', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to regenerate invitation', 'error');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleRevokeInvite = async (invId) => {
    const prevInvitations = invitations;
    setInvitations((prev) => prev.filter((i) => i.id !== invId));

    try {
      await revokeInvitation(invId);
      toast.show('Invitation revoked', 'success');
    } catch (err) {
      setInvitations(prevInvitations);
      toast.show(err.message || 'Failed to revoke invitation', 'error');
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInvitations = invitations.filter((i) =>
    i.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Workspace Members & Access</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage who has access to {workspace?.name || 'this workspace'}, their granted roles, permissions, and board scoping.
          </p>
        </div>

        {canInvite && onOpenInvite && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenInvite}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Invite Member
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-surface-muted p-1 rounded-2xl border border-border w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'members'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Active Members</span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'members' ? 'bg-primary-tint text-primary-text font-bold' : 'bg-surface text-text-muted border border-border'
            }`}
          >
            {members.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Invitations</span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'pending' ? 'bg-primary-tint text-primary-text font-bold' : 'bg-surface text-text-muted border border-border'
            }`}
          >
            {invitations.length}
          </span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <label htmlFor="members-search-input" className="sr-only">
          {activeTab === 'members' ? 'Filter members by name or email' : 'Filter pending invitations by email'}
        </label>
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          id="members-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeTab === 'members' ? 'Filter members by name or email...' : 'Filter pending invitations by email...'}
          className="w-full pl-9 pr-3.5 py-2 bg-surface text-xs text-text-primary border border-border rounded-xl focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors shadow-2xs"
        />
      </div>

      {/* Active Members Tab */}
      {activeTab === 'members' && (
        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-xs">
          {isLoadingMembers ? (
            <div className="p-8 text-center text-xs text-text-muted">Loading workspace members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">No members match your criteria.</div>
          ) : (
            filteredMembers.map((member) => {
              const isOwner = member.is_owner || member.role === 'Owner' || member.role === 'Super Admin';
              const permCount = member.permissions_count || (member.permissions?.length) || 0;
              const userBoards = member.boards || [];

              return (
                <div
                  key={member.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-muted/30 transition-colors"
                >
                  {/* Left: User Identity + Access details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Avatar name={member.name} size="md" className="shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-text-primary truncate">{member.name}</span>
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                            <Shield className="w-3 h-3 text-amber-500" />
                            Owner (Locked)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-tint text-primary-text border border-primary/20">
                            <Shield className="w-3 h-3 text-primary" />
                            {member.role || 'Team Member'}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-muted text-text-muted border border-border">
                          <KeyRound className="w-2.5 h-2.5 text-indigo-400" />
                          {permCount} Permissions
                        </span>
                      </div>

                      <p className="text-[11px] text-text-secondary truncate">{member.email}</p>

                      {/* Access Matrix Badges: Workspace + Boards */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-text-secondary bg-surface-muted px-2 py-0.5 rounded border border-border">
                          <Briefcase className="w-2.5 h-2.5 text-primary" />
                          {workspace?.name || 'Workspace'}
                        </span>

                        {isOwner || member.role === 'Admin' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                            <LayoutGrid className="w-2.5 h-2.5" />
                            All Boards (Full Access)
                          </span>
                        ) : userBoards.length > 0 ? (
                          userBoards.slice(0, 3).map((b) => (
                            <span
                              key={b.id}
                              className="inline-flex items-center gap-1 text-[10px] text-text-secondary bg-surface-muted px-1.5 py-0.5 rounded border border-border"
                            >
                              <LayoutGrid className="w-2.5 h-2.5 text-primary" />
                              <span className="truncate max-w-[120px]">{b.name}</span>
                            </span>
                          )).concat(
                            userBoards.length > 3 ? (
                              <span
                                key="more"
                                className="text-[10px] text-text-muted px-1 py-0.5 rounded bg-surface-muted border border-border"
                              >
                                +{userBoards.length - 3} more
                              </span>
                            ) : []
                          )
                        ) : (
                          <span className="text-[10px] text-text-muted italic px-1.5 py-0.5">
                            No boards assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Role selection & removal */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {isOwner ? (
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-surface-muted border border-border rounded-lg text-xs font-medium text-text-muted cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Owner Role Protected</span>
                      </div>
                    ) : (
                      <div className="w-40">
                        <Select
                          size="sm"
                          value={String(member.role_id || '')}
                          disabled={!canManageMembers}
                          onChange={(val) => handleRoleChange(member.id, val)}
                          options={roles
                            .filter((r) => r.name !== 'Owner' && r.name !== 'Super Admin')
                            .map((r) => ({
                              value: String(r.id),
                              label: r.name
                            }))}
                        />
                      </div>
                    )}

                    {!isOwner && canManageMembers && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        title="Remove member from workspace"
                        aria-label={`Remove ${member.name}`}
                        className="p-2 text-text-muted hover:text-danger hover:bg-danger-tint/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pending Invitations Tab */}
      {activeTab === 'pending' && (
        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-xs">
          {isLoadingInvitations ? (
            <div className="p-8 text-center text-xs text-text-muted">Loading pending invitations...</div>
          ) : filteredInvitations.length === 0 ? (
            <div className="p-12 text-center text-text-muted space-y-2">
              <Mail className="w-8 h-8 mx-auto text-text-muted opacity-40" />
              <p className="text-xs font-semibold text-text-primary">No Pending Invitations</p>
              <p className="text-[11px] max-w-sm mx-auto">
                When you invite members who do not have an active account yet, they will show here until they set their password and log in.
              </p>
            </div>
          ) : (
            filteredInvitations.map((inv) => {
              const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
              const boardNames = inv.board_names || [];

              return (
                <div
                  key={inv.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-primary-tint flex items-center justify-center shrink-0 text-primary mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-text-primary truncate">{inv.email}</span>
                        <Badge variant="warning" size="sm">
                          Pending Registration
                        </Badge>
                        <Badge variant="primary" size="sm" icon={<Shield className="w-2.5 h-2.5" />}>
                          {inv.role_name || 'Team Member'}
                        </Badge>
                        {isExpired && (
                          <Badge variant="danger" size="sm">
                            Expired
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Briefcase className="w-2.5 h-2.5 text-primary" />
                          {workspace?.name || 'Workspace'}
                        </span>

                        <span className="text-[10px] text-text-muted">•</span>

                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <LayoutGrid className="w-2.5 h-2.5 text-primary" />
                          {boardNames.length > 0 ? (
                            <span>{boardNames.join(', ')}</span>
                          ) : (
                            <span>All workspace boards</span>
                          )}
                        </span>
                      </div>

                      <p className="text-[10px] text-text-muted">
                        Invited {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'recently'}
                        {inv.expires_at ? ` • Valid until ${new Date(inv.expires_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions for Pending Invite */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyInviteLink(inv)}
                      leftIcon={copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copiedId === inv.id ? 'Copied Link' : 'Copy Link'}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      isLoading={regeneratingId === inv.id}
                      onClick={() => handleRegenerateInvite(inv)}
                      leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      title="Regenerate invitation link and reset 7-day expiration"
                    >
                      Regenerate
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inv.id)}
                      title="Revoke invitation"
                      className="p-2 text-text-muted hover:text-danger hover:bg-danger-tint/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
