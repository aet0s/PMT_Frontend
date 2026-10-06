// client/src/pages/settings/tabs/SecurityLogTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Download,
  Filter,
  Clock,
  Search,
  RefreshCw,
  Eye,
  X,
  Laptop,
  Key,
  Shield,
  User,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
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
  const [category, setCategory] = useState('all'); // 'all' | 'auth' | 'roles' | 'workspace'
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (workspace?.id) qParams.set('workspace_id', workspace.id);
      if (search.trim()) qParams.set('search', search.trim());
      if (category !== 'all') qParams.set('category', category);

      const res = await apiFetch(`/api/auth/activity?${qParams.toString()}`).catch(() => ({
        events: []
      }));
      setLogs(res.events || res.logs || []);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
      toast.show('Failed to refresh security logs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspace?.id) {
      loadLogs();
    }
  }, [workspace?.id, category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLogs();
  };

  const getEventBadgeProps = (eventType = '') => {
    const et = String(eventType).toLowerCase();
    if (et.includes('fail') || et.includes('denied') || et.includes('delete') || et.includes('revoke')) {
      return { variant: 'danger', icon: <AlertTriangle className="w-3 h-3" /> };
    }
    if (et.includes('role') || et.includes('permission') || et.includes('security')) {
      return { variant: 'primary', icon: <Shield className="w-3 h-3" /> };
    }
    if (et.includes('login') || et.includes('auth') || et.includes('2fa') || et.includes('session')) {
      return { variant: 'info', icon: <Key className="w-3 h-3" /> };
    }
    if (et.includes('workspace') || et.includes('board') || et.includes('create')) {
      return { variant: 'success', icon: <CheckCircle className="w-3 h-3" /> };
    }
    return { variant: 'neutral', icon: <Info className="w-3 h-3" /> };
  };

  const parseUserAgent = (ua) => {
    if (!ua) return 'Unknown Device';
    if (ua.includes('Chrome')) return 'Chrome / Desktop';
    if (ua.includes('Firefox')) return 'Firefox / Desktop';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Postman') || ua.includes('curl')) return 'API Client';
    return ua.length > 30 ? `${ua.slice(0, 30)}...` : ua;
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      toast.show('No logs to export', 'info');
      return;
    }
    const header = ['ID', 'Event Type', 'Action', 'Actor Name', 'Actor Email', 'IP Address', 'Details', 'Timestamp'];
    const rows = logs.map((l) => [
      l.id,
      `"${l.event || l.event_type || ''}"`,
      `"${l.action || ''}"`,
      `"${l.user_name || 'System'}"`,
      `"${l.user_email || ''}"`,
      `"${l.ip || '127.0.0.1'}"`,
      `"${String(l.details || '').replace(/"/g, '""')}"`,
      `"${l.created_at || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `security_log_ws_${workspace?.id || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.show('Security log exported to CSV', 'success');
  };

  return (
    <div className="space-y-6 w-full max-w-full text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Security Audit Log
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Immutable log of administrative, permission, and authentication events in this workspace.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted/60 border border-border rounded-xl self-start flex-wrap">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'auth', label: 'Auth & Sessions' },
            { id: 'roles', label: 'Roles & RBAC' },
            { id: 'workspace', label: 'Workspace' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                category === cat.id
                  ? 'bg-surface text-primary shadow-xs border border-border font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search event, user, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Log Records Table - table-fixed with zero horizontal overflow */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs w-full">
        <table className="w-full table-fixed text-xs text-left">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[17%]" />
            <col className="w-[29%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead className="bg-surface-muted text-text-secondary border-b border-border uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="py-3 px-3.5">Event</th>
              <th className="py-3 px-3.5">Actor</th>
              <th className="py-3 px-3.5">Details</th>
              <th className="py-3 px-3.5">IP & Device</th>
              <th className="py-3 px-3.5">Timestamp</th>
              <th className="py-3 px-3 text-center">Inspect</th>
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
                  <p className="font-semibold text-text-primary">No security events found</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {search ? 'Try clearing your search query.' : 'Administrative activities will be logged here automatically.'}
                  </p>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badgeProps = getEventBadgeProps(log.event || log.event_type);
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
                            <span className="truncate">{log.event || log.event_type || log.action || 'event'}</span>
                          </span>
                        </Badge>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-3.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          name={log.user_name || log.user_email || 'System'}
                          size="xs"
                        />
                        <div className="min-w-0 flex-1 truncate">
                          <div className="font-semibold text-text-primary text-xs truncate">
                            {log.user_name || log.user_email || 'System'}
                          </div>
                          {log.user_email && log.user_name && (
                            <div className="text-[10px] text-text-muted truncate">
                              {log.user_email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Details summary */}
                    <td className="py-3 px-3.5 min-w-0">
                      <span className="truncate block text-xs text-text-secondary font-medium" title={log.details}>
                        {log.details || '—'}
                      </span>
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-primary bg-primary-tint/60 hover:bg-primary-tint border border-primary/20 transition cursor-pointer"
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

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={
          selectedLog ? (
            <div className="flex items-center gap-2">
              <Badge variant={getEventBadgeProps(selectedLog.event || selectedLog.event_type).variant}>
                {selectedLog.event || selectedLog.event_type || 'Event'}
              </Badge>
              <span>{selectedLog.action || selectedLog.event || 'Security Event Details'}</span>
            </div>
          ) : 'Security Event Details'
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
