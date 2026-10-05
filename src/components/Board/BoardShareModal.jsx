import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Search,
  Check,
  UserCheck,
  UserX,
  Mail,
  Sparkles,
  Copy,
  Shield
} from 'lucide-react';
import { getBoardWorkspaceMembers, addBoardMemberById, removeBoardMember } from '../../api/boards';
import { inviteMembers } from '../../api/invitations';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Tabs from '../ui/Tabs';
import Select from '../ui/Select';

export default function BoardShareModal({
  isOpen,
  onClose,
  board,
  workspaces = [],
  currentWorkspace,
  onSuccess
}) {
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invite'

  // Workspace Members Tab state
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingUserId, setTogglingUserId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Invite tab state
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedWsId, setSelectedWsId] = useState('');
  const [selectedBoardIds, setSelectedBoardIds] = useState([]);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setSearchQuery('');
      setInviteEmail('');
      setInviteResult(null);
      setCopied(false);

      if (currentWorkspace?.id) {
        setSelectedWsId(currentWorkspace.id);
      }
      if (board?.id) {
        setSelectedBoardIds([board.id]);
      }
    }
  }, [isOpen, currentWorkspace, board]);

  useEffect(() => {
    if (!isOpen || !board?.id) return;

    const loadMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const data = await getBoardWorkspaceMembers(board.id);
        setMembers(data.members || []);
      } catch (err) {
        console.error('Failed to load board workspace members:', err);
        setErrorMsg('Failed to load workspace members for board');
      } finally {
        setIsLoadingMembers(false);
      }
    };

    loadMembers();
  }, [isOpen, board?.id]);

  if (!isOpen || !board) return null;

  const handleToggleAccess = async (member) => {
    setTogglingUserId(member.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (member.has_access && !member.is_workspace_admin) {
        await removeBoardMember(board.id, member.id);
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, has_access: false, board_role: null } : m))
        );
        setSuccessMsg(`Revoked board access for ${member.name}`);
      } else {
        await addBoardMemberById(board.id, member.id);
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, has_access: true, board_role: 'member' } : m))
        );
        setSuccessMsg(`Granted board access to ${member.name}`);
      }

      if (onSuccess) onSuccess();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update board permission:', err);
      setErrorMsg(err.message || 'Failed to update board permission');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInviteResult(null);

    if (!inviteEmail.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const wsId = selectedWsId || currentWorkspace?.id;
      const res = await inviteMembers(inviteEmail.trim(), Number(wsId), selectedBoardIds);
      const inviteUrl = res.invite_token
        ? `${window.location.origin}/register?invite_token=${res.invite_token}&email=${encodeURIComponent(inviteEmail.trim())}`
        : null;

      if (res.requires_registration) {
        setInviteResult({
          type: 'new_user',
          message: res.message || 'Invitation created! Share the registration link below:',
          inviteUrl
        });
      } else {
        setInviteResult({
          type: 'existing_user',
          message: `${inviteEmail} was granted access to the workspace and selected board(s).`,
          inviteUrl
        });
      }

      const updatedMembers = await getBoardWorkspaceMembers(board.id);
      setMembers(updatedMembers.members || []);

      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send invitation.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const accessCount = members.filter((m) => m.has_access).length;

  const tabsConfig = [
    { id: 'members', label: `Workspace Members (${members.length})` },
    { id: 'invite', label: 'Invite New Member', icon: <UserPlus className="w-3.5 h-3.5" /> }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${board.name}"`}
      description={`Grant or revoke board permissions (${accessCount} / ${members.length} members have access)`}
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4 text-left">
        <Tabs tabs={tabsConfig} activeTab={activeTab} onChange={setActiveTab} />

        {errorMsg && (
          <div className="p-3 text-xs font-semibold text-danger-text bg-danger-tint border border-danger/30 rounded-md">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 text-xs font-semibold text-success-text bg-success-tint border border-success/30 rounded-md flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            {successMsg}
          </div>
        )}

        {/* TAB 1: Members & Access */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Search workspace members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />

            {isLoadingMembers ? (
              <div className="py-8 text-center text-xs text-text-muted italic">
                Loading workspace members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted italic bg-surface-muted rounded-xl border border-border">
                No workspace members match your search query.
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden bg-surface divide-y divide-border max-h-64 overflow-y-auto">
                {filteredMembers.map((member) => {
                  const isToggling = togglingUserId === member.id;
                  const isSuperOrAdmin = member.is_workspace_admin;

                  return (
                    <div
                      key={member.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-surface-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={member.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-text-primary truncate">{member.name}</p>
                            {isSuperOrAdmin ? (
                              <Badge variant="primary" size="sm" icon={<Shield className="w-2.5 h-2.5" />}>
                                {member.workspace_role || 'Admin'}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-text-secondary font-medium">
                                ({member.workspace_role || 'Member'})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-text-secondary truncate">{member.email}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSuperOrAdmin ? (
                          <Badge variant="primary" size="md" icon={<UserCheck className="w-3.5 h-3.5" />}>
                            Full Admin Access
                          </Badge>
                        ) : member.has_access ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleAccess(member)}
                            isLoading={isToggling}
                            className="text-success-text hover:text-danger-text hover:bg-danger-tint"
                            leftIcon={<UserCheck className="w-3.5 h-3.5 text-success" />}
                          >
                            Has Access
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleToggleAccess(member)}
                            isLoading={isToggling}
                            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                          >
                            Grant Access
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Invite New Member */}
        {activeTab === 'invite' && (
          <div>
            {inviteResult ? (
              <div className="p-4 bg-primary-tint border border-primary/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-primary-text">
                  <Sparkles className="w-4 h-4 text-warning shrink-0" />
                  <span>Invitation Sent / Link Created</span>
                </div>
                <p className="text-xs text-text-secondary">{inviteResult.message}</p>

                {inviteResult.inviteUrl && (
                  <div className="mt-2 pt-2 border-t border-primary/20">
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      Direct Registration Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.inviteUrl}
                        onClick={(e) => e.target.select()}
                        className="flex-1 px-3 py-1.5 bg-surface border border-border rounded-md text-xs text-text-primary font-mono select-all focus:outline-none"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleCopyLink}
                        leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setInviteResult(null)}>
                    Invite Another
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <Input
                  label="User Email Address"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <div>
                  <Select
                    label="Workspace"
                    value={selectedWsId}
                    onChange={(val) => setSelectedWsId(val)}
                    options={workspaces.map((ws) => ({
                      value: ws.id,
                      label: ws.name
                    }))}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmittingInvite}
                    leftIcon={<UserPlus className="w-4 h-4" />}
                  >
                    Send Invitation
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
