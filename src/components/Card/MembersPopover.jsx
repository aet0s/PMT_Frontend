import React, { useState } from 'react';
import Popover from '../shared/Popover';
import Avatar from '../shared/Avatar';
import { Search, Check } from 'lucide-react';

export default function MembersPopover({
  isOpen,
  onClose,
  anchorRef,
  cardMembers = [],
  boardMembers = [],
  onToggleMember
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = boardMembers.filter((m) =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAssigned = (userId) => {
    return cardMembers.some((m) => m.id === userId);
  };

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} title="Members" className="w-72">
      <div className="space-y-3 text-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
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
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onToggleMember(member.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer text-left ${
                      assigned ? 'bg-primary-tint text-primary' : 'hover:bg-surface-muted text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={member.name} email={member.email} size="sm" />
                      <div>
                        <span className="block font-medium text-xs text-text-primary">{member.name}</span>
                        <span className="block text-[10px] text-text-muted">{member.email}</span>
                      </div>
                    </div>
                    {assigned && <Check className="w-4 h-4 text-primary" />}
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
