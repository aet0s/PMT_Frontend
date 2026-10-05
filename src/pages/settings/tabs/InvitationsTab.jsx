import React, { useState, useEffect } from 'react';
import { Mail, Copy, Check, Trash2, Clock, Sparkles } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { getWorkspaceInvitations, revokeInvitation } from '../../../api/invitations';
import { formatDate } from '../../../lib/dateFormat';
import { usePermissions } from '../../../context/PermissionContext';
import { useSocket } from '../../../context/SocketProvider';

export default function InvitationsTab({ workspace, onOpenInvite }) {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const { socket, originId } = useSocket();
  const canInvite = hasPermission('workspace.invite_members');

  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const loadInvitations = async () => {
    if (!workspace?.id) return;
    setIsLoading(true);
    try {
      const data = await getWorkspaceInvitations(workspace.id);
      setInvitations(data.invitations || []);
    } catch (err) {
      toast.show(err.message || 'Failed to load invitations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [workspace?.id]);

  useEffect(() => {
    if (!socket || !workspace?.id) return;
    socket.emit('join_workspace', { workspaceId: workspace.id });

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

    socket.on('workspace:invitation_created', onInviteCreated);
    socket.on('workspace:invitation_revoked', onInviteRevoked);

    return () => {
      socket.off('workspace:invitation_created', onInviteCreated);
      socket.off('workspace:invitation_revoked', onInviteRevoked);
      socket.emit('leave_workspace', { workspaceId: workspace.id });
    };
  }, [socket, workspace?.id, originId]);

  const handleCopyLink = (inv) => {
    const inviteUrl = `${window.location.origin}/invite?invite_token=${inv.token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(inv.id);
    toast.show('Invite link copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRevoke = async (invId) => {
    const prevInvitations = invitations;
    // Optimistic revoke
    setInvitations((prev) => prev.filter((i) => i.id !== invId));

    try {
      await revokeInvitation(invId);
      toast.show('Invitation revoked', 'success');
    } catch (err) {
      // Rollback on failure
      setInvitations(prevInvitations);
      toast.show(err.message || 'Failed to revoke invitation', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Active Invitations</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage pending team invite links and invitations sent for this workspace.
          </p>
        </div>

        {canInvite && onOpenInvite && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenInvite}
            leftIcon={<Mail className="w-4 h-4" />}
          >
            Send New Invite
          </Button>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-text-muted">Loading invitations...</div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">No pending invitations.</div>
        ) : (
          invitations.map((inv) => (
            <div
              key={inv.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary truncate">{inv.email}</span>
                  <Badge variant="neutral" size="sm">
                    {inv.role || 'member'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary">
                  <Clock className="w-3 h-3 text-text-muted shrink-0" />
                  <span>Created {formatDate(inv.created_at)}</span>
                  {inv.expires_at && <span>• Expires {formatDate(inv.expires_at)}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(inv)}
                  leftIcon={
                    copiedId === inv.id ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {copiedId === inv.id ? 'Copied' : 'Copy Link'}
                </Button>

                {canInvite && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(inv.id)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5 text-danger" />}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
