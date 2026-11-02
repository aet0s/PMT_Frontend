// client/src/components/Card/CommentsActivitySidebar.jsx
import React, { useState, useEffect } from 'react';
import { Activity, ToggleLeft, ToggleRight } from 'lucide-react';
import ThreadedCommentList from './ThreadedCommentList';
import ActivityItem from './ActivityItem';
import { getUserPref, setUserPref } from '../../lib/storage';

export default function CommentsActivitySidebar({
  card,
  boardActivity = [],
  boardMembers = [],
  highlightCommentId = null,
  onCommentCountChange = null,
  onCommentAdded = null,
  onCommentUpdated = null,
  onCommentDeleted = null
}) {
  const [showDetails, setShowDetails] = useState(() =>
    Boolean(getUserPref('card_show_details', false))
  );

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'taskflow_pref_card_show_details') {
        setShowDetails(Boolean(getUserPref('card_show_details', false)));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const activityFeed = (boardActivity || [])
    .filter((a) => Number(a.card_id) === Number(card.id) && a.action_type !== 'added_comment')
    .map((a) => {
      const member = (boardMembers || []).find((m) => Number(m.id || m.user_id) === Number(a.user_id));
      return {
        id: `act-${a.id}`,
        type: 'activity',
        user_name: a.user_name || member?.name,
        user_avatar: a.user_avatar_url || a.user_avatar || a.avatar_url || member?.avatar_url || member?.avatar,
        card_title: a.card_title || card.title,
        action_type: a.action_type,
        meta_json: a.meta_json,
        created_at: a.created_at
      };
    });

  activityFeed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-6">
      {/* Threaded Discussion Feed */}
      <ThreadedCommentList
        card={card}
        boardMembers={boardMembers}
        highlightCommentId={highlightCommentId}
        onCommentCountChange={onCommentCountChange}
        onCommentAdded={onCommentAdded}
        onCommentUpdated={onCommentUpdated}
        onCommentDeleted={onCommentDeleted}
      />

      {/* Card Activity Stream Section */}
      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Card Activity</span>
          </h3>

          <button
            type="button"
            onClick={() => {
              const nextVal = !showDetails;
              setShowDetails(nextVal);
              setUserPref('card_show_details', nextVal);
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

        {showDetails && (
          <div className="space-y-2.5 pt-1">
            {activityFeed.length === 0 ? (
              <p className="text-xs text-text-secondary italic text-center py-4">
                No system activity recorded yet.
              </p>
            ) : (
              activityFeed.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
