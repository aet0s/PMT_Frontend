import React, { useState } from 'react';
import Popover from '../shared/Popover';
import Avatar from '../shared/Avatar';
import { Search, Check, Lock } from 'lucide-react';

export default function MembersPopover({
  isOpen,
  onClose,
  anchorRef,
  title = 'Members',
  searchPlaceholder = 'Search members...',
  cardMembers = [],
  boardMembers = [],
  onToggleMember,
  canManageAll = true,
  currentUserId,
  cardAssigners = []
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const isAssigned = (userId) => {
    return cardMembers.some((m) => Number(m.id) === Number(userId));
  };

  const isAssigner = (userId) => {
    return cardAssigners.some((a) => Number(a.id) === Number(userId));
  };

  // Determine if a specific member item is locked from modification by the current user
  const getLockInfo = (member) => {
    if (canManageAll) {
      return { isLocked: false, reason: '' };
    }

    const memberId = Number(member.id);
    const myId = Number(currentUserId);
    const assigned = isAssigned(memberId);

    // In 'Assigners' popover, non-managers cannot modify any assigners
    if (title === 'Assigners') {
      return {
        isLocked: true,
        reason: 'Only card assigners or administrators can modify card assigners'
      };
    }

    // In 'Assignees' popover:
    if (assigned) {
      // 1. Current user cannot remove themselves from assignee
      if (memberId === myId) {
        return {
          isLocked: true,
          reason: 'You cannot remove yourself as an assignee from this card'
        };
      }

      // 2. Cannot remove other assignees unless the current user was the one who added them
      const memberEntry = cardMembers.find((m) => Number(m.id) === memberId);
      if (memberEntry?.assigned_by_user_id && Number(memberEntry.assigned_by_user_id) !== myId) {
        return {
          isLocked: true,
          reason: 'Only the assigner who assigned this member can remove them'
        };
      }

      return { isLocked: false, reason: '' };
    } else {
      // 3. Team members cannot assign an existing card assigner as an assignee
      if (isAssigner(memberId)) {
        return {
          isLocked: true,
          reason: 'Card assigners cannot be assigned as assignees by team members'
        };
      }

      return { isLocked: false, reason: '' };
    }
  };

  const filteredMembers = boardMembers
    .filter((m) =>
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aAssigned = isAssigned(a.id);
      const bAssigned = isAssigned(b.id);
      if (aAssigned && !bAssigned) return -1;
      if (!aAssigned && bAssigned) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} title={title} className="w-72">
      <div className="space-y-3 text-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Board Members List */}
        <div>
          <span className="block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
            Board Members
          </span>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <p className="text-text-muted italic py-2 text-center">No members found</p>
            ) : (
              filteredMembers.map((member) => {
                const assigned = isAssigned(member.id);
                const { isLocked, reason } = getLockInfo(member);

                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={isLocked}
                    title={reason || undefined}
                    onClick={() => !isLocked && onToggleMember(member.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left ${
                      isLocked
                        ? 'opacity-60 cursor-not-allowed bg-surface-muted/40'
                        : assigned
                          ? 'bg-primary-tint text-primary cursor-pointer hover:bg-primary-tint/80'
                          : 'hover:bg-surface-muted text-text-primary cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={member.name} email={member.email} src={member.avatar_url || member.avatar} user={member} size="sm" />
                      <div className="min-w-0">
                        <span className="block font-medium text-xs text-text-primary truncate">{member.name}</span>
                        <span className="block text-[10px] text-text-muted truncate">{member.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isLocked && <Lock className="w-3.5 h-3.5 text-text-muted" />}
                      {assigned && !isLocked && <Check className="w-4 h-4 text-primary" />}
                      {assigned && isLocked && <Check className="w-4 h-4 text-text-muted" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Popover>
  );
}
