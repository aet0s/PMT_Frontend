import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LabelPill from '../shared/LabelPill';
import Avatar from '../ui/Avatar';
import { Menu, MenuItem, MenuDivider } from '../ui/Menu';
import { formatShortDate } from '../../lib/dateFormat';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Check,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2
} from 'lucide-react';

export default function Card({
  card,
  onClick,
  onUpdateCard,
  onDeleteCard,
  onCopyCard,
  isOverlay = false,
  isHighlighted = false,
  isRemoteDragging = false
}) {
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
    opacity: isDragging || isRemoteDragging ? 0.35 : 1
  };

  // Due date status calculation
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

  const startDateText = card.start_date ? formatShortDate(card.start_date) : null;

  // Checklist completion
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

  // Detect image attachment for card preview thumbnail
  const imageAttachment = (card.attachments || []).find((att) => {
    const url = att.url || att.file_url || '';
    const type = att.file_type || att.mime_type || '';
    return type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(url);
  });

  // Extract clean plain text snippet from description HTML
  const descriptionSnippet = card.description && card.description !== '<p></p>'
    ? card.description.replace(/<[^>]*>/g, '').trim()
    : '';

  return (
    <div
      id={`card-${card.id}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable card"
      aria-label={`Card: ${card.title}. Press Space or Enter to open.`}
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick && e.target === e.currentTarget) {
          e.preventDefault();
          onClick();
        }
      }}
      onClick={(e) => {
        if (e.target.closest('button[aria-label="Card actions"]') || e.defaultPrevented) return;
        onClick?.();
      }}
      className={`group relative bg-surface border border-border/80 hover:border-primary/40 rounded-2xl p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none space-y-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary ${
        isOverlay ? 'shadow-2xl border-primary ring-2 ring-primary/20 scale-105 rotate-1 z-50 bg-surface' : ''
      } ${
        isHighlighted ? 'ring-2 ring-primary border-primary shadow-lg animate-pulse' : ''
      }`}
    >
      {/* Top Header: Label Pill & Action Menu */}
      <div className="flex items-center justify-between gap-2 min-h-[24px]">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {card.labels && card.labels.length > 0 ? (
            card.labels.map((l) => (
              <LabelPill key={l.id} name={l.name} color={l.color} size="sm" />
            ))
          ) : (
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
              Task #{card.id}
            </span>
          )}
        </div>

        {/* 3-Dots Action Dropdown Menu */}
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <Menu
            placement="bottom-end"
            trigger={
              <button
                type="button"
                aria-label="Card actions"
                title="Card actions"
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-muted transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
              >
                <MoreHorizontal className="w-4.5 h-4.5" />
              </button>
            }
          >
            {onCopyCard && (
              <MenuItem
                icon={<Copy className="w-4 h-4 text-primary" />}
                onClick={(e) => {
                  e?.stopPropagation?.();
                  onCopyCard(card);
                }}
              >
                Copy Card
              </MenuItem>
            )}
            {onUpdateCard && (
              <MenuItem
                icon={<Archive className="w-4 h-4 text-warning" />}
                onClick={(e) => {
                  e?.stopPropagation?.();
                  onUpdateCard(card.id, { is_archived: true });
                }}
              >
                Archive Card
              </MenuItem>
            )}
            {onDeleteCard && (
              <>
                <MenuDivider />
                <MenuItem
                  icon={<Trash2 className="w-4 h-4 text-danger" />}
                  danger
                  onClick={(e) => {
                    e?.stopPropagation?.();
                    onDeleteCard(card.id);
                  }}
                >
                  Delete Card
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </div>

      {/* Card Title & Complete Status */}
      <div className="flex items-start gap-2">
        {card.is_complete && (
          <span className="mt-0.5 w-4.5 h-4.5 rounded-full bg-success text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </span>
        )}
        <h4
          className={`text-[15px] sm:text-base font-bold leading-snug break-words transition-colors ${
            card.is_complete
              ? 'line-through text-text-muted'
              : 'text-text-primary group-hover:text-primary'
          }`}
        >
          {card.title}
        </h4>
      </div>

      {/* Description Snippet */}
      {descriptionSnippet && (
        <p className="text-xs sm:text-[13px] text-text-secondary line-clamp-2 leading-relaxed">
          {descriptionSnippet}
        </p>
      )}

      {/* Visual Image Preview (if card has an image attachment) */}
      {imageAttachment && (
        <div className="relative rounded-xl overflow-hidden border border-border/60 bg-surface-muted max-h-36 shadow-inner">
          <img
            src={imageAttachment.url || imageAttachment.file_url}
            alt={imageAttachment.file_name || 'Card preview'}
            className="w-full h-32 object-cover transition-transform group-hover:scale-102 duration-300"
            onError={(e) => {
              // Hide broken image smoothly
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Card Footer: Assignee Avatars on Left, Metadata Counters on Right */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-text-secondary text-xs">
        {/* Assignee / Member Avatars (Pure circular with no square boundaries) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {((card.assigners && card.assigners.length > 0) || (card.members && card.members.length > 0)) ? (
            <div className="flex items-center">
              {card.assigners && card.assigners.length > 0 && (
                <div
                  className="flex -space-x-1.5 mr-1"
                  title={`Assigners: ${card.assigners.map((a) => a.name).join(', ')}`}
                >
                  {card.assigners.map((a) => (
                    <Avatar
                      key={a.id}
                      name={a.name}
                      size="xs"
                      className="rounded-full ring-2 ring-surface shadow-2xs"
                    />
                  ))}
                </div>
              )}
              {card.members && card.members.length > 0 && (
                <div
                  className="flex -space-x-1.5"
                  title={`Assignees: ${card.members.map((m) => m.name).join(', ')}`}
                >
                  {card.members.map((m) => (
                    <Avatar
                      key={m.id}
                      name={m.name}
                      size="xs"
                      className="rounded-full ring-2 ring-surface shadow-2xs"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-5.5 h-5.5 rounded-full border border-dashed border-border flex items-center justify-center text-[10px] text-text-muted" title="Unassigned">
              —
            </div>
          )}
        </div>

        {/* Metadata Icons: Comments, Attachments, Checklists, Due Date */}
        <div className="flex items-center gap-2.5 text-xs text-text-muted font-medium">
          {/* Due date badge */}
          {dueDateStatus && (
            <div
              title={`Due: ${dueDateStatus.fullText}`}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                dueDateStatus.isComplete
                  ? 'bg-success-tint text-success-text'
                  : dueDateStatus.isOverdue
                  ? 'bg-danger-tint text-danger-text'
                  : dueDateStatus.isDueSoon
                  ? 'bg-warning-tint text-warning-text'
                  : 'bg-surface-muted text-text-secondary'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dueDateStatus.text}</span>
            </div>
          )}

          {/* Checklist progress */}
          {totalItems > 0 && (
            <div
              title="Checklist completion"
              className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
                checkedItems === totalItems
                  ? 'bg-success-tint text-success-text'
                  : 'bg-surface-muted text-text-secondary'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{checkedItems}/{totalItems}</span>
            </div>
          )}

          {/* Attachments count */}
          {card.attachments && card.attachments.length > 0 && (
            <div title="Attachments" className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="text-xs">{card.attachments.length}</span>
            </div>
          )}

          {/* Comments count */}
          {card.comments_count > 0 && (
            <div title="Comments" className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs">{card.comments_count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
