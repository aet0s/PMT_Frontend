import React, { useState, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  MessageSquare,
  ArrowRightLeft,
  Users,
  Search,
  CheckSquare,
  Tag,
  X
} from 'lucide-react';
import Drawer from '../ui/Drawer';
import ActivityItem from '../Card/ActivityItem';

export default function BoardActivityDrawer({
  isOpen,
  onClose,
  activity = [],
  onRefresh
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'tasks' | 'comments' | 'moves' | 'members' | 'checklists'
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const filteredActivity = useMemo(() => {
    return activity.filter((item) => {
      // Category filter
      if (filterType === 'tasks') {
        const isTask = item.action_type?.includes('card') || item.action_type?.includes('task') || item.action_type?.includes('complete') || item.action_type?.includes('cover') || item.action_type?.includes('due_date');
        if (!isTask) return false;
      } else if (filterType === 'comments') {
        const isComment = item.action_type?.includes('comment') || item.type === 'comment';
        if (!isComment) return false;
      } else if (filterType === 'moves') {
        const isMove = item.action_type === 'moved_card' || item.action_type === 'card_moved' || item.action_type === 'list_reordered';
        if (!isMove) return false;
      } else if (filterType === 'members') {
        const isMember = item.action_type?.includes('member');
        if (!isMember) return false;
      } else if (filterType === 'checklists') {
        const isChecklist = item.action_type?.includes('checklist');
        if (!isChecklist) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const userName = (item.user_name || '').toLowerCase();
        const cardTitle = (item.card_title || item.meta_json?.card_title || item.meta_json?.title || '').toLowerCase();
        const actionType = (item.action_type || '').toLowerCase();
        const details = typeof item.meta_json === 'string' ? item.meta_json.toLowerCase() : JSON.stringify(item.meta_json || {}).toLowerCase();
        const matches = userName.includes(q) || cardTitle.includes(q) || actionType.includes(q) || details.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [activity, filterType, search]);

  if (!isOpen) return null;

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
        {/* Search & Filter Header */}
        <div className="p-3.5 border-b border-border bg-surface-muted/50 space-y-2 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search in board activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All', icon: null },
                { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-3 h-3" /> },
                { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-3 h-3" /> },
                { id: 'checklists', label: 'Checklists', icon: <CheckSquare className="w-3 h-3" /> },
                { id: 'moves', label: 'Moves', icon: <ArrowRightLeft className="w-3 h-3" /> },
                { id: 'members', label: 'Members', icon: <Users className="w-3 h-3" /> }
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilterType(pill.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                    filterType === pill.id
                      ? 'bg-primary text-white shadow-2xs font-bold'
                      : 'bg-surface hover:bg-surface-muted text-text-secondary border border-border'
                  }`}
                >
                  {pill.icon}
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRefreshClick}
              title="Refresh Activity"
              aria-label="Refresh Activity"
              className={`p-1 text-text-muted hover:text-text-primary bg-surface border border-border rounded-md transition-colors cursor-pointer shrink-0 ${
                isRefreshing ? 'animate-spin text-primary' : ''
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Activity Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredActivity.length === 0 ? (
            <div className="py-16 text-center text-text-muted space-y-2">
              <Activity className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs italic">
                {search ? 'No activities match your search.' : 'No activity recorded for this filter.'}
              </p>
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
