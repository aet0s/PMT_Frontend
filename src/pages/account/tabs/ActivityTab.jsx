// client/src/pages/account/tabs/ActivityTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Clock,
  ShieldCheck,
  KeyRound,
  Lock,
  Info,
  RefreshCw,
  Search,
  CheckSquare,
  MessageSquare,
  LayoutGrid,
  Users,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  X
} from 'lucide-react';
import { apiFetch } from '../../../api/client';
import { formatDate } from '../../../lib/dateFormat';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';

const CATEGORIES = [
  { id: 'all', label: 'All Activity', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'auth', label: 'Auth & Security', icon: <KeyRound className="w-3.5 h-3.5" /> },
  { id: 'tasks', label: 'Tasks & Checklists', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: 'boards', label: 'Boards & Lists', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'members', label: 'Members', icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'roles', label: 'Roles & RBAC', icon: <ShieldCheck className="w-3.5 h-3.5" /> }
];

export default function ActivityTab() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [selectedLog, setSelectedLog] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadActivity = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    try {
      const qParams = new URLSearchParams();
      qParams.set('page', String(targetPage));
      qParams.set('limit', '20'); // exactly 20 items per page
      if (debouncedSearch) qParams.set('search', debouncedSearch);
      if (category !== 'all') qParams.set('category', category);

      const res = await apiFetch(`/api/auth/activity?${qParams.toString()}`).catch(() => ({
        events: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
      }));

      const eventsList = res.events || res.logs || res.activities || [];
      setEvents(eventsList);

      if (res.pagination) {
        setPagination({
          page: res.pagination.page || targetPage,
          limit: res.pagination.limit || 20,
          total: res.pagination.total || 0,
          totalPages: res.pagination.totalPages || Math.ceil((res.pagination.total || 0) / (res.pagination.limit || 20)) || 1
        });
      } else {
        setPagination({
          page: targetPage,
          limit: 20,
          total: eventsList.length,
          totalPages: Math.ceil(eventsList.length / 20) || 1
        });
      }
    } catch (err) {
      console.warn('Failed to load user activity:', err);
      toast.show('Failed to refresh activity log', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, category, page, toast]);

  useEffect(() => {
    loadActivity(page);
  }, [loadActivity, page]);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearch(search.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const getActionBadgeProps = (action = '') => {
    const act = String(action).toLowerCase();
    if (act.includes('fail') || act.includes('deny') || act.includes('revoke') || act.includes('delete') || act.includes('removed')) {
      return { variant: 'danger', icon: <AlertTriangle className="w-3 h-3" /> };
    }
    if (act.includes('password') || act.includes('2fa') || act.includes('security') || act.includes('role')) {
      return { variant: 'primary', icon: <ShieldCheck className="w-3 h-3" /> };
    }
    if (act.includes('login') || act.includes('session') || act.includes('auth')) {
      return { variant: 'info', icon: <KeyRound className="w-3 h-3" /> };
    }
    if (act.includes('comment')) {
      return { variant: 'info', icon: <MessageSquare className="w-3 h-3" /> };
    }
    if (act.includes('checklist') || act.includes('card') || act.includes('complete') || act.includes('task')) {
      return { variant: 'success', icon: <CheckSquare className="w-3 h-3" /> };
    }
    return { variant: 'neutral', icon: <Info className="w-3 h-3" /> };
  };

  const parseUserAgent = (ua) => {
    if (!ua) return 'Web / Desktop';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return ua.length > 20 ? `${ua.slice(0, 20)}...` : ua;
  };

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6 w-full text-left">
      {/* Header */}
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Activity Log
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Audit history of all your actions, authentications, tasks, comments, and security events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadActivity(page)}
          disabled={isLoading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted/60 border border-border rounded-xl flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                category === cat.id
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search actions, tasks, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition min-h-[36px]"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden shadow-xs w-full">
        <table className="w-full table-fixed text-xs text-left">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[36%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-surface-muted text-text-secondary border-b border-border uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th scope="col" className="py-3 px-4">Action</th>
              <th scope="col" className="py-3 px-4">Activity Details</th>
              <th scope="col" className="py-3 px-4">Target Context</th>
              <th scope="col" className="py-3 px-4">Network & Time</th>
              <th scope="col" className="py-3 px-3 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text-primary">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading activity log...</span>
                  </div>
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-muted">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-40" />
                  <p className="font-semibold text-text-primary">No activity records found</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {search ? 'Try adjusting your search criteria.' : 'Your actions and security events will be recorded here.'}
                  </p>
                </td>
              </tr>
            ) : (
              events.map((ev) => {
                const badgeProps = getActionBadgeProps(ev.action_type || ev.action || ev.event);
                return (
                  <tr
                    key={ev.id}
                    onClick={() => setSelectedLog(ev)}
                    className="hover:bg-surface-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 min-w-0">
                      <Badge variant={badgeProps.variant} size="sm">
                        <span className="flex items-center gap-1 font-mono text-[11px] truncate">
                          {badgeProps.icon}
                          <span className="truncate">{ev.action_type || ev.action || ev.event || 'Activity'}</span>
                        </span>
                      </Badge>
                    </td>

                    <td className="py-3 px-4 min-w-0">
                      <span className="truncate block font-medium text-text-primary text-xs" title={ev.details}>
                        {ev.details || ev.action || '—'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-text-secondary text-[11px] min-w-0">
                      <div className="space-y-0.5 truncate">
                        {ev.card_title && <div className="truncate text-primary font-medium">Task: {ev.card_title}</div>}
                        {ev.board_name && <div className="truncate text-text-muted">Board: {ev.board_name}</div>}
                        {!ev.card_title && !ev.board_name && <span className="text-text-muted italic">System / Account</span>}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-text-secondary text-[11px] whitespace-nowrap min-w-0">
                      <div className="font-medium text-text-primary">{formatDate(ev.created_at)}</div>
                      <div className="text-[10px] text-text-muted font-mono truncate">
                        {ev.ip || '127.0.0.1'} • {parseUserAgent(ev.user_agent)}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(ev);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-primary bg-primary-tint/60 hover:bg-primary-tint border border-primary/20 transition cursor-pointer min-h-[28px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards View (< 768px) */}
      <div className="md:hidden space-y-2.5">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-text-muted bg-surface border border-border rounded-xl">
            <RefreshCw className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
            Loading activity log...
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-border rounded-xl text-xs text-text-muted">
            <Activity className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-40" />
            <p className="font-semibold text-text-primary">No activity records found</p>
          </div>
        ) : (
          events.map((ev) => {
            const badgeProps = getActionBadgeProps(ev.action_type || ev.action || ev.event);
            return (
              <div
                key={ev.id}
                onClick={() => setSelectedLog(ev)}
                className="p-3.5 bg-surface border border-border rounded-xl shadow-2xs space-y-2 cursor-pointer hover:bg-surface-muted/30 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={badgeProps.variant} size="sm">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      {badgeProps.icon}
                      <span>{ev.action_type || ev.action || ev.event || 'Activity'}</span>
                    </span>
                  </Badge>
                  <span className="text-[10px] text-text-muted">{formatDate(ev.created_at)}</span>
                </div>

                <p className="text-xs font-semibold text-text-primary">{ev.details || ev.action || '—'}</p>

                {(ev.card_title || ev.board_name) && (
                  <div className="text-[11px] text-text-muted bg-surface-muted/50 p-2 rounded-lg border border-border/50">
                    {ev.card_title && <div className="text-primary font-medium truncate">Task: {ev.card_title}</div>}
                    {ev.board_name && <div className="truncate">Board: {ev.board_name}</div>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Server-Side Pagination Footer (20 items per page) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-xs text-text-secondary">
        <div>
          {pagination.total > 0 ? (
            <span>
              Showing <strong className="text-text-primary">{startRecord}</strong> to{' '}
              <strong className="text-text-primary">{endRecord}</strong> of{' '}
              <strong className="text-text-primary">{pagination.total}</strong> records (20 / page)
            </span>
          ) : (
            <span>No records to display</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
          >
            Previous
          </Button>

          <span className="px-3 py-1 bg-surface-muted rounded-lg font-medium text-text-primary border border-border">
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages || isLoading}
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Inspect Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={
          selectedLog ? (
            <div className="flex items-center gap-2">
              <Badge variant={getActionBadgeProps(selectedLog.action_type || selectedLog.event).variant}>
                {selectedLog.action_type || selectedLog.event || 'Activity'}
              </Badge>
              <span>{selectedLog.action || selectedLog.action_type || 'Event Payload'}</span>
            </div>
          ) : 'Audit Details'
        }
        description={selectedLog ? `Audit Record #${selectedLog.id}` : ''}
        size="md"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
            Close
          </Button>
        }
      >
        {selectedLog && (
          <div className="space-y-4 text-xs text-left">
            <div className="grid grid-cols-2 gap-3 bg-surface-muted/50 p-3.5 rounded-xl border border-border">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Actor</span>
                <p className="font-semibold text-text-primary mt-0.5">{selectedLog.user_name || 'You'}</p>
                <p className="text-[11px] text-text-secondary">{selectedLog.user_email || ''}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Timestamp</span>
                <p className="font-semibold text-text-primary mt-0.5">{formatDate(selectedLog.created_at)}</p>
                <p className="text-[10px] font-mono text-text-muted">{new Date(selectedLog.created_at).toISOString()}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">IP Address</span>
                <p className="font-mono text-text-primary font-medium mt-0.5">{selectedLog.ip || '127.0.0.1'}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Device</span>
                <p className="text-text-secondary mt-0.5 truncate">{parseUserAgent(selectedLog.user_agent)}</p>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Summary</span>
              <p className="text-xs font-medium text-text-primary bg-surface p-2.5 rounded-lg border border-border">
                {selectedLog.details || 'No additional summary recorded.'}
              </p>
            </div>

            {selectedLog.metadata && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                  Structured Metadata Payload
                </span>
                <pre className="p-3 bg-surface-muted text-text-primary rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto border border-border whitespace-pre-wrap break-all">
                  {typeof selectedLog.metadata === 'object'
                    ? JSON.stringify(selectedLog.metadata, null, 2)
                    : String(selectedLog.metadata)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
