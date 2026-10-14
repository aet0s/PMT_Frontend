// client/src/components/Members/MemberAuditModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Key,
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  MessageSquare,
  Eye,
  Calendar,
  CheckSquare,
  LayoutGrid,
  Users,
  Briefcase
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { apiFetch } from '../../api/client';
import { formatDate } from '../../lib/dateFormat';
import { useToast } from '../ui/Toast';

const CATEGORIES = [
  { id: 'all', label: 'All Activity', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'tasks', label: 'Tasks & Checklists', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: 'boards', label: 'Boards & Lists', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'auth', label: 'Auth & Security', icon: <Key className="w-3.5 h-3.5" /> },
  { id: 'members', label: 'Members & Roles', icon: <Users className="w-3.5 h-3.5" /> }
];

export default function MemberAuditModal({ isOpen, onClose, member, workspaceId }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
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

  const loadAudit = useCallback(async (targetPage = page) => {
    if (!member?.id) return;
    setIsLoading(true);
    try {
      const qParams = new URLSearchParams();
      qParams.set('user_id', String(member.id));
      qParams.set('page', String(targetPage));
      qParams.set('limit', '20'); // exactly 20 items per page
      if (workspaceId) qParams.set('workspace_id', String(workspaceId));
      if (debouncedSearch) qParams.set('search', debouncedSearch);
      if (category !== 'all') qParams.set('category', category);

      const res = await apiFetch(`/api/auth/activity?${qParams.toString()}`).catch(() => ({
        events: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
      }));

      const events = res.events || res.logs || res.activities || [];
      setLogs(events);
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
          total: events.length,
          totalPages: Math.ceil(events.length / 20) || 1
        });
      }
    } catch (err) {
      toast.show('Failed to load member audit log', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [member?.id, workspaceId, debouncedSearch, category, page, toast]);

  useEffect(() => {
    if (isOpen && member?.id) {
      loadAudit(page);
    }
  }, [isOpen, member?.id, page, loadAudit]);

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
    if (act.includes('role') || act.includes('permission') || act.includes('security')) {
      return { variant: 'primary', icon: <Shield className="w-3 h-3" /> };
    }
    if (act.includes('login') || act.includes('auth') || act.includes('2fa') || act.includes('session')) {
      return { variant: 'info', icon: <Key className="w-3 h-3" /> };
    }
    if (act.includes('comment')) {
      return { variant: 'info', icon: <MessageSquare className="w-3 h-3" /> };
    }
    if (act.includes('checklist') || act.includes('complete') || act.includes('card') || act.includes('task')) {
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

  if (!isOpen || !member) return null;

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3.5">
            <Avatar name={member.name} src={member.avatar_url || member.avatar} size="md" className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base sm:text-lg text-text-primary truncate">
                  {member.name}
                </span>
                <Badge variant="primary" size="sm">
                  {member.role || 'Team Member'}
                </Badge>
              </div>
              <p className="text-xs text-text-muted font-normal truncate mt-0.5">
                {member.email} • Comprehensive User Audit Trail
              </p>
            </div>
          </div>
        }
        size="3xl"
        className="w-full max-w-6xl max-h-[92vh] flex flex-col"
      >
        <div className="space-y-4 text-left w-full">
          {/* Filter Pills and Search Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface-muted/60 p-3 rounded-2xl border border-border">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    category === cat.id
                      ? 'bg-primary text-white shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 shrink-0">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search user actions, tasks, IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition min-h-[36px]"
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
              <Button type="submit" variant="secondary" size="sm" className="h-[36px] px-3 text-xs">
                Search
              </Button>
              <button
                type="button"
                onClick={() => loadAudit(page)}
                title="Refresh audit log"
                aria-label="Refresh audit log"
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl border border-border transition cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
              </button>
            </form>
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-surface border border-border rounded-2xl overflow-hidden shadow-xs w-full">
            <table className="w-full table-fixed text-xs text-left">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[34%]" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="bg-surface-muted text-text-secondary border-b border-border uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th scope="col" className="py-3 px-4">Action</th>
                  <th scope="col" className="py-3 px-4">Details</th>
                  <th scope="col" className="py-3 px-4">Context / Target</th>
                  <th scope="col" className="py-3 px-4">Timestamp & Device</th>
                  <th scope="col" className="py-3 px-3 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-primary">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Spinner size="md" />
                        <span>Loading audit records...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      <Activity className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-40" />
                      <p className="font-semibold text-text-primary">No activity records found</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {search ? 'Try adjusting your search criteria.' : 'Activities performed by this user will appear here.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const badgeProps = getActionBadgeProps(log.action_type || log.event || log.action);
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-surface-muted/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-medium min-w-0">
                          <Badge variant={badgeProps.variant} size="sm">
                            <span className="flex items-center gap-1 font-mono text-[11px] truncate">
                              {badgeProps.icon}
                              <span className="truncate">{log.action_type || log.event || log.action || 'activity'}</span>
                            </span>
                          </Badge>
                        </td>

                        <td className="py-3 px-4 min-w-0">
                          <span className="truncate block font-medium text-text-primary text-xs" title={log.details}>
                            {log.details || log.action || '—'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-text-secondary text-[11px] min-w-0">
                          <div className="space-y-0.5 truncate">
                            {log.card_title && (
                              <div className="truncate text-primary font-medium">Task: {log.card_title}</div>
                            )}
                            {log.board_name && (
                              <div className="truncate text-text-muted">Board: {log.board_name}</div>
                            )}
                            {!log.card_title && !log.board_name && (
                              <span className="text-text-muted italic">System / Account</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-text-secondary text-[11px] whitespace-nowrap min-w-0">
                          <div className="font-medium text-text-primary">{formatDate(log.created_at)}</div>
                          <div className="text-[10px] text-text-muted font-mono truncate">
                            {log.ip || '127.0.0.1'} • {parseUserAgent(log.user_agent)}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
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

          {/* Mobile Stacked Card View (< 768px) */}
          <div className="md:hidden space-y-2.5 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-text-muted">
                <Spinner size="md" className="mx-auto mb-2" />
                Loading audit records...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-border rounded-xl text-xs text-text-muted">
                <Activity className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-40" />
                <p className="font-semibold text-text-primary">No activity records found</p>
              </div>
            ) : (
              logs.map((log) => {
                const badgeProps = getActionBadgeProps(log.action_type || log.event || log.action);
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="p-3.5 bg-surface border border-border rounded-xl shadow-2xs space-y-2 cursor-pointer hover:bg-surface-muted/30 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={badgeProps.variant} size="sm">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          {badgeProps.icon}
                          <span>{log.action_type || log.event || log.action || 'activity'}</span>
                        </span>
                      </Badge>
                      <span className="text-[10px] text-text-muted">{formatDate(log.created_at)}</span>
                    </div>

                    <p className="text-xs font-semibold text-text-primary">{log.details || log.action || '—'}</p>

                    {(log.card_title || log.board_name) && (
                      <div className="text-[11px] text-text-muted bg-surface-muted/50 p-2 rounded-lg border border-border/50">
                        {log.card_title && <div className="text-primary font-medium truncate">Task: {log.card_title}</div>}
                        {log.board_name && <div className="truncate">Board: {log.board_name}</div>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Server-Side Pagination Footer (20 items/page) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-xs text-text-secondary">
            <div>
              {pagination.total > 0 ? (
                <span>
                  Showing <strong className="text-text-primary">{startRecord}</strong> to{' '}
                  <strong className="text-text-primary">{endRecord}</strong> of{' '}
                  <strong className="text-text-primary">{pagination.total}</strong> records (20 / page)
                </span>
              ) : (
                <span>No records</span>
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
                Prev
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
        </div>
      </Modal>

      {/* Inspect Audit Record Details Modal */}
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
                <p className="font-semibold text-text-primary mt-0.5">{selectedLog.user_name || member.name}</p>
                <p className="text-[11px] text-text-secondary">{selectedLog.user_email || member.email}</p>
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
    </>
  );
}
