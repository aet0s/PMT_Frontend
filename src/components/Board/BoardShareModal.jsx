import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Check,
  UserCheck,
  Shield,
  Layers,
  UserPlus
} from 'lucide-react';
import { getBoardWorkspaceMembers, addBoardMemberById, removeBoardMember } from '../../api/boards';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';

export default function BoardShareModal({
  isOpen,
  onClose,
  board,
  currentWorkspace,
  onSuccess
}) {
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingUserId, setTogglingUserId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setSearchQuery('');
    }
  }, [isOpen]);

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

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const accessCount = members.filter((m) => m.has_access).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Board Access: "${board.name}"`}
      description={`Manage which workspace members have access to this board (${accessCount} / ${members.length} members have access).`}
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4 text-left">
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
            <div className="border border-border rounded-xl overflow-hidden bg-surface divide-y divide-border max-h-72 overflow-y-auto">
              {filteredMembers.map((member) => {
                const isToggling = togglingUserId === member.id;
                const isSuperOrAdmin = member.is_workspace_admin;

                return (
                  <div
                    key={member.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-surface-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={member.name} src={member.avatar_url || member.avatar} user={member} size="sm" />
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
      </div>
    </Modal>
  );
}
