// client/src/components/Card/CommentItem.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '../ui/Avatar';
import { formatRelativeTime, formatDate } from '../../lib/dateFormat';
import {
  CornerDownRight,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { usePermissions } from '../../context/PermissionContext';
import { useAuth } from '../../hooks/useAuth';
import ProfilePreviewModal from '../shared/ProfilePreviewModal';

// Renders comment text with structured, clickable inline @mentions safely without HTML injection
function CommentBodyRenderer({ text, mentions = [], boardMembers = [], onMentionClick }) {
  if (!text) return null;

  // Build a lookup map of eligible member names to their user objects
  const nameToUserMap = new Map();
  for (const m of mentions || []) {
    if (m?.name) nameToUserMap.set(m.name.toLowerCase().trim(), m);
  }
  for (const bm of boardMembers || []) {
    if (bm?.name && !nameToUserMap.has(bm.name.toLowerCase().trim())) {
      nameToUserMap.set(bm.name.toLowerCase().trim(), bm);
    }
  }

  // Sort names descending by length so longer names match first (e.g. "Miles Member" before "Miles")
  const sortedNames = Array.from(nameToUserMap.keys()).sort((a, b) => b.length - a.length);

  // Match pattern: either legacy @[Display Name](user:123) OR @DisplayName
  const escapedNames = sortedNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const directNamesRegexPart = escapedNames.length > 0 ? `|@(${escapedNames.join('|')})\\b` : '';
  const mentionRegex = new RegExp(`@\\[([^\\]]+)\\]\\(user:(\\d+)\\)${directNamesRegexPart}`, 'gi');

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    let name = '';
    let userId = null;

    if (match[1] && match[2]) {
      // Legacy markdown syntax: @[Name](user:123)
      name = match[1];
      userId = Number(match[2]);
    } else if (match[3]) {
      // Direct mention syntax: @Name
      const matchedNameKey = match[3].toLowerCase().trim();
      const userObj = nameToUserMap.get(matchedNameKey);
      name = userObj?.name || match[3];
      userId = userObj?.id ? Number(userObj.id) : null;
    }

    parts.push(
      <button
        key={`mention-${match.index}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onMentionClick && userId) onMentionClick({ id: userId, name });
        }}
        className="inline-flex items-center text-primary bg-primary/10 hover:bg-primary/20 px-1 py-0.2 rounded font-semibold transition-colors cursor-pointer mx-0.5"
      >
        @{name}
      </button>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : p))}
    </p>
  );
}

export default function CommentItem({
  comment,
  cardId,
  isReply = false,
  onReply,
  onEditComment,
  onDeleteComment,
  highlightCommentId = null,
  boardMembers = []
}) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const commentRef = useRef(null);

  // Expanded replies state (for root comments)
  const replies = comment.replies || [];
  const hasReplies = replies.length > 0 || (Number(comment.reply_count) > 0);

  // Check if deep-linked comment target is inside this thread's replies
  const highlightIndex = replies.findIndex(
    (r) => highlightCommentId && Number(r.id) === Number(highlightCommentId)
  );
  const isTargetInThread = highlightIndex !== -1;

  const [showReplies, setShowReplies] = useState(() => isTargetInThread);
  const [isFocusedReplyMode, setIsFocusedReplyMode] = useState(() => isTargetInThread);
  const [showPreviousReplies, setShowPreviousReplies] = useState(false);
  const [showNextReplies, setShowNextReplies] = useState(false);

  // Auto-expand replies when new replies are added to this thread
  const prevRepliesLengthRef = useRef(replies.length);
  useEffect(() => {
    if (replies.length > prevRepliesLengthRef.current) {
      setShowReplies(true);
      setShowNextReplies(true);
    }
    prevRepliesLengthRef.current = replies.length;
  }, [replies.length]);

  // Synchronize when highlightCommentId is updated
  useEffect(() => {
    if (isTargetInThread) {
      setShowReplies(true);
      setIsFocusedReplyMode(true);
      setShowPreviousReplies(false);
      setShowNextReplies(false);
    }
  }, [highlightCommentId, isTargetInThread]);

  // Reply slices for focused mode
  const previousReplies = isTargetInThread ? replies.slice(0, highlightIndex) : [];
  const targetReply = isTargetInThread ? replies[highlightIndex] : null;
  const nextReplies = isTargetInThread ? replies.slice(highlightIndex + 1) : [];

  const previousCount = previousReplies.length;
  const nextCount = nextReplies.length;

  // Profile preview modal state
  const [previewUser, setPreviewUser] = useState(null);

  // Permissions check
  const isAuthor = user && Number(comment.user_id) === Number(user.id);
  const canCreate = hasPermission('comment.create');
  const canDeleteOwn = hasPermission('comment.delete_own');
  const canDeleteAny = hasPermission('comment.delete_any');
  const canDelete = canDeleteAny || (isAuthor && canDeleteOwn);

  const isHighlighted = highlightCommentId && Number(highlightCommentId) === Number(comment.id);

  // Auto-scroll to highlighted comment if matched
  useEffect(() => {
    if (isHighlighted && commentRef.current) {
      const timer = setTimeout(() => {
        commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  return (
    <div
      ref={commentRef}
      className={`group relative transition-all duration-300 rounded-lg ${
        isHighlighted ? 'bg-primary/10 ring-2 ring-primary shadow-sm p-2 animate-pulse' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* User Avatar */}
        <button
          type="button"
          onClick={() => setPreviewUser({ id: comment.user_id, name: comment.author_name, avatar_url: comment.author_avatar })}
          className="shrink-0 mt-0.5 cursor-pointer focus:outline-none"
          title={comment.author_name}
        >
          <Avatar
            name={comment.author_name}
            src={comment.author_avatar || comment.avatar_url}
            size={isReply ? 'xs' : 'sm'}
            className="ring-1 ring-border/50"
          />
        </button>

        {/* Comment Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Author Name, Reply Target, Timestamp, Actions */}
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span
                onClick={() => setPreviewUser({ id: comment.user_id, name: comment.author_name, avatar_url: comment.author_avatar })}
                className="font-bold text-text-primary hover:text-primary transition-colors cursor-pointer truncate max-w-[140px]"
              >
                {comment.author_name || 'Team member'}
              </span>

              {/* Replying-to Badge for nested replies */}
              {comment.parent_author_name && (
                <span className="text-[11px] text-text-muted flex items-center gap-1">
                  <span className="opacity-60">replying to</span>
                  <span className="font-semibold text-text-secondary">@{comment.parent_author_name}</span>
                </span>
              )}

              {/* Timestamp */}
              <span
                title={formatDate(comment.created_at)}
                className="text-[10px] text-text-muted cursor-help"
              >
                {formatRelativeTime(comment.created_at)}
              </span>

              {/* Edited indicator */}
              {comment.updated_at && (
                <span className="text-[10px] text-text-muted italic">(edited)</span>
              )}
            </div>

            {/* Delete Action for authorized users */}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDeleteComment(comment.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-danger-text rounded hover:bg-danger-tint/30 transition-all cursor-pointer"
                title="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Comment Body */}
          <div className="flex items-start justify-between gap-2">
            <CommentBodyRenderer
              text={comment.body}
              mentions={comment.mentions || []}
              boardMembers={boardMembers || []}
              onMentionClick={(target) => setPreviewUser(target)}
            />
          </div>

          {/* Action Row: Reply */}
          <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
            {canCreate && (
              <button
                type="button"
                onClick={() => onReply && onReply(comment)}
                className="font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Reply
              </button>
            )}
          </div>

          {/* Collapsible Nested Replies Thread (for root comments) */}
          {!isReply && hasReplies && (
            <div className="mt-2.5">
              {!isFocusedReplyMode ? (
                /* Standard Mode */
                <>
                  <button
                    type="button"
                    onClick={() => setShowReplies((prev) => !prev)}
                    className="flex items-center gap-2 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer py-0.5 group/btn"
                  >
                    <div className="w-6 h-px bg-border group-hover/btn:bg-text-muted transition-colors" />
                    <span>
                      {showReplies
                        ? 'Hide replies'
                        : `View replies (${comment.reply_count || replies.length})`}
                    </span>
                    {showReplies ? (
                      <ChevronUp className="w-3 h-3 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-text-muted" />
                    )}
                  </button>

                  {/* Standard Nested Replies Stream */}
                  {showReplies && (
                    <div className="border-l-2 border-border/80 pl-3.5 space-y-3 mt-2.5 relative ml-2">
                      {replies.map((reply) => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          cardId={cardId}
                          isReply={true}
                          onReply={onReply}
                          onEditComment={onEditComment}
                          onDeleteComment={onDeleteComment}
                          highlightCommentId={highlightCommentId}
                          boardMembers={boardMembers}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Focused Mode (Instagram-style deep-link to specific reply) */
                showReplies && (
                  <div className="border-l-2 border-border/80 pl-3.5 space-y-3 mt-2.5 relative ml-2">
                    {/* Previous replies trigger or list */}
                    {previousCount > 0 && (
                      !showPreviousReplies ? (
                        <button
                          type="button"
                          onClick={() => setShowPreviousReplies(true)}
                          className="flex items-center gap-2 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer py-1 group/prev"
                        >
                          <div className="w-6 h-px bg-border group-hover/prev:bg-text-muted transition-colors" />
                          <span>
                            View {previousCount} previous {previousCount === 1 ? 'reply' : 'replies'}
                          </span>
                        </button>
                      ) : (
                        previousReplies.map((reply) => (
                          <CommentItem
                            key={reply.id}
                            comment={reply}
                            cardId={cardId}
                            isReply={true}
                            onReply={onReply}
                            onEditComment={onEditComment}
                            onDeleteComment={onDeleteComment}
                            highlightCommentId={highlightCommentId}
                            boardMembers={boardMembers}
                          />
                        ))
                      )
                    )}

                    {/* Targeted focused reply */}
                    {targetReply && (
                      <CommentItem
                        key={targetReply.id}
                        comment={targetReply}
                        cardId={cardId}
                        isReply={true}
                        onReply={onReply}
                        onEditComment={onEditComment}
                        onDeleteComment={onDeleteComment}
                        highlightCommentId={highlightCommentId}
                        boardMembers={boardMembers}
                      />
                    )}

                    {/* Next replies trigger or list */}
                    {nextCount > 0 && (
                      !showNextReplies ? (
                        <button
                          type="button"
                          onClick={() => setShowNextReplies(true)}
                          className="flex items-center gap-2 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer py-1 group/next"
                        >
                          <div className="w-6 h-px bg-border group-hover/next:bg-text-muted transition-colors" />
                          <span>
                            View {nextCount} more {nextCount === 1 ? 'reply' : 'replies'}
                          </span>
                        </button>
                      ) : (
                        nextReplies.map((reply) => (
                          <CommentItem
                            key={reply.id}
                            comment={reply}
                            cardId={cardId}
                            isReply={true}
                            onReply={onReply}
                            onEditComment={onEditComment}
                            onDeleteComment={onDeleteComment}
                            highlightCommentId={highlightCommentId}
                            boardMembers={boardMembers}
                          />
                        ))
                      )
                    )}

                    {/* Hide replies control */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowReplies(false);
                        setIsFocusedReplyMode(false);
                        setShowPreviousReplies(false);
                        setShowNextReplies(false);
                      }}
                      className="flex items-center gap-2 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer py-0.5 group/hide"
                    >
                      <div className="w-6 h-px bg-border group-hover/hide:bg-text-muted transition-colors" />
                      <span>Hide replies</span>
                      <ChevronUp className="w-3 h-3 text-text-muted" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Profile Preview Modal */}
      {previewUser && (
        <ProfilePreviewModal
          isOpen={Boolean(previewUser)}
          onClose={() => setPreviewUser(null)}
          member={previewUser}
        />
      )}
    </div>
  );
}

