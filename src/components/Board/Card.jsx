import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LabelPill from '../shared/LabelPill';
import Avatar from '../ui/Avatar';
import { Menu, MenuItem, MenuDivider } from '../ui/Menu';
import { formatShortDate, getServerNow } from '../../lib/dateFormat';
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
import { usePermissions } from '../../context/PermissionContext';
import { useAuth } from '../../hooks/useAuth';
import { getListStatusConfig, getCardDefaultStatus } from '../../lib/listStatusColors';

export default function Card({
  card,
  listName,
  taskNumber,
  onClick,
  onUpdateCard,
  onDeleteCard,
  onCopyCard,
  isOverlay = false,
  isHighlighted = false,
  isRemoteDragging = false,
  focusMode = false
}) {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const currentUserId = user?.id ? Number(user.id) : null;
  const isAssignee = Boolean(
    currentUserId &&
    (card?.members || []).some((m) => Number(m.id || m.user_id) === currentUserId)
  );
  const isAssigner = Boolean(
    currentUserId && (
      (card?.assigners || []).some((a) => Number(a.id || a.user_id) === currentUserId) ||
      (card?.created_by && Number(card.created_by) === currentUserId) ||
      (card?.creator_id && Number(card.creator_id) === currentUserId)
    )
  );
  const isMyCard = isAssignee || isAssigner;

  const isCardCreator = Boolean(card?.created_by && currentUserId && Number(card.created_by) === currentUserId);
  const canDeleteCard = hasPermission('task.delete') || (hasPermission('task.delete_own') && isCardCreator);
  const canCopyCard = hasPermission('task.duplicate') || hasPermission('task.create');
  const canArchiveCard = hasPermission('task.archive') || hasPermission('task.edit');
  const hasAnyCardActions = (onCopyCard && canCopyCard) || (onUpdateCard && canArchiveCard) || (onDeleteCard && canDeleteCard);
  const statusConfig = getListStatusConfig(getCardDefaultStatus(card, listName));

  const [memberTooltip, setMemberTooltip] = useState(null);

  const showMemberTooltip = (e, member, roleType) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMemberTooltip({
      member,
      roleType,
      rect
    });
  };

  const hideMemberTooltip = () => {
    setMemberTooltip(null);
  };

  useEffect(() => {
    if (!memberTooltip) return;
    const handleDismiss = () => setMemberTooltip(null);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [memberTooltip]);

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
    const now = getServerNow();
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
        hideMemberTooltip();
        if (e.target.closest('button[aria-label="Card actions"]') || e.defaultPrevented) return;
        onClick?.();
      }}
      className={`group relative bg-surface border border-border/80 rounded-2xl p-4 transition-all duration-200 cursor-pointer select-none space-y-3 shadow-xs hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary ${
        focusMode
          ? isMyCard
            ? `${
                statusConfig?.key
                  ? `card-fullborder-${statusConfig.key}`
                  : 'card-fullborder-default'
              } opacity-100 scale-[1.01] bg-surface z-10 hover:-translate-y-0.5`
            : 'border-border/60 opacity-35 hover:opacity-100 hover:scale-[1.005] saturate-50 hover:saturate-100'
          : statusConfig
          ? `${statusConfig.cardClass} hover:border-t-primary/40 hover:border-x-primary/40 hover:-translate-y-0.5`
          : 'border-border/80 hover:border-primary/40 shadow-xs hover:shadow-md hover:-translate-y-0.5'
      } ${
        isOverlay ? 'shadow-2xl border-primary ring-2 ring-primary/20 scale-105 rotate-1 z-50 bg-surface' : ''
      } ${
        isHighlighted ? 'ring-2 ring-primary border-primary shadow-lg animate-pulse' : ''
      }`}
    >
      {/* Top Header: Label Pill, Role Badge & Action Menu */}
      <div className="flex items-center justify-between gap-2 min-h-[24px]">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
            Task #{taskNumber ?? card.task_number ?? 1}
          </span>
          {/* Focused My Card Role Badge: only shown in Focus Mode */}
          {focusMode && isMyCard && (
            <span
              title={
                isAssignee && isAssigner
                  ? 'You are both an assigner and assignee on this task'
                  : isAssignee
                  ? 'You are assigned to this task'
                  : 'You assigned / created this task'
              }
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 border select-none transition-all ${
                isAssignee && isAssigner
                  ? 'bg-label-amber text-label-amber-text border-label-amber-text/25'
                  : isAssignee
                  ? 'bg-label-green text-label-green-text border-label-green-text/25'
                  : 'bg-label-purple text-label-purple-text border-label-purple-text/25'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isAssignee && isAssigner
                    ? 'bg-label-amber-text'
                    : isAssignee
                    ? 'bg-label-green-text'
                    : 'bg-label-purple-text'
                }`}
              />
              <span className="truncate">
                {isAssignee && isAssigner
                  ? 'Mine (Both)'
                  : isAssignee
                  ? 'Assigned to you'
                  : 'Assigned by you'}
              </span>
            </span>
          )}
          {card.labels && card.labels.length > 0 &&
            card.labels.map((l) => (
              <LabelPill key={l.id} name={l.name} color={l.color} size="sm" />
            ))}
        </div>

        {/* 3-Dots Action Dropdown Menu */}
        {hasAnyCardActions && (
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
              {onCopyCard && canCopyCard && (
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
              {onUpdateCard && canArchiveCard && (
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
              {onDeleteCard && canDeleteCard && (
                <>
                  {(canCopyCard || canArchiveCard) && <MenuDivider />}
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
        )}
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
        {/* Assignee / Member Avatars (Pure circular with custom hover popup matching sidebar) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {((card.assigners && card.assigners.length > 0) || (card.members && card.members.length > 0)) ? (
            <div className="flex items-center">
              {card.assigners && card.assigners.length > 0 && (
                <div className="flex -space-x-1.5 mr-1">
                  {card.assigners.map((a) => (
                    <div
                      key={a.id}
                      onMouseEnter={(e) => showMemberTooltip(e, a, 'Assigner')}
                      onMouseLeave={hideMemberTooltip}
                      className="relative inline-block cursor-pointer"
                    >
                      <Avatar
                        name={a.name}
                        src={a.avatar_url || a.avatar}
                        user={a}
                        size="xs"
                        className="rounded-full ring-2 ring-surface shadow-2xs"
                        title=""
                      />
                    </div>
                  ))}
                </div>
              )}
              {card.members && card.members.length > 0 && (
                <div className="flex -space-x-1.5">
                  {card.members.map((m) => (
                    <div
                      key={m.id}
                      onMouseEnter={(e) => showMemberTooltip(e, m, 'Assignee')}
                      onMouseLeave={hideMemberTooltip}
                      className="relative inline-block cursor-pointer"
                    >
                      <Avatar
                        name={m.name}
                        src={m.avatar_url || m.avatar}
                        user={m}
                        size="xs"
                        className="rounded-full ring-2 ring-surface shadow-2xs"
                        title=""
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-5.5 h-5.5 rounded-full border border-dashed border-border flex items-center justify-center text-[10px] text-text-muted">
              —
            </div>
          )}
        </div>

        {/* Metadata Icons: Comments, Attachments, Checklists, Due Date */}
        <div className="flex items-center gap-2.5 text-xs text-text-muted font-medium">
          {/* Date badge (Start date & Due date) */}
          {(dueDateStatus || startDateText) && (
            <div
              title={
                startDateText && dueDateStatus
                  ? `Start: ${startDateText} · Due: ${dueDateStatus.fullText}`
                  : startDateText
                  ? `Start: ${startDateText}`
                  : `Due: ${dueDateStatus.fullText}`
              }
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                dueDateStatus?.isComplete
                  ? 'bg-success-tint text-success-text'
                  : dueDateStatus?.isOverdue
                  ? 'bg-danger-tint text-danger-text'
                  : dueDateStatus?.isDueSoon
                  ? 'bg-warning-tint text-warning-text'
                  : 'bg-surface-muted text-text-secondary'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {startDateText && dueDateStatus
                  ? `${startDateText} - ${dueDateStatus.text}`
                  : startDateText
                  ? startDateText
                  : dueDateStatus.text}
              </span>
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

      {/* Theme-matched Member Hover Tooltip Popup (Centered directly above/below hovered avatar) */}
      {memberTooltip && !isDragging && typeof document !== 'undefined' && createPortal(
        (() => {
          const avatarCenter = memberTooltip.rect.left + memberTooltip.rect.width / 2;
          const popupHalfWidth = 130;
          const clampedCenter = Math.max(popupHalfWidth + 12, Math.min(window.innerWidth - popupHalfWidth - 12, avatarCenter));
          const caretOffset = Math.max(-popupHalfWidth + 24, Math.min(popupHalfWidth - 24, avatarCenter - clampedCenter));
          const isPlacedAbove = memberTooltip.rect.top > 95;
          return (
            <div
              role="tooltip"
              className="fixed z-[9999] pointer-events-none"
              style={{
                top: `${isPlacedAbove ? memberTooltip.rect.top - 8 : memberTooltip.rect.bottom + 8}px`,
                left: `${clampedCenter}px`,
                transform: isPlacedAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
              }}
            >
              <div className="relative flex items-center gap-3 bg-surface text-text-primary p-2.5 rounded-2xl border border-border shadow-xl min-w-[210px] max-w-[280px] animate-popup-card">
                {/* Dynamic Caret indicator pointing directly at the center of the hovered avatar */}
                {isPlacedAbove ? (
                  <span
                    className="absolute -bottom-1 w-2 h-2 rotate-45 bg-surface border-r border-b border-border pointer-events-none"
                    style={{
                      left: `calc(50% + ${caretOffset}px)`,
                      transform: 'translateX(-50%) rotate(45deg)'
                    }}
                  />
                ) : (
                  <span
                    className="absolute -top-1 w-2 h-2 rotate-45 bg-surface border-l border-t border-border pointer-events-none"
                    style={{
                      left: `calc(50% + ${caretOffset}px)`,
                      transform: 'translateX(-50%) rotate(45deg)'
                    }}
                  />
                )}

                {/* Member Image a little big: size="md" (40x40px) */}
                <Avatar
                  name={memberTooltip.member.name}
                  src={memberTooltip.member.avatar_url || memberTooltip.member.avatar}
                  user={memberTooltip.member}
                  size="md"
                  className="rounded-full ring-2 ring-primary/25 shrink-0 shadow-xs"
                  title=""
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-text-primary truncate block leading-tight">
                      {memberTooltip.member.name || 'Unknown Member'}
                    </span>
                    {memberTooltip.roleType && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-tint text-primary shrink-0">
                        {memberTooltip.roleType}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-text-muted truncate block mt-0.5">
                    {memberTooltip.member.email || 'No email provided'}
                  </span>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
