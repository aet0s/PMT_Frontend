import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';
import Select from '../ui/Select';
import { Mail, LayoutGrid, Copy, Check, Sparkles, UserPlus, Shield } from 'lucide-react';
import { inviteMembers } from '../../api/invitations';
import { getBoards } from '../../api/boards';
import { getWorkspaceRoles } from '../../api/workspaces';

export default function InviteModal({
  isOpen,
  onClose,
  workspaces = [],
  currentWorkspace,
  currentBoard,
  onSuccess
}) {
  const [email, setEmail] = useState('');
  const [selectedWsId, setSelectedWsId] = useState('');
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [availableBoards, setAvailableBoards] = useState([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setErrorMsg('');
      setInviteResult(null);
      setCopied(false);

      const initialWsId = currentWorkspace?.id || (workspaces[0]?.id ? workspaces[0].id : '');
      setSelectedWsId(initialWsId);
    }
  }, [isOpen, currentWorkspace, workspaces]);

  useEffect(() => {
    if (!isOpen || !selectedWsId) {
      if (!isOpen) {
        setAvailableBoards([]);
        setSelectedBoardIds([]);
        setRoles([]);
        setSelectedRoleId('');
      }
      return;
    }

    const fetchWorkspaceBoards = async () => {
      setIsLoadingBoards(true);
      try {
        const data = await getBoards(selectedWsId);
        const boardsList = data.boards || [];
        setAvailableBoards(boardsList);
        if (currentBoard?.id && boardsList.some((b) => b.id === currentBoard.id)) {
          setSelectedBoardIds([currentBoard.id]);
        } else if (boardsList.length > 0) {
          setSelectedBoardIds([boardsList[0].id]);
        } else {
          setSelectedBoardIds([]);
        }
      } catch (err) {
        console.error('Failed to load boards for invitation:', err);
      } finally {
        setIsLoadingBoards(false);
      }
    };

    const fetchWorkspaceRoles = async () => {
      setIsLoadingRoles(true);
      try {
        const data = await getWorkspaceRoles(selectedWsId);
        const assignableRoles = (data.roles || []).filter(
          (r) => r.name !== 'Owner' && r.name !== 'Super Admin'
        );
        setRoles(assignableRoles);
        const defaultRole = assignableRoles.find((r) => r.name === 'Team Member') || assignableRoles[0];
        if (defaultRole) {
          setSelectedRoleId(String(defaultRole.id));
        }
      } catch (err) {
        console.error('Failed to load roles for invitation:', err);
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchWorkspaceBoards();
    fetchWorkspaceRoles();
  }, [isOpen, selectedWsId, currentBoard]);

  if (!isOpen) return null;

  const toggleBoardSelection = (boardId) => {
    setSelectedBoardIds((prev) =>
      prev.includes(boardId) ? prev.filter((id) => id !== boardId) : [...prev, boardId]
    );
  };

  const toggleSelectAllBoards = () => {
    if (selectedBoardIds.length === availableBoards.length) {
      setSelectedBoardIds([]);
    } else {
      setSelectedBoardIds(availableBoards.map((b) => b.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInviteResult(null);

    if (!email.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!selectedWsId) {
      setErrorMsg('Please select a workspace.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await inviteMembers(
        email.trim(),
        Number(selectedWsId),
        selectedBoardIds,
        selectedRoleId ? Number(selectedRoleId) : null
      );
      const inviteUrl = res.invite_url || (res.invite_token
        ? `${window.location.origin}/register?invite_token=${res.invite_token}&email=${encodeURIComponent(email.trim())}`
        : null);

      const assignedRoleObj = roles.find((r) => String(r.id) === String(selectedRoleId));
      const roleDisplayName = res.role_name || assignedRoleObj?.name || 'Team Member';

      if (res.requires_registration) {
        setInviteResult({
          type: 'new_user',
          message: res.message || `Invitation created as ${roleDisplayName}! Share the registration link below with the user to complete signup:`,
          inviteUrl,
          roleName: roleDisplayName
        });
      } else {
        setInviteResult({
          type: 'existing_user',
          message: `${email} was added as ${roleDisplayName} to the workspace and selected boards. You can also copy the direct link below for testing:`,
          inviteUrl,
          roleName: roleDisplayName
        });
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Team Member"
      description="Grant workspace & board level access"
      size="md"
      footer={
        inviteResult ? (
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Send Invitation
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4 text-left">
        {errorMsg && (
          <div className="p-3 text-xs font-semibold text-danger-text bg-danger-tint border border-danger/30 rounded-md">
            {errorMsg}
          </div>
        )}

        {inviteResult ? (
          <div className="p-4 bg-primary-tint border border-primary/30 rounded-xl text-text-primary text-sm space-y-3 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-primary-text">
              <Sparkles className="w-4 h-4 text-warning shrink-0" />
              <span>Invitation Created</span>
            </div>
            <p className="text-xs text-text-secondary">{inviteResult.message}</p>

            {inviteResult.inviteUrl && (
              <div className="mt-3 pt-3 border-t border-primary/20">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center justify-between">
                  <span>Registration Link</span>
                  <span className="text-[10px] text-text-muted font-normal">Click input to auto-select</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.inviteUrl}
                    onClick={(e) => e.target.select()}
                    className="flex-1 px-3.5 py-2 bg-surface border border-border rounded-md text-xs text-text-primary font-mono select-all focus:outline-none focus:border-primary"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCopyLink}
                    leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div>
              <Select
                label="Target Workspace"
                value={selectedWsId}
                onChange={(val) => setSelectedWsId(val)}
                options={workspaces.map((ws) => ({
                  value: ws.id,
                  label: `${ws.name} (${ws.role || 'member'})`
                }))}
              />
            </div>

            <div>
              <Select
                label="Assigned Role"
                value={selectedRoleId}
                disabled={isLoadingRoles}
                onChange={(val) => setSelectedRoleId(val)}
                options={roles.length > 0 ? roles.map((r) => ({
                  value: String(r.id),
                  label: `${r.name} (${(r.permission_keys || []).length} permissions)`
                })) : [
                  { value: '', label: isLoadingRoles ? 'Loading roles...' : 'Team Member (Default)' }
                ]}
              />
              <p className="text-[11px] text-text-muted mt-1">
                Permissions granted to the invited member will follow this role.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                  Select Specific Boards
                </label>
                {availableBoards.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllBoards}
                    className="text-[11px] font-semibold text-primary hover:text-primary-hover cursor-pointer"
                  >
                    {selectedBoardIds.length === availableBoards.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              <div className="max-h-44 overflow-y-auto bg-surface border border-border rounded-xl p-2 space-y-1">
                {isLoadingBoards ? (
                  <div className="py-4 text-center text-xs text-text-muted">Loading boards...</div>
                ) : availableBoards.length === 0 ? (
                  <div className="py-4 text-center text-xs text-text-muted">No active boards in this workspace</div>
                ) : (
                  availableBoards.map((board) => {
                    const isSelected = selectedBoardIds.includes(board.id);
                    return (
                      <div
                        key={board.id}
                        onClick={() => toggleBoardSelection(board.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary-tint text-primary-text font-medium border border-primary/20' : 'hover:bg-surface-muted text-text-primary'
                        }`}
                      >
                        <span className="text-xs truncate">{board.name}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded border-border-strong text-primary pointer-events-none"
                        />
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">
                Members will only be granted access to the boards checked above.
              </p>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
