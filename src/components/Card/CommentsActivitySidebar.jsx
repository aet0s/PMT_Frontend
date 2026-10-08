import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../context/PermissionContext';
import { useAuth } from '../../hooks/useAuth';
import ActivityItem from './ActivityItem';
import {
  MessageSquare,
  Activity,
  ToggleLeft,
  ToggleRight,
  FileEdit
} from 'lucide-react';
import { getDraft, setDraft, clearDraft, getTenantItem, setTenantItem } from '../../lib/storage';

export default function CommentsActivitySidebar({
  card,
  boardActivity = [],
  onAddComment,
  onDeleteComment
}) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canComment = hasPermission('card.comment');

  const [showDetails, setShowDetails] = useState(() =>
    Boolean(getTenantItem(user?.tenant_id, 'card_show_details', false))
  );

  // Sync preference if user/tenant changes
  useEffect(() => {
    const saved = getTenantItem(user?.tenant_id, 'card_show_details', false);
    setShowDetails(Boolean(saved));
  }, [user?.tenant_id]);
  const [commentText, setCommentText] = useState('');
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    if (card?.id) {
      const restored = getDraft(null, card.id, 'comment');
      if (restored && restored.trim()) {
        setCommentText(restored);
        setIsEditingComment(true);
        setIsDraftRestored(true);
      }
    }
  }, [card?.id]);

  const handleCommentChange = (e) => {
    const val = e.target.value;
    setCommentText(val);
    setDraft(null, card.id, 'comment', val);
  };

  const handleSaveComment = async (e) => {
    e?.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(card.id, commentText.trim());
      clearDraft(null, card.id, 'comment');
      setCommentText('');
      setIsDraftRestored(false);
      setIsEditingComment(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelComment = () => {
    clearDraft(null, card.id, 'comment');
    setCommentText('');
    setIsDraftRestored(false);
    setIsEditingComment(false);
  };

  const commentsFeed = (card.comments || []).map((c) => ({
    id: `comment-${c.id}`,
    type: 'comment',
    user_name: c.author_name,
    body: c.body,
    created_at: c.created_at
  }));

  const activityFeed = (boardActivity || [])
    .filter((a) => Number(a.card_id) === Number(card.id) && a.action_type !== 'added_comment')
    .map((a) => ({
      id: `act-${a.id}`,
      type: 'activity',
      user_name: a.user_name,
      card_title: a.card_title || card.title,
      action_type: a.action_type,
      meta_json: a.meta_json,
      created_at: a.created_at
    }));

  const fullFeed = [...commentsFeed, ...(showDetails ? activityFeed : [])];
  fullFeed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-6">
      {canComment && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Add Comment
            </h3>
            {isDraftRestored && (
              <span className="text-[10px] font-medium text-warning-text bg-warning-tint px-2 py-0.5 rounded-full flex items-center gap-1">
                <FileEdit className="w-3 h-3" />
                Draft restored
              </span>
            )}
          </div>

          {isEditingComment ? (
            <form onSubmit={handleSaveComment} className="space-y-2">
              <label htmlFor="write-comment-input" className="sr-only">
                Write a comment
              </label>
              <textarea
                id="write-comment-input"
                rows={3}
                autoFocus
                value={commentText}
                onChange={handleCommentChange}
                placeholder="Write a comment..."
                className="w-full p-3 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 text-xs text-text-primary placeholder:text-text-muted font-sans"
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !commentText.trim()}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-white font-medium text-xs rounded-md shadow-xs transition-colors cursor-pointer min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {isSubmitting ? 'Saving...' : 'Save Comment'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelComment}
                  className="px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              onClick={() => setIsEditingComment(true)}
              className="p-3 bg-surface hover:bg-surface-muted border border-border rounded-lg text-xs text-text-secondary cursor-pointer transition-colors"
            >
              Write a comment...
            </div>
          )}
        </div>
      )}

      {/* Feed Header with Show Details Toggle */}
      <div className={`flex items-center justify-between ${canComment ? 'pt-4 border-t border-border' : ''}`}>
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Activity & Comments
        </h3>

        <button
          type="button"
          onClick={() => {
            const nextVal = !showDetails;
            setShowDetails(nextVal);
            setTenantItem(user?.tenant_id, 'card_show_details', nextVal);
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary cursor-pointer"
        >
          <span>Show details</span>
          {showDetails ? (
            <ToggleRight className="w-5 h-5 text-primary" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-text-muted" />
          )}
        </button>
      </div>

      {/* Feed Stream */}
      <div className="space-y-3">
        {fullFeed.length === 0 ? (
          <p className="text-xs text-text-secondary italic text-center py-6">No activity recorded yet.</p>
        ) : (
          fullFeed.map((item) => (
            <ActivityItem key={item.id} item={item} onDeleteComment={onDeleteComment} />
          ))
        )}
      </div>
    </div>
  );
}
