// client/src/components/Card/ThreadedCommentList.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import CommentComposer from './CommentComposer';
import CommentItem from './CommentItem';
import ConfirmModal from '../shared/ConfirmModal';
import { usePermissions } from '../../context/PermissionContext';
import { useSocket } from '../../context/SocketProvider';
import { getCardComments, addComment, updateComment, deleteComment } from '../../api/cards';

export default function ThreadedCommentList({
  card,
  boardMembers = [],
  highlightCommentId = null,
  onCommentCountChange = null,
  onCommentAdded = null,
  onCommentUpdated = null,
  onCommentDeleted = null
}) {
  const { hasPermission } = usePermissions();
  const canCreateComment = hasPermission('comment.create');

  const cardRef = useRef(card);
  cardRef.current = card;

  const onCommentCountChangeRef = useRef(onCommentCountChange);
  onCommentCountChangeRef.current = onCommentCountChange;

  const { socket } = useSocket() || {};
  const [comments, setComments] = useState([]);
  const [totalCount, setTotalCount] = useState(card?.comments_count || 0);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);

  const composerRef = useRef(null);
  const cardId = card?.id;
  const boardId = card?.board_id || card?.boardId;
  const processedCommentEventsRef = useRef(new Set());

  // Ensure socket joins the board room so all card comments and replies update in real-time
  useEffect(() => {
    if (!socket || !boardId) return;
    const bId = Number(boardId);
    socket.emit('join_board', { boardId: bId });

    const handleReconnect = () => {
      socket.emit('join_board', { boardId: bId });
    };

    socket.on('connect', handleReconnect);
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [socket, boardId]);

  // Fetch comments fresh from server (stable reference)
  const fetchComments = useCallback(async () => {
    const currentCardId = cardRef.current?.id;
    if (!currentCardId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCardComments(currentCardId);
      const fetched = data?.comments || [];
      const count = data?.total_count ?? fetched.length;
      setComments(fetched);
      setTotalCount(count);
      if (
        onCommentCountChangeRef.current &&
        cardRef.current?.comments_count !== undefined &&
        count !== cardRef.current.comments_count
      ) {
        onCommentCountChangeRef.current(count, currentCardId);
      }
    } catch (err) {
      console.error('Failed to load card comments:', err);
      setError('Could not load discussion comments.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch comments ONLY when cardId changes or component mounts
  useEffect(() => {
    if (cardId) {
      fetchComments();
    }
  }, [cardId, fetchComments]);

  // Real-time synchronization via WebSocket for live discussions
  useEffect(() => {
    if (!socket || !cardId) return;

    const handleCommentCreated = (data) => {
      if (!data || !data.comment) return;
      const targetCardId = Number(data.cardId || data.comment.card_id);
      const currentCardId = Number(cardRef.current?.id || cardId);
      if (!targetCardId || targetCardId !== currentCardId) return;

      const newComment = data.comment;
      const commentId = Number(newComment.id);

      // Event deduplication (guards against dual comment:created / comment:added emissions)
      if (processedCommentEventsRef.current.has(commentId)) {
        return;
      }
      processedCommentEventsRef.current.add(commentId);
      if (processedCommentEventsRef.current.size > 200) {
        const first = processedCommentEventsRef.current.values().next().value;
        processedCommentEventsRef.current.delete(first);
      }

      const isReply = Boolean(newComment.parent_comment_id);
      const rootId = Number(data.rootCommentId || newComment.root_comment_id || newComment.parent_comment_id);
      let newlyAdded = false;

      setComments((prevComments) => {
        if (!isReply) {
          const existing = prevComments.some((c) => Number(c.id) === commentId);
          if (existing) return prevComments;
          newlyAdded = true;
          return [
            ...prevComments,
            {
              ...newComment,
              replies: newComment.replies || [],
              reply_count: newComment.reply_count || 0
            }
          ];
        }

        let foundRoot = false;
        const next = prevComments.map((root) => {
          if (Number(root.id) === rootId) {
            foundRoot = true;
            const currentReplies = root.replies || [];
            if (currentReplies.some((r) => Number(r.id) === commentId)) return root;
            newlyAdded = true;
            return {
              ...root,
              reply_count: (root.reply_count || currentReplies.length) + 1,
              replies: [...currentReplies, newComment]
            };
          }
          return root;
        });

        if (!foundRoot) {
          fetchComments();
          return prevComments;
        }
        return next;
      });

      if (newlyAdded) {
        setTotalCount((prev) => {
          const next = prev + 1;
          if (onCommentCountChangeRef.current) {
            onCommentCountChangeRef.current(next, currentCardId);
          }
          return next;
        });
      }
    };

    const handleCommentUpdated = (data) => {
      if (!data || !data.comment) return;
      const targetCardId = Number(data.cardId || data.comment.card_id);
      const currentCardId = Number(cardRef.current?.id || cardId);
      if (targetCardId !== currentCardId) return;

      const updated = data.comment;
      setComments((prevComments) =>
        prevComments.map((root) => {
          if (Number(root.id) === Number(updated.id)) {
            return { ...root, ...updated };
          }
          if (root.replies && root.replies.length > 0) {
            return {
              ...root,
              replies: root.replies.map((reply) =>
                Number(reply.id) === Number(updated.id) ? { ...reply, ...updated } : reply
              )
            };
          }
          return root;
        })
      );
    };

    const handleCommentDeleted = (data) => {
      if (!data || !data.commentId) return;
      const targetCardId = Number(data.cardId);
      const currentCardId = Number(cardRef.current?.id || cardId);
      if (targetCardId !== currentCardId) return;

      const commentId = Number(data.commentId);
      setComments((prevComments) => {
        const isRoot = prevComments.some((root) => Number(root.id) === commentId);
        if (isRoot) {
          const deletedRoot = prevComments.find((root) => Number(root.id) === commentId);
          const deletedSubCount = 1 + (deletedRoot?.replies?.length || 0);
          setTotalCount((prev) => {
            const next = Math.max(0, prev - deletedSubCount);
            if (onCommentCountChangeRef.current) {
              onCommentCountChangeRef.current(next, currentCardId);
            }
            return next;
          });
          return prevComments.filter((root) => Number(root.id) !== commentId);
        }

        return prevComments.map((root) => {
          if (root.replies && root.replies.some((r) => Number(r.id) === commentId)) {
            const nextReplies = root.replies.filter((r) => Number(r.id) !== commentId);
            setTotalCount((prev) => {
              const next = Math.max(0, prev - 1);
              if (onCommentCountChangeRef.current) {
                onCommentCountChangeRef.current(next, currentCardId);
              }
              return next;
            });
            return {
              ...root,
              reply_count: Math.max(0, (root.reply_count || 1) - 1),
              replies: nextReplies
            };
          }
          return root;
        });
      });
    };

    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:added', handleCommentCreated);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);

    return () => {
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:added', handleCommentCreated);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
    };
  }, [socket, cardId, fetchComments]);

  // Handle Submit comment (top-level or reply)
  const handleSubmitComment = async (payload) => {
    const isReply = Boolean(payload.parent_comment_id);

    // Call API
    const res = await addComment(card.id, payload);
    const newComment = res?.comment;

    if (newComment) {
      const commentId = Number(newComment.id);
      processedCommentEventsRef.current.add(commentId);
      const rootId = Number(newComment.root_comment_id || payload.parent_comment_id);
      let foundRoot = false;

      setComments((prevComments) => {
        if (!isReply) {
          const existing = prevComments.some((c) => Number(c.id) === commentId);
          if (existing) return prevComments;
          return [
            ...prevComments,
            {
              ...newComment,
              replies: [],
              reply_count: 0
            }
          ];
        }

        const next = prevComments.map((root) => {
          if (Number(root.id) === rootId) {
            foundRoot = true;
            const currentReplies = root.replies || [];
            if (currentReplies.some((r) => Number(r.id) === commentId)) return root;
            return {
              ...root,
              reply_count: (root.reply_count || currentReplies.length) + 1,
              replies: [...currentReplies, newComment]
            };
          }
          return root;
        });

        if (!foundRoot) {
          fetchComments();
          return prevComments;
        }
        return next;
      });

      setTotalCount((prev) => prev + 1);
      setReplyTarget(null);

      // Notify parent to synchronize selectedCard and list card badges immediately
      if (onCommentAdded) {
        onCommentAdded(newComment);
      }
    }
  };

  // Handle Edit comment
  const handleEditComment = async (commentId, payload) => {
    const res = await updateComment(commentId, payload);
    const updated = res?.comment;
    if (!updated) return;

    setComments((prevComments) =>
      prevComments.map((root) => {
        if (Number(root.id) === Number(commentId)) {
          return { ...root, ...updated };
        }
        if (root.replies && root.replies.length > 0) {
          return {
            ...root,
            replies: root.replies.map((reply) =>
              Number(reply.id) === Number(commentId) ? { ...reply, ...updated } : reply
            )
          };
        }
        return root;
      })
    );

    if (onCommentUpdated) {
      onCommentUpdated(updated);
    }
  };

  // Handle Delete comment
  const handleDeleteComment = async (commentId) => {
    await deleteComment(commentId);

    setComments((prevComments) => {
      // Check if deleted comment is a root comment
      const isRoot = prevComments.some((root) => Number(root.id) === Number(commentId));
      if (isRoot) {
        const deletedRoot = prevComments.find((root) => Number(root.id) === Number(commentId));
        const deletedSubCount = 1 + (deletedRoot?.replies?.length || 0);
        setTotalCount((prev) => Math.max(0, prev - deletedSubCount));
        return prevComments.filter((root) => Number(root.id) !== Number(commentId));
      }

      // Otherwise it's a nested reply
      return prevComments.map((root) => {
        if (root.replies && root.replies.some((r) => Number(r.id) === Number(commentId))) {
          const nextReplies = root.replies.filter((r) => Number(r.id) !== Number(commentId));
          setTotalCount((prev) => Math.max(0, prev - 1));
          return {
            ...root,
            reply_count: Math.max(0, (root.reply_count || 1) - 1),
            replies: nextReplies
          };
        }
        return root;
      });
    });

    if (onCommentDeleted) {
      onCommentDeleted(commentId, card.id);
    }
  };

  // Start replying to a specific comment
  const handleStartReply = (targetComment) => {
    setReplyTarget({
      id: targetComment.id,
      author_name: targetComment.author_name,
      root_id: targetComment.root_comment_id || targetComment.id
    });
    if (composerRef.current) {
      composerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Discussion Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span>Comments</span>
          {totalCount > 0 && (
            <span className="text-[11px] px-1.5 py-0.2 bg-surface-muted text-text-secondary rounded-full font-medium">
              {totalCount}
            </span>
          )}
        </h3>

        {error && (
          <button
            type="button"
            onClick={fetchComments}
            className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-danger-tint border border-danger/30 rounded-lg text-xs text-danger-text">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comment Composer */}
      {canCreateComment && (
        <div ref={composerRef} className="space-y-1">
          <CommentComposer
            cardId={card.id}
            replyTarget={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
            onSubmitComment={handleSubmitComment}
            boardMembers={boardMembers}
            autoFocus={Boolean(replyTarget)}
          />
        </div>
      )}

      {/* Discussion Stream / Threads */}
      <div className="space-y-4 pt-1">
        {isLoading && comments.length === 0 ? (
          // Loading Skeletons
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-start gap-2.5 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-surface-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-24 h-3 bg-surface-muted rounded" />
                  <div className="w-full h-8 bg-surface-muted rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-8 text-center text-text-muted space-y-2">
            <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-text-muted opacity-70" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">No comments yet</p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Start the conversation with your team.
              </p>
            </div>
          </div>
        ) : (
          // Threaded Comments
          comments.map((rootComment) => (
            <CommentItem
              key={rootComment.id}
              comment={rootComment}
              cardId={card.id}
              isReply={false}
              onReply={handleStartReply}
              onEditComment={handleEditComment}
              onDeleteComment={(id) => setCommentToDelete(id)}
              highlightCommentId={highlightCommentId}
              boardMembers={boardMembers}
            />
          ))
        )}
      </div>

      {/* Custom Confirmation Popup for Comment Deletion */}
      <ConfirmModal
        isOpen={Boolean(commentToDelete)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={async () => {
          const id = commentToDelete;
          setCommentToDelete(null);
          if (id) {
            await handleDeleteComment(id);
          }
        }}
        onCancel={() => setCommentToDelete(null)}
      />
    </div>
  );
}
