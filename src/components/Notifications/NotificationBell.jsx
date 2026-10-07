import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  UserPlus,
  Clock,
  CheckSquare,
  AtSign,
  Shield,
  Layout,
  Paperclip,
  Tag,
  Inbox,
  ArrowRight
} from 'lucide-react';
import { useSocket } from '../../context/SocketProvider';
import { formatShortDate } from '../../lib/dateFormat';

export default function NotificationBell({ onSelectNotificationCard, onOpenAllNotifications }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

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

  const topFiveNotifications = (notifications || []).slice(0, 5);

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }
    setIsOpen(false);
    if (onSelectNotificationCard && (n.card_id || n.board_id)) {
      onSelectNotificationCard({
        cardId: n.card_id,
        boardId: n.board_id,
        workspaceId: n.workspace_id,
        eventType: n.event_type || n.type
      });
    }
  };

  const handleViewAllClick = () => {
    setIsOpen(false);
    if (onOpenAllNotifications) {
      onOpenAllNotifications();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 bg-surface hover:bg-surface-muted text-text-primary border border-border rounded-lg shadow-xs transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-surface animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col animate-fade-in">
          {/* Panel Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface-muted shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary-tint text-primary border border-primary/20 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Top 5 Notifications List */}
          <div className="overflow-y-auto divide-y divide-border max-h-[380px]">
            {topFiveNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Inbox className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                <p className="text-xs font-medium text-text-secondary">No notifications yet</p>
              </div>
            ) : (
              topFiveNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 flex items-start gap-3 hover:bg-surface-muted cursor-pointer transition-colors ${
                    !n.is_read ? 'bg-primary-tint/40 border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-surface shrink-0 mt-0.5 border border-border">
                    {getCategoryIcon(n.event_type, n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary leading-snug break-words">
                      {n.message}
                      {n.count > 1 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-primary-tint text-primary text-[10px] font-bold rounded-full">
                          ×{n.count}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {(n.board_title || n.board_name) && (
                        <span className="text-[10px] font-medium text-text-secondary bg-surface-muted px-1.5 py-0.5 rounded border border-border">
                          {n.board_title || n.board_name}
                        </span>
                      )}
                      <span className="text-[10px] text-text-muted">
                        {formatShortDate(n.created_at)}
                      </span>
                    </div>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* View All Button Footer */}
          <div className="p-2.5 border-t border-border bg-surface-muted shrink-0">
            <button
              type="button"
              onClick={handleViewAllClick}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-primary hover:text-white bg-surface hover:bg-primary border border-primary/30 hover:border-primary rounded-lg transition-all cursor-pointer shadow-xs group"
            >
              <span>View all notifications</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
