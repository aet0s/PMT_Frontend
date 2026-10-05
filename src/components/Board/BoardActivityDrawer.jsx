import React, { useState } from 'react';
import {
  Activity,
  RefreshCw,
  MessageSquare,
  ArrowRightLeft,
  Users
} from 'lucide-react';
import Drawer from '../ui/Drawer';
import ActivityItem from '../Card/ActivityItem';

export default function BoardActivityDrawer({
  isOpen,
  onClose,
  activity = [],
  onRefresh
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'move' | 'comment' | 'member'
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefreshClick = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const filteredActivity = activity.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'move') return item.action_type === 'moved_card';
    if (filterType === 'comment') return item.action_type === 'added_comment';
    if (filterType === 'member') return item.action_type?.includes('member');
    return true;
  });

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span>Board Activity Log ({activity.length})</span>
        </div>
      }
      size="md"
    >
      <div className="flex flex-col h-full -m-5">
        {/* Filter Pills Header */}
        <div className="p-3.5 border-b border-border bg-surface-muted/50 flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-primary-tint text-primary-text border border-primary/20'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary border border-border'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType('move')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                filterType === 'move'
                  ? 'bg-primary-tint text-primary-text border border-primary/20'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary border border-border'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" />
              Moves
            </button>
            <button
              type="button"
              onClick={() => setFilterType('comment')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                filterType === 'comment'
                  ? 'bg-primary-tint text-primary-text border border-primary/20'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary border border-border'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              Comments
            </button>
            <button
              type="button"
              onClick={() => setFilterType('member')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                filterType === 'member'
                  ? 'bg-primary-tint text-primary-text border border-primary/20'
                  : 'bg-surface hover:bg-surface-muted text-text-secondary border border-border'
              }`}
            >
              <Users className="w-3 h-3" />
              Members
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefreshClick}
            title="Refresh Activity"
            aria-label="Refresh Activity"
            className={`p-1.5 text-text-muted hover:text-text-primary bg-surface border border-border rounded-md transition-colors cursor-pointer shrink-0 ${
              isRefreshing ? 'animate-spin text-primary' : ''
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Activity Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredActivity.length === 0 ? (
            <div className="py-16 text-center text-text-muted space-y-2">
              <Activity className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs italic">No activity recorded for this filter.</p>
            </div>
          ) : (
            filteredActivity.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
}
