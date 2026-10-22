import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Mail,
  Layers,
  Trash2,
  Shield,
  AlertTriangle,
  Activity
} from 'lucide-react';
import MemberAuditModal from '../components/Members/MemberAuditModal';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { getWorkspaceMembers, removeWorkspaceMember } from '../api/workspaces';
import { usePermissions } from '../context/PermissionContext';
import { useSocket } from '../context/SocketProvider';

export default function MembersPage({ workspace }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission, userRole, loading: permissionsLoading } = usePermissions();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const originId = socketContext?.originId;

  const roleName = (typeof userRole === 'string' ? userRole : userRole?.name || workspace?.role_name || workspace?.role || '')?.toLowerCase();
  const isOwner = roleName === 'owner' || roleName === 'super admin';
  const isMemberOrBelow = ['team member', 'member', 'viewer', 'guest'].includes(roleName);
  const canViewMembers = !isMemberOrBelow && (isOwner || hasPermission('member.invite') || hasPermission('member.remove') || hasPermission('member.assign_role') || hasPermission('role.view'));

  useEffect(() => {
    if (!permissionsLoading && userRole && !canViewMembers && workspace?.id) {
      toast.show('You do not have permission to view workspace members', 'error');
      navigate(`/w/${workspace.id}/home`, { replace: true });
    }
  }, [permissionsLoading, userRole, canViewMembers, workspace?.id, navigate, toast]);

  const canRemove = hasPermission('member.remove') || userRole?.name === 'Owner' || userRole?.name === 'Admin';

  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [auditMember, setAuditMember] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Remove',
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
      toast.show(err.message || 'Failed to load workspace members', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Workspace Members | TaskFlow`;
    loadMembers();
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
      }
    };

    const onMemberRemoved = ({ targetUserId, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      setMembers((prev) => prev.filter((m) => m.id !== targetUserId));
    };

    socket.on('workspace:member_added', onMemberAdded);
    socket.on('workspace:member_removed', onMemberRemoved);

    return () => {
      socket.off('workspace:member_added', onMemberAdded);
      socket.off('workspace:member_removed', onMemberRemoved);
    };
  }, [socket, workspace?.id, originId]);

  const handleRemove = (member) => {
    if (member.is_owner || member.role === 'Owner') {
      toast.show('Workspace Owner cannot be removed from the workspace.', 'warning');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member from Workspace',
      message: `Are you sure you want to remove "${member.name}" from ${workspace?.name || 'this workspace'}? They will lose access to all boards in this workspace.`,
      confirmText: 'Remove Member',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await removeWorkspaceMember(workspace.id, member.id);
          toast.show(`${member.name} removed from workspace`, 'success');
          setMembers((prev) => prev.filter((m) => m.id !== member.id));
        } catch (err) {
          toast.show(err.message || 'Failed to remove member', 'error');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  const getRoleBadgeVariant = (roleName) => {
    const r = (roleName || '').toLowerCase();
    if (r.includes('owner')) return 'primary';
    if (r.includes('admin')) return 'info';
    if (r.includes('viewer') || r.includes('guest')) return 'secondary';
    return 'neutral';
  };

  if (!permissionsLoading && userRole && !canViewMembers) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app space-y-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-text-secondary">Redirecting to workspace home...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-6 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary-tint text-primary flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-text-primary tracking-tight">
                Workspace Members
              </h1>
            </div>
            <p className="text-sm text-text-muted">
              Viewing members assigned to <span className="font-semibold text-text-secondary">{workspace?.name || 'this workspace'}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-secondary">
              Total Members: {members.length}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members by name or email..."
              className="w-full pl-9 pr-4 py-2 bg-surface hover:bg-surface-hover focus:bg-surface border border-border focus:border-primary rounded-xl text-xs sm:text-sm font-medium text-text-primary placeholder:text-text-muted transition-colors outline-hidden shadow-2xs"
            />
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-surface border border-border/80 rounded-2xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Spinner size="lg" />
              <p className="text-xs font-semibold text-text-secondary">Loading workspace members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center text-text-muted">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">No members found</p>
              {search && (
                <p className="text-xs text-text-muted mt-1">
                  No member matches "{search}"
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-surface-muted/40 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Boards Assigned</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-surface-muted/30 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <Avatar name={member.name} src={member.avatar_url || member.avatar} user={member} size="sm" />
                          <div className="min-w-0">
                            <span className="font-bold text-text-primary block truncate">
                              {member.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-xs font-medium text-text-secondary min-w-[180px]">
                        <span className="truncate block">{member.email}</span>
                      </td>

                      {/* Boards Assigned */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        {member.boards && member.boards.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {member.boards.map((b) => (
                              <span
                                key={b.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-surface-muted border border-border/60 text-text-secondary truncate max-w-[140px]"
                                title={b.name}
                              >
                                <Layers className="w-3 h-3 text-primary shrink-0" />
                                <span className="truncate">{b.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">
                            No boards assigned
                          </span>
                        )}
                      </td>

                      {/* Role (Read Only) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant={getRoleBadgeVariant(member.role)}
                          className="font-bold text-xs"
                        >
                          {member.role || 'Team Member'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setAuditMember(member)}
                            leftIcon={<Activity className="w-3.5 h-3.5 text-primary" />}
                            className="cursor-pointer text-xs"
                            title={`View audit log for ${member.name}`}
                          >
                            Activity
                          </Button>

                          {canRemove && !member.is_owner && member.role !== 'Owner' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemove(member)}
                              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                              className="cursor-pointer text-xs"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {/* Member Audit Modal */}
      <MemberAuditModal
        isOpen={!!auditMember}
        onClose={() => setAuditMember(null)}
        member={auditMember}
        workspaceId={workspace?.id}
      />
    </div>
  );
}
