import React from 'react';
import Avatar from '../ui/Avatar';
import { formatDate, formatRelativeTime } from '../../lib/dateFormat';
import { Trash2 } from 'lucide-react';

export default function ActivityItem({ item, onDeleteComment }) {
  const isComment = item.type === 'comment';

  return (
    <div className="flex items-start gap-3 p-3 bg-surface border border-border rounded-xl shadow-xs text-left">
      <Avatar name={item.user_name} size="sm" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-text-primary truncate">{item.user_name}</span>
          <span
            title={formatDate(item.created_at)}
            className="text-[10px] text-text-muted hover:text-text-secondary cursor-help transition-colors shrink-0"
          >
            {formatRelativeTime(item.created_at)}
          </span>
        </div>

        {isComment ? (
          <div className="space-y-1">
            <div
              className="prose prose-xs text-text-primary text-xs bg-surface-muted p-2.5 rounded-lg border border-border break-words overflow-hidden"
              dangerouslySetInnerHTML={{ __html: item.body }}
            />
            {onDeleteComment && (
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
            {item.action_type === 'created_card' && `created this card`}
            {item.action_type === 'moved_card' &&
              `moved this card from "${item.meta_json?.from}" to "${item.meta_json?.to}"`}
            {item.action_type === 'due_date_changed' && `updated the due date`}
            {item.action_type === 'marked_complete' && `marked this card complete`}
            {item.action_type === 'marked_incomplete' && `marked this card incomplete`}
            {item.action_type === 'member_added' && `added ${item.meta_json?.member_name} to this card`}
            {item.action_type === 'member_removed' && `removed ${item.meta_json?.member_name} from this card`}
            {item.action_type === 'label_added' && `added label "${item.meta_json?.label_name}"`}
            {item.action_type === 'label_removed' && `removed label "${item.meta_json?.label_name}"`}
            {item.action_type === 'attachment_added' && `attached file "${item.meta_json?.file_name}"`}
            {item.action_type === 'checklist_toggled' &&
              `${item.meta_json?.is_checked ? 'completed' : 'uncompleted'} item "${item.meta_json?.item_text}"`}
            {![
              'created_card',
              'moved_card',
              'due_date_changed',
              'marked_complete',
              'marked_incomplete',
              'member_added',
              'member_removed',
              'label_added',
              'label_removed',
              'attachment_added',
              'checklist_toggled'
            ].includes(item.action_type) && item.action_type}
          </p>
        )}
      </div>
    </div>
  );
}
