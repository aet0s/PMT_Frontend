import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  CheckSquare,
  AtSign,
  MessageSquare,
  Clock,
  Shield,
  Layout,
  Paperclip,
  Tag,
  UserPlus,
  Inbox,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  Volume2,
  VolumeX,
  Sliders,
  X,
  Check,
  Radio,
  SlidersHorizontal,
  BellOff,
  Calendar
} from 'lucide-react';
import Select from '../ui/Select';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import Switch from '../ui/Switch';
import {
  getNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
  clearReadNotifications,
  getNotificationPreferences,
  updateNotificationPreferences
} from '../../api/notifications';
import { useSocket } from '../../context/SocketProvider';
import { useToast } from '../ui/Toast';
import { formatShortDate, formatRelativeTime } from '../../lib/dateFormat';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'cards', label: 'Cards' },
  { id: 'comments', label: 'Comments' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'boards', label: 'Boards' }
];

const PAGE_SIZE = 20;

// Helper to determine day grouping label
function getDayGroupLabel(dateString) {
  if (!dateString) return 'Earlier';
  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return 'Earlier This Week';
  return 'Older';
}

export default function NotificationsPage({
  onBack,
  onSelectNotificationCard,
  activeWorkspace,
  workspaces = [],
  boards = []
}) {
  const {
    unreadCount: globalUnreadCount,
    byBoardUnread,
    mutes,
    isBoardMuted,
    muteBoard,
    unmuteBoard,
    markBoardAsRead,
    refetchNotifications,
    refetchSummary
  } = useSocket();

  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedBoardFilter, setSelectedBoardFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(activeWorkspace?.id || null);

  // Preferences Modal State
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMode, setPrefMode] = useState('all'); // 'all' or 'only_mine'
  const [prefNotifyAllBoards, setPrefNotifyAllBoards] = useState(false);
  const [prefCategories, setPrefCategories] = useState({
    board: true,
    list: true,
    card: true,
    checklist: true,
    comment: true,
    due_date: true,
    workspace: true
  });

  const scrollContainerRef = useRef(null);
  const observerTarget = useRef(null);

  const getCategoryIcon = (eventType = '', legacyType = '') => {
    const type = eventType || legacyType;
    if (type.startsWith('checklist')) return <CheckSquare className="w-4 h-4 text-success" />;
    if (type === 'comment.mention' || type === 'mention') return <AtSign className="w-4 h-4 text-warning" />;
    if (type.startsWith('comment')) return <MessageSquare className="w-4 h-4 text-info" />;
    if (type.startsWith('card.due') || type === 'due_date') return <Clock className="w-4 h-4 text-danger" />;
    if (type.startsWith('invite') || type.startsWith('member')) return <Shield className="w-4 h-4 text-primary" />;
    if (type.startsWith('board')) return <Layout className="w-4 h-4 text-primary" />;
    if (type.startsWith('attachment')) return <Paperclip className="w-4 h-4 text-info" />;
    if (type.startsWith('label')) return <Tag className="w-4 h-4 text-warning" />;
    if (type === 'assignment' || type === 'card.assigned') return <UserPlus className="w-4 h-4 text-primary" />;

    return <Bell className="w-4 h-4 text-text-muted" />;
  };

  // Fetch initial notifications
  const fetchInitialNotifications = useCallback(async () => {
    setLoading(true);
    setPage(1);
    try {
      const data = await getNotifications({
        page: 1,
        limit: PAGE_SIZE,
        filter: activeFilter,
        search: searchQuery.trim(),
        workspaceId: selectedWorkspaceId,
        boardId: selectedBoardFilter !== 'all' ? selectedBoardFilter : null
      });
      setNotifications(data.notifications || []);
      setTotalCount(data.total_count ?? (data.counts?.all || 0));
      setHasMore(Boolean(data.has_more));
    } catch (err) {
      console.error('Failed to fetch notifications page:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, selectedBoardFilter, searchQuery, selectedWorkspaceId]);

  useEffect(() => {
    fetchInitialNotifications();
  }, [fetchInitialNotifications]);

  // Load next batch
  const handleLoadNextBatch = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await getNotifications({
        page: nextPage,
        limit: PAGE_SIZE,
        filter: activeFilter,
        search: searchQuery.trim(),
        workspaceId: selectedWorkspaceId,
        boardId: selectedBoardFilter !== 'all' ? selectedBoardFilter : null
      });
      setNotifications((prev) => [...prev, ...(data.notifications || [])]);
      setPage(nextPage);
      setHasMore(Boolean(data.has_more));
    } catch (err) {
      console.error('Failed to load more notifications:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // IntersectionObserver for auto-scroll loading
  useEffect(() => {
    if (!observerTarget.current || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          handleLoadNextBatch();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page]);

  // Action handlers
  const handleToggleRead = async (n) => {
    try {
      if (n.is_read) {
        await markNotificationAsUnread(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: false } : item))
        );
      } else {
        await markNotificationAsRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
        );
      }
      refetchNotifications();
      refetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      refetchNotifications();
      refetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      refetchNotifications();
      refetchSummary();
      toast.show('All notifications marked as read', 'success');
    } catch (err) {
      console.error(err);
      toast.show('Failed to mark all as read', 'error');
    }
  };

  const handleMarkBoardRead = async (boardId) => {
    if (!boardId) return;
    try {
      await markBoardAsRead(boardId);
      setNotifications((prev) =>
        prev.map((n) => (String(n.board_id) === String(boardId) ? { ...n, is_read: true } : n))
      );
      toast.show('Board notifications marked as read', 'success');
    } catch (err) {
      toast.show('Failed to mark board read', 'error');
    }
  };

  const handleToggleMuteBoard = async (boardId, boardName) => {
    if (!boardId) return;
    const isMuted = isBoardMuted(boardId);
    try {
      if (isMuted) {
        await unmuteBoard(boardId);
        toast.show(`Unmuted notifications for "${boardName || 'Board'}"`, 'info');
      } else {
        await muteBoard(boardId);
        toast.show(`Muted notifications for "${boardName || 'Board'}"`, 'info');
      }
    } catch (err) {
      toast.show('Failed to update mute status', 'error');
    }
  };

  const handleCardClick = (n) => {
    if (!n.is_read) {
      handleToggleRead(n);
    }
    if (onSelectNotificationCard && (n.card_id || n.board_id)) {
      onSelectNotificationCard({
        cardId: n.card_id,
        boardId: n.board_id,
        workspaceId: n.workspace_id,
        eventType: n.event_type || n.type
      });
    }
  };

  // Open Preferences
  const handleOpenPreferences = async () => {
    setIsPreferencesOpen(true);
    setPrefLoading(true);
    try {
      const res = await getNotificationPreferences();
      if (res.preferences) {
        setPrefMode(res.preferences.mode || 'all');
        if (res.preferences.categories) {
          setPrefCategories((prev) => ({
            ...prev,
            ...res.preferences.categories
          }));
        }
        if (res.preferences.workspace) {
          setPrefNotifyAllBoards(Boolean(res.preferences.workspace.notify_all_boards));
        }
      }
    } catch (err) {
      console.warn('Failed to load preferences:', err);
    } finally {
      setPrefLoading(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = async () => {
    setPrefSaving(true);
    try {
      await updateNotificationPreferences({
        mode: prefMode,
        categories: prefCategories,
        workspace: {
          notify_all_boards: prefNotifyAllBoards ? 1 : 0
        }
      });
      toast.show('Notification preferences updated', 'success');
      setIsPreferencesOpen(false);
      fetchInitialNotifications();
    } catch (err) {
      toast.show(err.message || 'Failed to save preferences', 'error');
    } finally {
      setPrefSaving(false);
    }
  };

  // Group notifications by Day, then sub-grouped by Board
  const groupedNotifications = useMemo(() => {
    const groups = [];
    const dayBuckets = {};

    notifications.forEach((item) => {
      const dayLabel = getDayGroupLabel(item.created_at);
      if (!dayBuckets[dayLabel]) {
        dayBuckets[dayLabel] = [];
      }
      dayBuckets[dayLabel].push(item);
    });

    const orderedDayLabels = ['Today', 'Yesterday', 'Earlier This Week', 'Older'];
    orderedDayLabels.forEach((label) => {
      if (dayBuckets[label] && dayBuckets[label].length > 0) {
        // Group items within day by board
        const boardBuckets = {};
        dayBuckets[label].forEach((item) => {
          const boardKey = item.board_id ? String(item.board_id) : 'other';
          const boardTitle = item.board_title || item.board_name || (item.board_id ? `Board #${item.board_id}` : 'General / Workspace');
          if (!boardBuckets[boardKey]) {
            boardBuckets[boardKey] = {
              boardId: item.board_id,
              boardTitle,
              items: []
            };
          }
          boardBuckets[boardKey].items.push(item);
        });

        groups.push({
          dayLabel: label,
          boards: Object.values(boardBuckets)
        });
      }
    });

    return groups;
  }, [notifications]);

  return (
    <div className="flex-1 h-screen bg-app flex flex-col overflow-hidden select-none">
      {/* Top Header */}
      <header className="h-16 px-6 bg-surface border-b border-border flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-muted hover:bg-border border border-border rounded-lg transition-all cursor-pointer shadow-xs group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Board</span>
          </button>

          <div className="h-5 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-tint text-primary-text border border-primary/20 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-text-primary tracking-tight flex items-center gap-2">
                Notifications Hub
                {globalUnreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-primary-tint text-primary-text border border-primary/20 rounded-full">
                    {globalUnreadCount} unread
                  </span>
                )}
              </h1>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchInitialNotifications}
            aria-label="Refresh notifications"
            title="Refresh"
            className="p-2 text-text-muted hover:text-text-primary bg-surface hover:bg-surface-muted border border-border rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenPreferences}
            aria-label="Notification settings"
            title="Notification settings"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-muted border border-border rounded-lg transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Preferences</span>
          </button>

          {globalUnreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              aria-label="Mark all notifications as read"
              title="Mark all notifications as read"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-text hover:text-primary bg-primary-tint border border-primary/30 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            aria-label="Clear read notifications"
            title="Clear read notifications"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-danger bg-surface hover:bg-danger-tint border border-border hover:border-danger/30 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear read</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto flex flex-col items-center p-4 sm:p-6 lg:p-8"
      >
        <div className="w-full max-w-4xl space-y-6">
          {/* Filter Bar & Search */}
          <div className="p-4 bg-surface border border-border rounded-xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Box */}
              <div className="relative flex-1">
                <label htmlFor="notifications-search-input" className="sr-only">
                  Search notifications
                </label>
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="notifications-search-input"
                  type="text"
                  placeholder="Search notifications by keyword, person, card, or board..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[40px] transition-colors"
                />
              </div>

              {/* Workspace Filter */}
              {workspaces.length > 1 && (
                <div className="w-full sm:w-52">
                  <Select
                    aria-label="Filter by workspace"
                    value={selectedWorkspaceId || ''}
                    onChange={(val) => setSelectedWorkspaceId(val ? Number(val) : null)}
                    size="sm"
                    options={[
                      { value: '', label: 'All Workspaces' },
                      ...workspaces.map((w) => ({ value: w.id, label: w.name }))
                    ]}
                  />
                </div>
              )}
            </div>

            {/* Filter Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-primary text-white shadow-xs font-medium'
                      : 'bg-surface-muted text-text-secondary hover:text-text-primary hover:bg-border/60 border border-border font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Per-Board Filter Chips */}
            {boards.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-border/60 scrollbar-thin">
                <span className="text-[11px] font-semibold text-text-secondary shrink-0 mr-1 flex items-center gap-1">
                  <Layout className="w-3 h-3 text-primary" />
                  Boards:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBoardFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition-all cursor-pointer ${
                    selectedBoardFilter === 'all'
                      ? 'bg-primary-tint text-primary-text border border-primary/30 font-semibold'
                      : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
                  }`}
                >
                  All Boards
                </button>
                {boards.map((b) => {
                  const bUnread = byBoardUnread?.[b.id] || byBoardUnread?.[String(b.id)] || 0;
                  const muted = isBoardMuted(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBoardFilter(String(b.id))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedBoardFilter === String(b.id)
                          ? 'bg-primary-tint text-primary-text border border-primary/30 font-semibold'
                          : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
                      }`}
                    >
                      <span>{b.name}</span>
                      {bUnread > 0 && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                      {muted && (
                        <BellOff className="w-3 h-3 text-text-muted" title="Muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notifications Feed */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-semibold text-text-secondary">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 bg-surface border border-border rounded-xl text-center space-y-3">
              <Inbox className="w-12 h-12 text-text-secondary mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-text-primary">No notifications found</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                {searchQuery || activeFilter !== 'all' || selectedBoardFilter !== 'all'
                  ? 'Try adjusting your search query or filters.'
                  : 'You are completely caught up with your boards and workspace updates!'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1 text-xs text-text-secondary font-semibold">
                <span>Showing {notifications.length} of {totalCount} notifications</span>
                {hasMore && (
                  <span className="text-primary font-medium">
                    Scroll down or click below to load more
                  </span>
                )}
              </div>

              {/* Grouped by Day and Board */}
              {groupedNotifications.map((dayGroup) => (
                <div key={dayGroup.dayLabel} className="space-y-4">
                  {/* Day Header */}
                  <div className="flex items-center gap-2 pt-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      {dayGroup.dayLabel}
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Board Sub-Groups */}
                  {dayGroup.boards.map((boardGroup) => {
                    const muted = boardGroup.boardId ? isBoardMuted(boardGroup.boardId) : false;
                    const bUnread = boardGroup.boardId
                      ? (byBoardUnread?.[boardGroup.boardId] || byBoardUnread?.[String(boardGroup.boardId)] || 0)
                      : 0;

                    return (
                      <div
                        key={`${dayGroup.dayLabel}-${boardGroup.boardTitle}`}
                        className="border border-border rounded-xl overflow-hidden bg-surface shadow-xs"
                      >
                        {/* Board Header with Mute & Mark-Read Controls */}
                        <div className="px-4 py-2.5 bg-surface-muted/60 border-b border-border flex items-center justify-between text-xs font-semibold text-text-primary">
                          <div className="flex items-center gap-2">
                            <Layout className="w-3.5 h-3.5 text-primary" />
                            <span>{boardGroup.boardTitle}</span>
                            {muted && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                                <BellOff className="w-3 h-3 text-warning" />
                                Muted
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {boardGroup.boardId && (
                              <button
                                type="button"
                                onClick={() => handleToggleMuteBoard(boardGroup.boardId, boardGroup.boardTitle)}
                                title={muted ? 'Unmute board notifications' : 'Mute board notifications'}
                                aria-label={muted ? 'Unmute board notifications' : 'Mute board notifications'}
                                className="text-[11px] font-medium text-text-secondary hover:text-text-primary px-2 py-0.5 rounded hover:bg-border/60 transition cursor-pointer flex items-center gap-1"
                              >
                                {muted ? <Volume2 className="w-3 h-3 text-primary" /> : <VolumeX className="w-3 h-3" />}
                                <span>{muted ? 'Unmute' : 'Mute'}</span>
                              </button>
                            )}

                            {boardGroup.boardId && bUnread > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMarkBoardRead(boardGroup.boardId)}
                                title="Mark board as read"
                                aria-label="Mark board as read"
                                className="text-[11px] font-medium text-primary hover:text-primary-hover px-2 py-0.5 rounded hover:bg-primary-tint transition cursor-pointer flex items-center gap-1"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Mark read</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* List of Notification Items */}
                        <div className="divide-y divide-border">
                          {boardGroup.items.map((n) => (
                            <div
                              key={n.id}
                              className={`p-4 flex items-start gap-4 hover:bg-surface-muted transition-colors group relative ${
                                !n.is_read ? 'bg-primary-tint/25 border-l-4 border-primary' : ''
                              }`}
                            >
                              {/* Category Icon */}
                              <div className="p-2.5 rounded-lg bg-surface border border-border shrink-0 mt-0.5 shadow-2xs">
                                {getCategoryIcon(n.event_type, n.type)}
                              </div>

                              {/* Notification Body */}
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => handleCardClick(n)}
                              >
                                <p className={`text-xs sm:text-sm leading-relaxed ${!n.is_read ? 'font-semibold text-text-primary' : 'font-normal text-text-secondary'}`}>
                                  {n.message}
                                  {n.count > 1 && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-primary-tint text-primary text-[10px] font-bold rounded-full border border-primary/20">
                                      ×{n.count}
                                    </span>
                                  )}
                                </p>

                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {n.card_title && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] font-medium text-text-secondary hover:text-primary">
                                      <CheckSquare className="w-3 h-3 text-primary" />
                                      {n.card_title}
                                    </span>
                                  )}

                                  <span className="text-[11px] text-text-muted" title={formatShortDate(n.created_at)}>
                                    {formatRelativeTime(n.created_at)}
                                  </span>

                                  {n.priority === 'urgent' && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-danger-tint text-danger border border-danger/30">
                                      Urgent
                                    </span>
                                  )}
                                  {n.priority === 'high' && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-warning-tint text-warning border border-warning/30">
                                      High
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right Quick Action Buttons */}
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRead(n)}
                                  aria-label={n.is_read ? 'Mark notification as unread' : 'Mark notification as read'}
                                  title={n.is_read ? 'Mark as unread' : 'Mark as read'}
                                  className="p-2 text-text-muted hover:text-primary hover:bg-surface-muted rounded-xl transition-colors cursor-pointer"
                                >
                                  {n.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(n.id)}
                                  aria-label="Delete notification"
                                  title="Delete notification"
                                  className="p-2 text-text-muted hover:text-danger hover:bg-danger-tint rounded-xl transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Unread dot indicator */}
                              {!n.is_read && (
                                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-2 ring-4 ring-primary/20" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Load More Button & Scroll Sentinel */}
              {hasMore && (
                <div className="pt-2 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadNextBatch}
                    disabled={loadingMore}
                    className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-lg text-xs font-medium transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Loading next batch...</span>
                      </>
                    ) : (
                      <>
                        <span>Load More Notifications</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <div ref={observerTarget} className="h-6 w-full" />
                </div>
              )}

              {!hasMore && notifications.length > 0 && (
                <div className="py-6 text-center text-xs text-text-secondary italic">
                  You've reached the end of your notifications.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preferences & Mode Toggle Modal */}
      <Modal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        title="Notification Preferences"
        size="lg"
      >
        <div className="space-y-6 text-left">
          {prefLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Loading preferences...</span>
            </div>
          ) : (
            <>
              {/* Delivery Mode Toggle */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-text-primary block uppercase tracking-wide">
                  Notification Delivery Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPrefMode('all')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      prefMode === 'all'
                        ? 'border-primary bg-primary-tint/30 ring-1 ring-primary/40'
                        : 'border-border bg-surface hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-text-primary">All Activity</span>
                      <input
                        type="radio"
                        checked={prefMode === 'all'}
                        onChange={() => setPrefMode('all')}
                        className="text-primary focus:ring-primary"
                      />
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      Receive notifications for all board activity across lists, cards, and team updates.
                    </p>
                  </div>

                  <div
                    onClick={() => setPrefMode('only_mine')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      prefMode === 'only_mine'
                        ? 'border-primary bg-primary-tint/30 ring-1 ring-primary/40'
                        : 'border-border bg-surface hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-text-primary">Only Mine</span>
                      <input
                        type="radio"
                        checked={prefMode === 'only_mine'}
                        onChange={() => setPrefMode('only_mine')}
                        className="text-primary focus:ring-primary"
                      />
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      Only alert me for cards I am assigned to, cards I created, or comments where I am @mentioned.
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Switches */}
              <div className="space-y-3 pt-2 border-t border-border">
                <label className="text-xs font-bold text-text-primary block uppercase tracking-wide">
                  Notification Categories
                </label>
                <div className="divide-y divide-border bg-surface border border-border rounded-xl px-4">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-text-primary block">Card & Task Updates</span>
                      <span className="text-[11px] text-text-secondary">Creation, title, description, and status changes</span>
                    </div>
                    <Switch
                      checked={prefCategories.card ?? true}
                      onChange={(val) => setPrefCategories((p) => ({ ...p, card: val }))}
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-text-primary block">Comments & Mentions</span>
                      <span className="text-[11px] text-text-secondary">Direct mentions and discussion updates</span>
                    </div>
                    <Switch
                      checked={prefCategories.comment ?? true}
                      onChange={(val) => setPrefCategories((p) => ({ ...p, comment: val }))}
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-text-primary block">Checklists & Subtasks</span>
                      <span className="text-[11px] text-text-secondary">Checklist item additions and completions</span>
                    </div>
                    <Switch
                      checked={prefCategories.checklist ?? true}
                      onChange={(val) => setPrefCategories((p) => ({ ...p, checklist: val }))}
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-text-primary block">Board & List Changes</span>
                      <span className="text-[11px] text-text-secondary">Board renaming, list reorders, and archiving</span>
                    </div>
                    <Switch
                      checked={prefCategories.board ?? true}
                      onChange={(val) => setPrefCategories((p) => ({ ...p, board: val, list: val }))}
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-text-primary block">Due Date Reminders</span>
                      <span className="text-[11px] text-text-secondary">Upcoming and overdue task notices</span>
                    </div>
                    <Switch
                      checked={prefCategories.due_date ?? true}
                      onChange={(val) => setPrefCategories((p) => ({ ...p, due_date: val }))}
                    />
                  </div>
                </div>
              </div>

              {/* Workspace Level: Notify all boards */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between p-3.5 bg-surface-muted rounded-xl border border-border">
                  <div className="pr-4">
                    <span className="text-xs font-semibold text-text-primary block">Receive All Boards in Workspace</span>
                    <span className="text-[11px] text-text-secondary">
                      If enabled, receive notifications for boards even without explicit board membership (admin/observer mode).
                    </span>
                  </div>
                  <Switch
                    checked={prefNotifyAllBoards}
                    onChange={(val) => setPrefNotifyAllBoards(val)}
                  />
                </div>
              </div>

              {/* Muted Boards Overview */}
              {(mutes.boards || []).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-xs font-bold text-text-primary block uppercase tracking-wide">
                    Currently Muted Boards ({(mutes.boards || []).length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(mutes.boards || []).map((bId) => {
                      const foundBoard = boards.find((b) => b.id === bId);
                      const title = foundBoard?.name || `Board #${bId}`;
                      return (
                        <span
                          key={bId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-text-primary"
                        >
                          <BellOff className="w-3 h-3 text-warning" />
                          <span>{title}</span>
                          <button
                            type="button"
                            onClick={() => unmuteBoard(bId)}
                            className="text-text-muted hover:text-text-primary ml-1"
                            title="Unmute board"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-muted border border-border rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={prefSaving}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {prefSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save Preferences</span>
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Clear Read Dialog */}
      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="Clear Read Notifications"
        message="Are you sure you want to delete all read notifications? This action cannot be undone."
        confirmText="Clear Notifications"
        variant="danger"
        onConfirm={async () => {
          setConfirmClearOpen(false);
          try {
            await clearReadNotifications();
            setNotifications((prev) => prev.filter((item) => !item.is_read));
            fetchInitialNotifications();
            refetchNotifications();
            refetchSummary();
          } catch (err) {
            console.error(err);
          }
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
