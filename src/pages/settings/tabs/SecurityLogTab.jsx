// client/src/pages/settings/tabs/SecurityLogTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Download,
  Search,
  RefreshCw,
  Eye,
  Key,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  MessageSquare,
  LayoutGrid,
  Users,
  Briefcase,
  X
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Avatar from '../../../components/ui/Avatar';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { apiFetch } from '../../../api/client';
import { formatDate } from '../../../lib/dateFormat';

export default function SecurityLogTab({ workspace }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [scope, setScope] = useState('company'); // 'company' (all users in company) | 'workspace' (current workspace only)
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [selectedLog, setSelectedLog] = useState(null);

  // Debounce search input for seamless API search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadLogs = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    try {
      const qParams = new URLSearchParams();
      qParams.set('page', String(targetPage));
      qParams.set('limit', '20'); // Exactly 20 items per page

      if (scope === 'workspace' && workspace?.id) {
        qParams.set('workspace_id', String(workspace.id));
      }
      if (debouncedSearch) {
        qParams.set('search', debouncedSearch);
      }
      if (category !== 'all') {
        qParams.set('category', category);
      }

      const res = await apiFetch(`/api/auth/activity?${qParams.toString()}`).catch(() => ({
        events: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
      }));

      const eventsList = res.events || res.logs || res.activities || [];
      setLogs(eventsList);

      if (res.pagination) {
        setPagination({
          page: res.pagination.page || targetPage,
          limit: res.pagination.limit || 20,
          total: res.pagination.total || 0,
          totalPages: res.pagination.totalPages || Math.ceil((res.pagination.total || 0) / (res.pagination.limit || 20)) || 1
        });
      } else {
        setPagination((prev) => ({
          ...prev,
          page: targetPage,
          total: eventsList.length,
          totalPages: 1
        }));
      }
    } catch (err) {
      console.warn('Failed to load company audit logs:', err);
      toast.show('Failed to refresh activity logs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, category, scope, workspace?.id, page, toast]);

  useEffect(() => {
    loadLogs(page);
  }, [loadLogs, page]);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setPage(1);
  };

  const handleScopeChange = (newScope) => {
    setScope(newScope);
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

  const getEventBadgeProps = (eventType = '') => {
    const et = String(eventType).toLowerCase();
    if (et.includes('fail') || et.includes('denied') || et.includes('delete') || et.includes('revoke') || et.includes('removed')) {
      return { variant: 'danger', icon: <AlertTriangle className="w-3 h-3" /> };
    }
    if (et.includes('role') || et.includes('permission') || et.includes('security')) {
      return { variant: 'primary', icon: <Shield className="w-3 h-3" /> };
    }
    if (et.includes('login') || et.includes('auth') || et.includes('2fa') || et.includes('session')) {
      return { variant: 'info', icon: <Key className="w-3 h-3" /> };
    }
    if (et.includes('comment')) {
      return { variant: 'info', icon: <MessageSquare className="w-3 h-3" /> };
    }
    if (et.includes('checklist') || et.includes('complete') || et.includes('card') || et.includes('task')) {
      return { variant: 'success', icon: <CheckSquare className="w-3 h-3" /> };
    }
    if (et.includes('board') || et.includes('list')) {
      return { variant: 'primary', icon: <LayoutGrid className="w-3 h-3" /> };
    }
    if (et.includes('member') || et.includes('invite')) {
      return { variant: 'neutral', icon: <Users className="w-3 h-3" /> };
    }
    return { variant: 'neutral', icon: <Info className="w-3 h-3" /> };
  };

  const parseUserAgent = (ua) => {
    if (!ua) return 'Web / Desktop';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Postman') || ua.includes('curl')) return 'API Client';
    return ua.length > 20 ? `${ua.slice(0, 20)}...` : ua;
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      toast.show('No logs to export', 'info');
      return;
    }
    const header = ['ID', 'Action Type', 'Actor Name', 'Actor Email', 'Workspace', 'Board', 'Card', 'Details', 'IP Address', 'Timestamp'];
    const rows = logs.map((l) => [
      l.id,
      `"${l.action_type || l.event || ''}"`,
      `"${l.user_name || 'System'}"`,
      `"${l.user_email || ''}"`,
      `"${l.workspace_name || ''}"`,
      `"${l.board_name || ''}"`,
      `"${l.card_title || ''}"`,
      `"${String(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ip || '127.0.0.1'}"`,
      `"${l.created_at || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_log_page_${page}_${scope}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.show('Activity log exported to CSV', 'success');
  };

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6 w-full max-w-full text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Company Activity & Audit Log
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Complete, immutable audit trail of every user and action across this company — cards, checklists, comments, boards, permissions, and security.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLogs(page)}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Scope Selector & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Scope Selector: Company-Wide vs Workspace */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted/70 border border-border rounded-xl">
          <button
            type="button"
            onClick={() => handleScopeChange('company')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              scope === 'company'
                ? 'bg-surface text-primary shadow-xs border border-border font-bold'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Entire Company (All Users)</span>
          </button>

          {workspace?.name && (
            <button
              type="button"
              onClick={() => handleScopeChange('workspace')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                scope === 'workspace'
                  ? 'bg-surface text-primary shadow-xs border border-border font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              <span>{workspace.name} Only</span>
            </button>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <label htmlFor="activity-search-input" className="sr-only">
              Search activities, users, cards, or IP
            </label>
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              id="activity-search-input"
              type="text"
              placeholder="Search user, card, board, IP, event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[36px] transition"
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

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-muted/50 border border-border rounded-xl flex-wrap">
        {[
          { id: 'all', label: 'All Activities', icon: <ShieldCheck className="w-3 h-3" /> },
          { id: 'tasks', label: 'Tasks & Cards', icon: <CheckSquare className="w-3 h-3" /> },
          { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-3 h-3" /> },
          { id: 'boards', label: 'Boards & Lists', icon: <LayoutGrid className="w-3 h-3" /> },
          { id: 'auth', label: 'Auth & Security', icon: <Key className="w-3 h-3" /> },
          { id: 'members', label: 'Members', icon: <Users className="w-3 h-3" /> },
          { id: 'roles', label: 'Roles & RBAC', icon: <Shield className="w-3 h-3" /> },
          { id: 'workspace', label: 'Workspaces', icon: <Briefcase className="w-3 h-3" /> }
        ].map((cat) => (
          <button
            key={cat.id}
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

      {/* Desktop Log Records Table (>= 768px) */}
      <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden shadow-xs w-full">
        <table className="w-full table-fixed text-xs text-left">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[17%]" />
            <col className="w-[32%]" />
            <col className="w-[12%]" />
            <col className="w-[13%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="bg-surface-muted text-text-secondary border-b border-border uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th scope="col" className="py-3 px-3.5">Action</th>
              <th scope="col" className="py-3 px-3.5">Actor (User)</th>
              <th scope="col" className="py-3 px-3.5">Activity Details</th>
              <th scope="col" className="py-3 px-3.5">IP & Device</th>
              <th scope="col" className="py-3 px-3.5">Timestamp</th>
              <th scope="col" className="py-3 px-3 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text-primary">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading audit records...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-muted">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
                  <p className="font-semibold text-text-primary">No activity records found</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {search ? 'Try clearing your search query or selecting a different filter.' : 'All user activities and audit events will appear here.'}
                  </p>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badgeProps = getEventBadgeProps(log.action_type || log.event || log.event_type);
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-surface-muted/30 transition-colors cursor-pointer group"
                  >
                    {/* Event badge */}
                    <td className="py-3 px-3.5 font-medium min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge variant={badgeProps.variant} size="sm">
                          <span className="flex items-center gap-1 font-mono text-[11px] truncate">
                            {badgeProps.icon}
                            <span className="truncate">{log.action_type || log.event || log.event_type || 'activity'}</span>
                          </span>
                        </Badge>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-3.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          name={log.user_name || log.user_email || 'System'}
                          src={log.user_avatar}
                          size="xs"
                        />
                        <div className="min-w-0 flex-1 truncate">
                          <div className="font-semibold text-text-primary text-xs truncate">
                            {log.user_name || log.user_email || 'System'}
                          </div>
                          {log.user_email && (
                            <div className="text-[10px] text-text-muted truncate">
                              {log.user_email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Details summary */}
                    <td className="py-3 px-3.5 min-w-0">
                      <div className="space-y-0.5 min-w-0">
                        <span className="truncate block text-xs text-text-primary font-medium" title={log.details}>
                          {log.details || log.action || '—'}
                        </span>
                        {(log.card_title || log.board_name || log.workspace_name) && (
                          <div className="flex items-center gap-1.5 text-[10px] text-text-muted truncate">
                            {log.workspace_name && <span className="truncate">WS: {log.workspace_name}</span>}
                            {log.board_name && <span className="truncate">• Board: {log.board_name}</span>}
                            {log.card_title && <span className="truncate text-primary font-medium">• Task: {log.card_title}</span>}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* IP & Device */}
                    <td className="py-3 px-3.5 min-w-0">
                      <div className="text-[11px] font-mono text-text-secondary truncate">{log.ip || '127.0.0.1'}</div>
                      <div className="text-[10px] text-text-muted truncate" title={log.user_agent}>
                        {parseUserAgent(log.user_agent)}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-text-secondary text-[11px]">
                      {formatDate(log.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-primary bg-primary-tint/60 hover:bg-primary-tint border border-primary/20 transition cursor-pointer min-h-[30px]"
                        title="View audit event payload and metadata"
                        aria-label="View audit event payload and metadata"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0" />
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
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center bg-surface border border-border rounded-xl text-xs text-text-muted">
            <RefreshCw className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-border rounded-xl text-xs text-text-muted">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
            <p className="font-semibold text-text-primary">No activity records found</p>
          </div>
        ) : (
          logs.map((log) => {
            const badgeProps = getEventBadgeProps(log.action_type || log.event || log.event_type);
            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedLog(log);
                  }
                }}
                className="p-4 bg-surface hover:bg-surface-hover border border-border rounded-xl shadow-2xs space-y-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={badgeProps.variant} size="sm">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      {badgeProps.icon}
                      <span>{log.action_type || log.event || log.event_type || 'activity'}</span>
                    </span>
                  </Badge>
                  <span className="text-[11px] text-text-muted">{formatDate(log.created_at)}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Avatar name={log.user_name || log.user_email || 'System'} src={log.user_avatar} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {log.user_name || log.user_email || 'System'}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono truncate">
                      {log.ip || '127.0.0.1'} • {parseUserAgent(log.user_agent)}
                    </p>
                  </div>
                </div>

                {log.details && (
                  <p className="text-xs text-text-secondary bg-surface-muted/50 p-2 rounded-lg border border-border/50 line-clamp-2">
                    {log.details}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Server-Side Pagination Controls (20 items per page) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-xs text-text-secondary">
        <div>
          {pagination.total > 0 ? (
            <span>
              Showing <strong className="text-text-primary">{startRecord}</strong> to{' '}
              <strong className="text-text-primary">{endRecord}</strong> of{' '}
              <strong className="text-text-primary">{pagination.total}</strong> activities (20 per page)
            </span>
          ) : (
            <span>No activities to display</span>
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

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={
          selectedLog ? (
            <div className="flex items-center gap-2">
              <Badge variant={getEventBadgeProps(selectedLog.action_type || selectedLog.event).variant}>
                {selectedLog.action_type || selectedLog.event || 'Activity'}
              </Badge>
              <span>{selectedLog.action || selectedLog.action_type || 'Activity Details'}</span>
            </div>
          ) : 'Activity Details'
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
            {/* Actor & Time Grid */}
            <div className="grid grid-cols-2 gap-3 bg-surface-muted/50 p-3.5 rounded-xl border border-border">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Actor</span>
                <p className="font-semibold text-text-primary mt-0.5">
                  {selectedLog.user_name || selectedLog.user_email || 'System'}
                </p>
                {selectedLog.user_email && (
                  <p className="text-[11px] text-text-secondary">{selectedLog.user_email}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Timestamp</span>
                <p className="font-semibold text-text-primary mt-0.5">
                  {formatDate(selectedLog.created_at)}
                </p>
                <p className="text-[10px] font-mono text-text-muted">
                  {new Date(selectedLog.created_at).toISOString()}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">IP Address</span>
                <p className="font-mono text-text-primary font-medium mt-0.5">
                  {selectedLog.ip || '127.0.0.1'}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Device / Agent</span>
                <p className="text-text-secondary mt-0.5 truncate" title={selectedLog.user_agent}>
                  {parseUserAgent(selectedLog.user_agent)}
                </p>
              </div>
            </div>

            {/* Target Entities (Workspace / Board / Card) */}
            {(selectedLog.workspace_name || selectedLog.board_name || selectedLog.card_title) && (
              <div className="p-3 bg-surface-muted/30 rounded-xl border border-border space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Target Context</span>
                <div className="grid grid-cols-3 gap-2">
                  {selectedLog.workspace_name && (
                    <div>
                      <span className="text-[10px] text-text-muted block">Workspace</span>
                      <p className="font-medium text-text-primary truncate">{selectedLog.workspace_name}</p>
                    </div>
                  )}
                  {selectedLog.board_name && (
                    <div>
                      <span className="text-[10px] text-text-muted block">Board</span>
                      <p className="font-medium text-text-primary truncate">{selectedLog.board_name}</p>
                    </div>
                  )}
                  {selectedLog.card_title && (
                    <div>
                      <span className="text-[10px] text-text-muted block">Card / Task</span>
                      <p className="font-medium text-primary truncate">{selectedLog.card_title}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary Description */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Summary</span>
              <p className="text-xs font-medium text-text-primary bg-surface p-2.5 rounded-lg border border-border">
                {selectedLog.details || 'No additional summary recorded.'}
              </p>
            </div>

            {/* Raw Metadata JSON */}
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
