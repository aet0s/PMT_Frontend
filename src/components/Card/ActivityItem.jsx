import React from 'react';
import Avatar from '../ui/Avatar';
import { formatDate, formatRelativeTime } from '../../lib/dateFormat';
import { Trash2 } from 'lucide-react';
import { usePermissions } from '../../context/PermissionContext';
import { useAuth } from '../../hooks/useAuth';

export default function ActivityItem({ item, onDeleteComment }) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canDeleteOwn = hasPermission('comment.delete_own');
  const canDeleteAny = hasPermission('comment.delete_any');
  const canDeleteComment = canDeleteAny || (canDeleteOwn && Number(user?.id) === Number(item?.user_id));
  const isComment = item.type === 'comment' || item.action_type === 'added_comment';
  const commentBody = item.body || item.meta_json?.body || '';
  const cardName = item.card_title || item.meta_json?.card_title || item.meta_json?.title || '';

  const renderActivityText = () => {
    switch (item.action_type) {
      case 'created_card':
      case 'card_created':
        return cardName ? `created card "${cardName}"` : `created this card`;
      case 'card_renamed':
        return `renamed card to "${cardName || item.meta_json?.new_title}"`;
      case 'card_description_updated':
        return cardName ? `updated description for "${cardName}"` : `updated card description`;
      case 'card_cover_changed':
        return cardName ? `updated cover for "${cardName}"` : `updated card cover`;
      case 'moved_card':
      case 'card_moved':
        return cardName
          ? `moved "${cardName}" from "${item.meta_json?.from}" to "${item.meta_json?.to}"`
          : `moved this card from "${item.meta_json?.from}" to "${item.meta_json?.to}"`;
      case 'due_date_changed':
        return cardName ? `updated due date for "${cardName}"` : `updated the due date`;
      case 'marked_complete':
      case 'completed_card':
        return cardName ? `marked "${cardName}" complete` : `marked this card complete`;
      case 'marked_incomplete':
        return cardName ? `marked "${cardName}" incomplete` : `marked this card incomplete`;
      case 'card_archived':
        return cardName ? `archived card "${cardName}"` : `archived this card`;
      case 'card_restored':
        return cardName ? `restored card "${cardName}"` : `restored this card`;
      case 'card_deleted':
      case 'deleted_card':
        return cardName ? `deleted card "${cardName}"` : `deleted card`;
      case 'member_added':
        return cardName
          ? `added ${item.meta_json?.member_name} to "${cardName}"`
          : `added ${item.meta_json?.member_name} to this card`;
      case 'member_removed':
        return cardName
          ? `removed ${item.meta_json?.member_name} from "${cardName}"`
          : `removed ${item.meta_json?.member_name} from this card`;
      case 'label_added':
        return cardName
          ? `added label "${item.meta_json?.label_name}" to "${cardName}"`
          : `added label "${item.meta_json?.label_name}"`;
      case 'label_removed':
        return cardName
          ? `removed label "${item.meta_json?.label_name}" from "${cardName}"`
          : `removed label "${item.meta_json?.label_name}"`;
      case 'attachment_added':
        return cardName
          ? `attached file "${item.meta_json?.file_name}" to "${cardName}"`
          : `attached file "${item.meta_json?.file_name}"`;
      case 'attachment_removed':
        return cardName
          ? `removed attachment "${item.meta_json?.file_name}" from "${cardName}"`
          : `removed attachment "${item.meta_json?.file_name}"`;
      case 'added_comment':
        return cardName ? `commented on "${cardName}"` : `commented`;
      case 'edited_comment':
        return cardName ? `edited comment on "${cardName}"` : `edited comment`;
      case 'deleted_comment':
        return cardName ? `deleted comment from "${cardName}"` : `deleted comment`;
      case 'checklist_added':
        return `added checklist "${item.meta_json?.checklist_title || 'Checklist'}"${cardName ? ` to "${cardName}"` : ''}`;
      case 'checklist_removed':
        return `removed checklist "${item.meta_json?.checklist_title || 'Checklist'}"${cardName ? ` from "${cardName}"` : ''}`;
      case 'checklist_item_added':
        return `added checklist item "${item.meta_json?.item_text}"${cardName ? ` on "${cardName}"` : ''}`;
      case 'checklist_toggled':
        return `${item.meta_json?.is_checked ? 'completed' : 'reopened'} item "${item.meta_json?.item_text}"${
          cardName ? ` on "${cardName}"` : ''
        }`;
      case 'checklist_item_edited':
        return `edited checklist item "${item.meta_json?.item_text}"${cardName ? ` on "${cardName}"` : ''}`;
      case 'checklist_item_deleted':
        return `deleted checklist item "${item.meta_json?.item_text}"${cardName ? ` from "${cardName}"` : ''}`;
      case 'list_created':
        return `created list "${item.meta_json?.list_name || 'List'}"`;
      case 'list_archived':
        return `archived list "${item.meta_json?.list_name || 'List'}"`;
      case 'list_renamed':
        return `renamed list to "${item.meta_json?.list_name}"`;
      case 'list_reordered':
        return `reordered lists on board`;
      case 'list_deleted':
        return `deleted list "${item.meta_json?.list_name || 'List'}"`;
      case 'board_created':
        return `created board "${item.meta_json?.board_name || 'Board'}"`;
      case 'board_renamed':
        return `renamed board to "${item.meta_json?.board_name}"`;
      case 'board_archived':
        return `archived board "${item.meta_json?.board_name || 'Board'}"`;
      case 'board_restored':
        return `restored board "${item.meta_json?.board_name || 'Board'}"`;
      case 'board_deleted':
        return `deleted board "${item.meta_json?.board_name || 'Board'}"`;
      case 'board_member_added':
        return `added ${item.meta_json?.member_name || 'member'} to board`;
      case 'board_member_removed':
        return `removed member from board`;
      default:
        return item.action_type ? item.action_type.replace(/_/g, ' ') : 'performed an action';
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-surface border border-border rounded-xl shadow-xs text-left">
      <Avatar name={item.user_name} src={item.user_avatar || item.avatar_url || item.avatar} size="sm" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-text-primary truncate">{item.user_name || 'Team member'}</span>
          <span
            title={formatDate(item.created_at)}
            className="text-[10px] text-text-muted hover:text-text-secondary cursor-help transition-colors shrink-0"
          >
            {formatRelativeTime(item.created_at)}
          </span>
        </div>

        {isComment ? (
          <div className="space-y-1">
            {cardName && (
              <span className="text-[11px] text-text-muted font-medium block">
                on "{cardName}":
              </span>
            )}
            <div
              className="prose prose-xs text-text-primary text-xs bg-surface-muted p-2.5 rounded-lg border border-border break-words overflow-hidden"
              dangerouslySetInnerHTML={{ __html: commentBody }}
            />
            {onDeleteComment && canDeleteComment && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onDeleteComment(item.id)}
                  className="text-[10px] text-text-muted hover:text-danger-text flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-secondary leading-relaxed break-words">
            {renderActivityText()}
          </p>
        )}
      </div>
    </div>
  );
}
