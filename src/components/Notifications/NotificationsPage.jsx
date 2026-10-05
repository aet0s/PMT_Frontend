import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronRight,
  Sparkles
} from 'lucide-react';
import Select from '../ui/Select';
import ConfirmDialog from '../ui/ConfirmDialog';
import {
  getNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
  clearReadNotifications
} from '../../api/notifications';
import { useSocket } from '../../context/SocketProvider';
import { formatShortDate, formatRelativeTime } from '../../lib/dateFormat';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'cards', label: 'Cards & Tasks' },
  { id: 'comments', label: 'Comments & Mentions' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'boards', label: 'Boards' },
  { id: 'members', label: 'Members & Roles' },
  { id: 'attachments', label: 'Attachments' }
];

const PAGE_SIZE = 20;

export default function NotificationsPage({
  onBack,
  onSelectNotificationCard,
  activeWorkspace,
  workspaces = []
}) {
  const { unreadCount: globalUnreadCount, refetchNotifications } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(activeWorkspace?.id || null);

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

  // Fetch page 1 (strictly top 20 at first)
  const fetchInitialNotifications = useCallback(async () => {
    setLoading(true);
    setPage(1);
    try {
      const data = await getNotifications({
        page: 1,
        limit: PAGE_SIZE,
        filter: activeFilter,
        search: searchQuery.trim(),
        workspaceId: selectedWorkspaceId
      });
      setNotifications(data.notifications || []);
      setTotalCount(data.total_count || 0);
      setHasMore(Boolean(data.has_more));
    } catch (err) {
      console.error('Failed to fetch notifications page:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, selectedWorkspaceId]);

  useEffect(() => {
    fetchInitialNotifications();
  }, [fetchInitialNotifications]);

  // Load next 20 notifications
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
        workspaceId: selectedWorkspaceId
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

  // IntersectionObserver for auto-scroll loading next 20
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      refetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearRead = () => {
    setConfirmClearOpen(true);
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

  return (
    <div className="flex-1 h-screen bg-app flex flex-col overflow-hidden select-none">
      {/* Top Navbar */}
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
            onClick={handleClearRead}
            aria-label="Clear read notifications"
            title="Clear read notifications"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-danger bg-surface hover:bg-danger-tint border border-border hover:border-danger/30 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear read</span>
          </button>
        </div>
      </header>

      {/* Main Scrollable Content Area */}
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
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search notifications"
                  placeholder="Search notifications by keyword, person, card, or board..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* Workspace Filter */}
              {workspaces.length > 1 && (
                <div className="w-full sm:w-56">
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

            {/* Filter Category Tabs */}
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
          </div>

          {/* Notifications Feed */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-semibold text-text-secondary">Loading top 20 notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 bg-surface border border-border rounded-xl text-center space-y-3">
              <Inbox className="w-12 h-12 text-text-secondary mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-text-primary">No notifications found</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                {searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your search query or filter category.'
                  : 'You are completely caught up with your boards and workspace updates!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-text-secondary font-semibold">
                <span>Showing {notifications.length} of {totalCount} notifications</span>
                {hasMore && (
                  <span className="text-primary font-medium">
                    Scroll down or click below to load next 20
                  </span>
                )}
              </div>

              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface shadow-xs">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex items-start gap-4 hover:bg-surface-muted transition-colors group relative ${
                      !n.is_read ? 'bg-primary-tint/30 border-l-4 border-primary' : ''
                    }`}
                  >
                    {/* Category Icon */}
                    <div className="p-2.5 rounded-lg bg-surface-muted border border-border shrink-0 mt-0.5 shadow-xs">
                      {getCategoryIcon(n.event_type, n.type)}
                    </div>

                    {/* Notification Body */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleCardClick(n)}
                    >
                      <p className={`text-xs sm:text-sm leading-relaxed ${!n.is_read ? 'font-semibold text-text-primary' : 'font-normal text-text-secondary'}`}>
                        {n.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {n.board_name && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] font-medium text-text-secondary">
                            <Layout className="w-3 h-3 text-primary" />
                            {n.board_name}
                          </span>
                        )}

                        {n.card_title && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] font-medium text-text-secondary">
                            <CheckSquare className="w-3 h-3 text-primary" />
                            {n.card_title}
                          </span>
                        )}

                        <span className="text-[11px] text-text-muted" title={formatShortDate(n.created_at)}>
                          {formatRelativeTime(n.created_at)}
                        </span>
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

              {/* Interactive Load More Button & Scroll Sentinel */}
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
                        <span>Loading next 20 notifications...</span>
                      </>
                    ) : (
                      <>
                        <span>Load Next 20 Notifications</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Scroll Sentinel for auto-load on reach */}
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
          } catch (err) {
            console.error(err);
          }
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
