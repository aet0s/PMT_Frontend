import React, { useRef } from 'react';
import { usePermissions } from '../../context/PermissionContext';
import { Tag, Calendar, CheckSquare, Paperclip, Users, UserCheck, Target, Brain } from 'lucide-react';

export default function QuickAddRow({
  onOpenLabels,
  onOpenDates,
  onOpenChecklist,
  onOpenAttachment,
  onOpenMembers,
  onOpenAssigners,
  isFocus = false,
  isDeepWork = false,
  onToggleFocus,
  onToggleDeepWork,
  focusLoading = false
}) {
  const { hasPermission } = usePermissions();
  const labelsBtnRef = useRef(null);
  const datesBtnRef = useRef(null);
  const checklistBtnRef = useRef(null);
  const attachmentBtnRef = useRef(null);
  const membersBtnRef = useRef(null);
  const assignersBtnRef = useRef(null);

  const canAssignMembers = hasPermission('task.assign');
  const canEditCard = hasPermission('task.edit');
  const canManageAttachments = hasPermission('attachment.upload');
  const canFocus = hasPermission('task.focus');
  const canMarkDeepWork = hasPermission('task.mark_deep_work');

  return (
    <div className="flex flex-wrap items-center gap-2 select-none">
      {(canAssignMembers || canEditCard) && (
        <button
          ref={assignersBtnRef}
          type="button"
          onClick={() => onOpenAssigners && onOpenAssigners(assignersBtnRef)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-border text-text-primary border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Assigner</span>
        </button>
      )}

      {canAssignMembers && (
        <button
          ref={membersBtnRef}
          type="button"
          onClick={() => onOpenMembers(membersBtnRef)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-border text-text-primary border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Assignee</span>
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

      {canFocus && onToggleFocus && (
        <button
          type="button"
          onClick={onToggleFocus}
          disabled={focusLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isFocus && !isDeepWork
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-600 font-bold shadow-2xs'
              : 'bg-surface-muted hover:bg-border text-text-primary border-border'
          }`}
          title={isFocus ? 'Remove from today\'s focus' : 'Set as today\'s focus task'}
        >
          <Target className="w-3.5 h-3.5 text-amber-500" />
          <span>{isFocus && !isDeepWork ? 'Focused ✓' : 'Set Focus'}</span>
        </button>
      )}

      {canMarkDeepWork && onToggleDeepWork && (
        <button
          type="button"
          onClick={onToggleDeepWork}
          disabled={focusLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isDeepWork
              ? 'bg-purple-500/15 border-purple-500/50 text-purple-600 font-bold shadow-2xs'
              : 'bg-surface-muted hover:bg-border text-text-primary border-border'
          }`}
          title={isDeepWork ? 'Remove deep-work designation' : 'Designate as Deep Work (Exemption from daily activity churn)'}
        >
          <Brain className="w-3.5 h-3.5 text-purple-500" />
          <span>{isDeepWork ? 'Deep Work ✓' : 'Deep Work'}</span>
        </button>
      )}
    </div>
  );
}
