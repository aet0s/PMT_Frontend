import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LabelPill from '../shared/LabelPill';
import Avatar from '../ui/Avatar';
import { formatShortDate } from '../../lib/dateFormat';
import { Calendar, CheckSquare, MessageSquare, AlignLeft, Check, Paperclip, CalendarRange } from 'lucide-react';

export default function Card({ card, onClick, isOverlay = false, isHighlighted = false, isRemoteDragging = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `card-${card.id}`,
    data: { type: 'card', card }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isRemoteDragging ? 0.3 : 1
  };

  // Due date logic & color coding
  let dueDateStatus = null;
  if (card.due_date) {
    const due = new Date(card.due_date);
    const now = new Date();
    const isOverdue = due < now && !card.is_complete;
    const isDueSoon = due - now < 24 * 60 * 60 * 1000 && due >= now && !card.is_complete;

    dueDateStatus = {
      text: formatShortDate(due),
      fullText: new Date(card.due_date).toLocaleString(),
      isOverdue,
      isDueSoon,
      isComplete: card.is_complete
    };
  }

  // Start date
  const startDateText = card.start_date ? formatShortDate(card.start_date) : null;

  // Checklist progress logic
  let totalItems = 0;
  let checkedItems = 0;
  if (card.checklists) {
    card.checklists.forEach((ch) => {
      if (ch.items) {
        totalItems += ch.items.length;
        checkedItems += ch.items.filter((i) => i.is_checked).length;
      }
    });
  }

  return (
    <div
      id={`card-${card.id}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable card"
      aria-label={`Card: ${card.title}. Press Space or Enter to reorder.`}
      onClick={onClick}
      className={`group relative bg-surface hover:bg-surface-hover border border-border hover:border-border-strong rounded-lg p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer select-none space-y-2.5 ${
        isOverlay ? 'shadow-lg border-primary scale-105 rotate-1 z-50 bg-surface' : ''
      } ${
        isHighlighted ? 'ring-2 ring-primary border-primary shadow-md animate-pulse' : ''
      }`}
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.labels.map((l) => (
            <LabelPill key={l.id} name={l.name} color={l.color} size="xs" />
          ))}
        </div>
      )}

      {/* Card Title & Complete Status */}
      <div className="flex items-start gap-2">
        {card.is_complete && (
          <span className="mt-0.5 w-4 h-4 rounded-full bg-success text-white flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 stroke-[3]" />
          </span>
        )}
        <h4
          className={`text-sm font-semibold leading-snug break-words ${
            card.is_complete ? 'line-through text-text-muted' : 'text-text-primary group-hover:text-primary transition-colors'
          }`}
        >
          {card.title}
        </h4>
      </div>

      {/* Badges Footer */}
      <div className="flex items-center justify-between pt-1 text-text-secondary text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Start date badge */}
          {startDateText && (
            <div
              title={`Start: ${card.start_date}`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-surface-muted text-text-secondary border border-border"
            >
              <CalendarRange className="w-3 h-3" />
              <span>{startDateText}</span>
            </div>
          )}

          {/* Due date badge */}
          {dueDateStatus && (
            <div
              title={`Due: ${dueDateStatus.fullText}`}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                dueDateStatus.isComplete
                  ? 'bg-success-tint text-success-text border border-success/20'
                  : dueDateStatus.isOverdue
                  ? 'bg-danger-tint text-danger-text border border-danger/20'
                  : dueDateStatus.isDueSoon
                  ? 'bg-warning-tint text-warning-text border border-warning/20'
                  : 'bg-surface-muted text-text-secondary border border-border'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{dueDateStatus.text}</span>
            </div>
          )}

          {/* Description indicator */}
          {card.description && card.description !== '<p></p>' && (
            <div title="Has description" className="flex items-center gap-1 text-text-muted">
              <AlignLeft className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Attachments count */}
          {card.attachments && card.attachments.length > 0 && (
            <div title="Attachments" className="flex items-center gap-1 text-[11px] text-text-muted">
              <Paperclip className="w-3.5 h-3.5" />
              <span>{card.attachments.length}</span>
            </div>
          )}

          {/* Checklist progress */}
          {totalItems > 0 && (
            <div
              title="Checklist completion"
              className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
                checkedItems === totalItems
                  ? 'bg-success-tint text-success-text border border-success/20'
                  : 'bg-surface-muted text-text-secondary border border-border'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>
                {checkedItems}/{totalItems}
              </span>
            </div>
          )}

          {/* Comments count */}
          {card.comments_count > 0 && (
            <div title="Comments" className="flex items-center gap-1 text-xs text-text-muted">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{card.comments_count}</span>
            </div>
          )}
        </div>

        {/* Assigned Member Avatars */}
        {card.members && card.members.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
            {card.members.map((m) => (
              <Avatar key={m.id} name={m.name} size="xs" className="ring-2 ring-surface" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
