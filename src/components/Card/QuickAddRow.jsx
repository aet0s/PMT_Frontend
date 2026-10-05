import React, { useRef } from 'react';
import { usePermissions } from '../../context/PermissionContext';
import { Tag, Calendar, CheckSquare, Paperclip, Users } from 'lucide-react';

export default function QuickAddRow({
  onOpenLabels,
  onOpenDates,
  onOpenChecklist,
  onOpenAttachment,
  onOpenMembers
}) {
  const { hasPermission } = usePermissions();
  const labelsBtnRef = useRef(null);
  const datesBtnRef = useRef(null);
  const checklistBtnRef = useRef(null);
  const attachmentBtnRef = useRef(null);
  const membersBtnRef = useRef(null);

  const canAssignMembers = hasPermission('card.assign_members');
  const canEditCard = hasPermission('card.edit');
  const canManageAttachments = hasPermission('card.manage_attachments');

  return (
    <div className="flex flex-wrap items-center gap-2 select-none">
      {canAssignMembers && (
        <button
          ref={membersBtnRef}
          type="button"
          onClick={() => onOpenMembers(membersBtnRef)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-border text-text-primary border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Members</span>
        </button>
      )}

      {canEditCard && (
        <>
          <button
            ref={labelsBtnRef}
            type="button"
            onClick={() => onOpenLabels(labelsBtnRef)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-border text-text-primary border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5 text-success" />
            <span>Labels</span>
          </button>

          <button
            ref={datesBtnRef}
            type="button"
            onClick={() => onOpenDates(datesBtnRef)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-border text-text-primary border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-warning" />
            <span>Dates</span>
          </button>

          <button
            ref={checklistBtnRef}
            type="button"
            onClick={() => onOpenChecklist(checklistBtnRef)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-border text-text-primary border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-primary" />
            <span>Checklist</span>
          </button>
        </>
      )}

      {canManageAttachments && (
        <button
          ref={attachmentBtnRef}
          type="button"
          onClick={() => onOpenAttachment(attachmentBtnRef)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-border text-text-primary border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <Paperclip className="w-3.5 h-3.5 text-info" />
          <span>Attachment</span>
        </button>
      )}
    </div>
  );
}
