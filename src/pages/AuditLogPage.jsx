// client/src/pages/AuditLogPage.jsx
// Enterprise-grade, production-level Audit Log page with URL-persisted filters,
// keyset pagination, hash-chain integrity verification, CSV/JSON streaming export,
// readable action sentences, and full forensic drawer.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  FileCode,
  Key,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Hash,
  Layers,
  Sparkles,
  ExternalLink,
  Info,
  X,
  Check
} from 'lucide-react';

import {
  getWorkspaceAuditEvents,
  getWorkspaceAuditFacets,
  getWorkspaceAuditEventDetail,
  verifyWorkspaceAuditIntegrity
} from '../api/workspaces';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../components/ui/Toast';
import { Drawer } from '../components/ui/Drawer';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import DatePicker from '../components/shared/DatePicker';
import { getApiUrl } from '../api/config';

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7d', label: 'Last 7 days' },
  { id: 'last_30d', label: 'Last 30 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'custom', label: 'Custom' }
];

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'auth', label: 'Auth' },
  { id: 'security', label: 'Security' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'member', label: 'Members' },
  { id: 'role', label: 'Roles' },
  { id: 'board', label: 'Boards' },
  { id: 'list', label: 'Lists' },
  { id: 'card', label: 'Cards' },
  { id: 'checklist', label: 'Checklists' },
  { id: 'comment', label: 'Comments' },
  { id: 'attachment', label: 'Attachments' },
  { id: 'label', label: 'Labels' },
  { id: 'checkin', label: 'Check-ins' },
  { id: 'leave', label: 'Leave' },
  { id: 'export', label: 'Exports' },
  { id: 'audit', label: 'Audit' }
];

function formatTimestamp(isoStr, timeZone = 'Asia/Kolkata') {
  if (!isoStr) return { local: '—', utc: '—' };
  try {
    const d = new Date(isoStr);
    const local = new Intl.DateTimeFormat('en-IN', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(d);
    const utc = d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    return { local, utc };
  } catch {
    return { local: String(isoStr), utc: String(isoStr) };
  }
}

export function buildReadableSentence(event) {
  const actor = event.actor_name || (event.actor_user_id ? `User #${event.actor_user_id}` : 'System');
  const target = event.target_user_name || (event.target_user_id ? `User #${event.target_user_id}` : '');
  const title = event.entity_label || (event.entity_id ? `#${event.entity_id}` : '');
  const meta = event.meta || {};

  switch (event.action) {
    case 'card.copied': {
      const srcTitle = meta.source_card_title || 'original card';
      const srcBoard = meta.source_board_name || 'source board';
      const targetBoard = meta.target_board_name || 'target board';
      const targetList = meta.target_list_name || 'list';
      return `${actor} copied card '${srcTitle}' from ${srcBoard} to ${targetList} (${targetBoard})`;
    }
    case 'card.created':
      return `${actor} created card '${title}'`;
    case 'card.moved': {
      const fromList = meta.from_list_name || 'list';
      const toList = meta.to_list_name || 'list';
      return `${actor} moved card '${title}' from ${fromList} to ${toList}`;
    }
    case 'card.completed':
      return `${actor} completed card '${title}'`;
    case 'card.reopened':
      return `${actor} reopened card '${title}'`;
    case 'card.deleted':
      return `${actor} deleted card '${title}'`;
    case 'card.archived':
      return `${actor} archived card '${title}'`;
    case 'card.restored':
      return `${actor} restored card '${title}'`;
    case 'card.assigned':
    case 'card.assignee_added':
      return `${actor} assigned ${target || 'a member'} to card '${title}'`;
    case 'card.unassigned':
    case 'card.assignee_removed':
      return `${actor} unassigned ${target || 'a member'} from card '${title}'`;
    case 'card.assigner_added':
      return `${actor} set ${target || actor} as assigner on card '${title}'`;
    case 'card.assigner_removed':
      return `${actor} removed assigner ${target || ''} from card '${title}'`;
    case 'card.assigner_changed':
      return `${actor} changed assigner on card '${title}'`;
    case 'member.role_changed':
    case 'workspace.member_role_changed': {
      const oldRole = meta.old_role || meta.from_role || 'role';
      const newRole = meta.new_role || meta.to_role || 'role';
      return `${actor} changed ${target || 'member'}'s role from ${oldRole} to ${newRole}`;
    }
    case 'board.deleted':
      return `${actor} deleted board '${title}'`;
    case 'board.created':
      return `${actor} created board '${title}'`;
    case 'comment.created':
      return `${actor} commented on card '${title}'`;
    case 'attachment.uploaded':
      return `${actor} attached '${meta.file_name || 'file'}' to card '${title}'`;
    case 'checklist.item_toggled':
      return `${actor} toggled checklist item on card '${title}'`;
    case 'auth.login_failed':
      return `${actor} login failed (${meta.reason || 'invalid credentials'})`;
    case 'auth.login':
      return event.outcome === 'success' ? `${actor} logged in` : `${actor} login failed (${meta.reason || 'invalid credentials'})`;
    case 'auth.logout':
      return `${actor} logged out`;
    case 'security.permission_denied':
      return `${actor} attempt was denied permission: ${meta.route || meta.action || 'action'}`;
    case 'workspace.export':
      return `${actor} exported ${meta.row_count || ''} rows (${meta.format || 'csv'})`;
    case 'audit.integrity_verify':
    case 'audit.verified':
      return `${actor} verified audit chain integrity (${event.outcome || 'success'})`;
    case 'workspace.auto_archive':
      return `${actor} auto-archived ${meta.archivedCount || meta.archived_count || ''} completed task(s) (${meta.days || 7}d policy)`;
    case 'api.mutation':
      return `${actor} called API endpoint '${meta.route || title}'`;
    default:
      return `${actor} performed ${event.action} on ${event.entity_type} '${title}'`;
  }
}

export default function AuditLogPage({ workspace }) {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('audit.view');
  const canExport = hasPermission('audit.export');

  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven filter states
  const presetParam = searchParams.get('preset') || 'last_7d';
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const actorParam = searchParams.get('actor') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const actionParam = searchParams.get('action') || '';
  const outcomeParam = searchParams.get('outcome') || 'all';
  const severityParam = searchParams.get('severity') || 'all';
  const boardParam = searchParams.get('board') || 'all';
  const qParam = searchParams.get('q') || '';
  const ipParam = searchParams.get('ip') || '';
  const limitParam = parseInt(searchParams.get('limit') || '20', 10);
  const cursorParam = searchParams.get('cursor') || '';
  const sortParam = searchParams.get('sort') || 'desc';

  const [events, setEvents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [facets, setFacets] = useState({ actors: [], categories: [], actions: [], boards: [] });

  // Custom date picker popover state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerAnchorRef = useRef(null);

  // Detail drawer state
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Integrity verification modal state
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // Export downloading state ('csv' | 'json' | null)
  const [exportingFormat, setExportingFormat] = useState(null);

  // Count active filters (excluding defaults)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (presetParam && presetParam !== 'last_7d') count++;
    if (categoryParam && categoryParam !== 'all') count++;
    if (outcomeParam && outcomeParam !== 'all') count++;
    if (severityParam && severityParam !== 'all') count++;
    if (boardParam && boardParam !== 'all') count++;
    if (actorParam) count++;
    if (actionParam) count++;
    if (qParam) count++;
    if (ipParam) count++;
    return count;
  }, [presetParam, categoryParam, outcomeParam, severityParam, boardParam, actorParam, actionParam, qParam, ipParam]);

  // Compute date ranges based on preset
  const computePresetDates = useCallback((preset) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    switch (preset) {
      case 'today': {
        const todayStr = toYMD(now);
        return { from: todayStr, to: todayStr };
      }
      case 'yesterday': {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yestStr = toYMD(yest);
        return { from: yestStr, to: yestStr };
      }
      case 'last_7d': {
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 6);
        return { from: toYMD(d7), to: toYMD(now) };
      }
      case 'last_30d': {
        const d30 = new Date(now);
        d30.setDate(d30.getDate() - 29);
        return { from: toYMD(d30), to: toYMD(now) };
      }
      case 'this_month': {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: toYMD(first), to: toYMD(now) };
      }
      default:
        return { from: fromParam, to: toParam };
    }
  }, [fromParam, toParam]);

  // Load facets on mount
  useEffect(() => {
    if (!workspace?.id || !canView) return;
    async function fetchFacets() {
      try {
        const data = await getWorkspaceAuditFacets(workspace.id);
        setFacets(data);
      } catch (err) {
        console.error('Failed to load audit facets:', err);
      }
    }
    fetchFacets();

    // Auto-fetch trigger and anchor verification status on mount (Item 9)
    verifyWorkspaceAuditIntegrity(workspace.id)
      .then((res) => setVerifyResult(res))
      .catch(() => {});
  }, [workspace?.id, canView]);

  // Load audit events
  const loadEvents = useCallback(async (isRefresh = false) => {
    if (!workspace?.id || !canView) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const dates = presetParam === 'custom'
        ? { from: fromParam, to: toParam }
        : computePresetDates(presetParam);

      const filterPayload = {
        from: dates.from,
        to: dates.to,
        actor_id: actorParam || undefined,
        category: categoryParam !== 'all' ? categoryParam : undefined,
        action: actionParam || undefined,
        outcome: outcomeParam !== 'all' ? outcomeParam : undefined,
        severity: severityParam !== 'all' ? severityParam : undefined,
        board_id: boardParam !== 'all' ? boardParam : undefined,
        q: qParam || undefined,
        ip: ipParam || undefined,
        sort: sortParam,
        limit: limitParam,
        cursor: cursorParam || undefined
      };

      const res = await getWorkspaceAuditEvents(workspace.id, filterPayload);
      setEvents(res.events || []);
      setTotalCount(res.pagination?.total ?? res.total ?? 0);
      setNextCursor(res.pagination?.next_cursor ?? res.next_cursor ?? null);
    } catch (err) {
      console.error('Failed to load audit events:', err);
      toast?.show(err.message || 'Failed to load audit log', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    workspace?.id,
    canView,
    presetParam,
    fromParam,
    toParam,
    computePresetDates,
    actorParam,
    categoryParam,
    actionParam,
    outcomeParam,
    severityParam,
    boardParam,
    qParam,
    ipParam,
    sortParam,
    limitParam,
    cursorParam,
    toast
  ]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Filter Updater helper
  const updateFilters = (newParams) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      // Reset cursor on filter changes unless cursor is explicitly passed
      if (!('cursor' in newParams)) {
        next.delete('cursor');
        setCursorHistory([]);
      }
      for (const [k, v] of Object.entries(newParams)) {
        if (v === null || v === undefined || v === '' || v === 'all') {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      }
      return next;
    }, { replace: true });
  };

  const handleClearAll = () => {
    setSearchParams(new URLSearchParams({ preset: 'last_7d' }), { replace: true });
    setCursorHistory([]);
  };

  const handleNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, cursorParam || '']);
    updateFilters({ cursor: nextCursor });
  };

  const handlePrevPage = () => {
    if (cursorHistory.length === 0) return;
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    updateFilters({ cursor: prevCursor || null });
  };

  // Row Click: Open Detail Drawer
  const handleRowClick = async (event) => {
    setSelectedEventId(event.id);
    setSelectedEvent(event);
    setDetailLoading(true);
    try {
      const fullDetail = await getWorkspaceAuditEventDetail(workspace.id, event.id);
      setSelectedEvent(fullDetail.event || event);
    } catch (err) {
      console.error('Failed to load audit event detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Verify Integrity
  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const res = await verifyWorkspaceAuditIntegrity(workspace.id);
      setVerifyResult(res);
      toast?.show(res.message || 'Audit chain verified successfully', res.verified ? 'success' : 'error');
    } catch (err) {
      console.error('Integrity verification failed:', err);
      toast?.show(err.message || 'Integrity verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  if (!canView) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h2>
        <p className="text-sm text-text-secondary max-w-md text-center mb-6">
          You need the <code className="px-1.5 py-0.5 rounded bg-surface-muted text-primary font-mono text-xs">audit.view</code> permission to inspect enterprise audit logs.
        </p>
        <Link to={`/w/${workspace?.id}`}>
          <Button variant="primary">Return to Workspace</Button>
        </Link>
      </div>
    );
  }

  // Authenticated export handler for CSV and JSON
  const handleExport = async (format) => {
    if (!workspace?.id) return;
    setExportingFormat(format);
    try {
      const dates = presetParam === 'custom'
        ? { from: fromParam, to: toParam }
        : computePresetDates(presetParam);

      const params = new URLSearchParams();
      params.set('format', format);
      if (dates.from) params.set('from', dates.from);
      if (dates.to) params.set('to', dates.to);
      if (actorParam) params.set('actor_id', actorParam);
      if (categoryParam && categoryParam !== 'all') params.set('category', categoryParam);
      if (actionParam) params.set('action', actionParam);
      if (outcomeParam && outcomeParam !== 'all') params.set('outcome', outcomeParam);
      if (severityParam && severityParam !== 'all') params.set('severity', severityParam);
      if (boardParam && boardParam !== 'all') params.set('board_id', boardParam);
      if (qParam) params.set('q', qParam);
      if (ipParam) params.set('ip', ipParam);

      const token = typeof window !== 'undefined'
        ? (sessionStorage.getItem('pm_token') || localStorage.getItem('pm_token'))
        : null;

      if (token) {
        params.set('token', token);
      }

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const exportUrl = getApiUrl(`/api/workspaces/${workspace.id}/audit-events/export?${params.toString()}`);
      const res = await fetch(exportUrl, {
        headers,
        credentials: 'include'
      });

      if (!res.ok) {
        let errMessage = 'Failed to export audit logs';
        try {
          const errData = await res.json();
          if (errData?.error?.message) errMessage = errData.error.message;
          else if (errData?.message) errMessage = errData.message;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      let filename = `audit-export-ws-${workspace.id}.${format}`;
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast?.show(`Audit log exported as ${format.toUpperCase()}`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      toast?.show(err.message || 'Export failed', 'error');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden">
      {/* Utility & Forensic Trust Status Bar */}
      <div className="px-6 py-2.5 bg-surface border-b border-border/80 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Forensic Ledger Trust Indicators */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider mr-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Ledger Trust:</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-tint text-primary border border-primary/20">
            Append-Only
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-surface-muted text-text-secondary border border-border">
            HMAC-SHA256
          </span>
          {/* Trigger Status Badge */}
          {verifyResult?.triggers_installed ? (
            <span
              data-testid="triggers-status-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              title="PostgreSQL/MySQL append-only triggers are actively enforcing immutability"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Triggers: Active</span>
            </span>
          ) : (
            <span
              data-testid="triggers-status-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              title={verifyResult?.trigger_warning || 'Append-only triggers warning'}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Triggers: Warning</span>
            </span>
          )}
          {/* Anchor Status Badge */}
          {verifyResult?.anchor_match === true ? (
            <span
              data-testid="anchor-status-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              title="Daily SHA-256 integrity anchor verified against chain state"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Anchor: Matched</span>
            </span>
          ) : (
            <span
              data-testid="anchor-status-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              title={verifyResult?.anchor_warning || 'Anchor not established or mismatch'}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Anchor: {verifyResult?.anchor_status === 'mismatch' ? 'Mismatch' : 'Warning'}</span>
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleVerifyIntegrity}
            disabled={verifying}
            className="h-8 px-3 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Verify cryptographic SHA-256 hash chaining of all audit rows"
          >
            {verifying ? <Spinner size="xs" /> : <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            <span>Verify Integrity</span>
          </button>

          {canExport && (
            <div className="inline-flex items-center rounded-lg border border-border bg-surface shadow-2xs p-0.5">
              <button
                type="button"
                onClick={() => handleExport('csv')}
                disabled={exportingFormat !== null}
                className="px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-surface-muted rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Export filtered logs as CSV"
              >
                {exportingFormat === 'csv' ? (
                  <Spinner size="xs" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>CSV</span>
              </button>
              <span className="w-px h-3.5 bg-border my-auto" />
              <button
                type="button"
                onClick={() => handleExport('json')}
                disabled={exportingFormat !== null}
                className="px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-surface-muted rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Export filtered logs as JSON"
              >
                {exportingFormat === 'json' ? (
                  <Spinner size="xs" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                )}
                <span>JSON</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadEvents(true)}
            disabled={refreshing}
            className="h-8 w-8 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-text-secondary hover:text-text-primary shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Enterprise Filter Toolbar - Fixed height, single row, no jumping */}
      <div className="px-6 py-2 bg-surface-muted/60 border-b border-border/80 flex items-center gap-2 overflow-x-auto flex-nowrap h-12 min-h-[48px] max-h-[48px] shrink-0 scrollbar-thin">
        {/* Date Preset Dropdown */}
        <div className="w-32 shrink-0">
          <Select
            aria-label="Filter by date range"
            size="sm"
            value={presetParam}
            onChange={(val) => {
              if (val === 'custom') {
                updateFilters({ preset: 'custom' });
                setIsDatePickerOpen(true);
              } else {
                updateFilters({ preset: val, from: '', to: '' });
              }
            }}
            options={DATE_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          />
        </div>

        {/* Custom Date Range Trigger Button & Popover */}
        {presetParam === 'custom' && (
          <div className="shrink-0">
            <button
              ref={datePickerAnchorRef}
              type="button"
              onClick={() => setIsDatePickerOpen(true)}
              className="h-8 px-2.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-text-primary text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Click to change custom date range"
            >
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-mono text-[11px]">
                {fromParam && toParam
                  ? `${fromParam} → ${toParam}`
                  : fromParam
                  ? `From ${fromParam}`
                  : toParam
                  ? `Until ${toParam}`
                  : 'Select dates'}
              </span>
            </button>
            <DatePicker
              isOpen={isDatePickerOpen}
              onClose={() => setIsDatePickerOpen(false)}
              anchorRef={datePickerAnchorRef}
              startDate={fromParam || null}
              dueDate={toParam || null}
              allowPast={true}
              title="Filter Date Range"
              startLabel="From"
              dueLabel="To"
              onChange={({ startDate, dueDate }) => {
                updateFilters({
                  from: startDate ? startDate.slice(0, 10) : '',
                  to: dueDate ? dueDate.slice(0, 10) : ''
                });
              }}
            />
          </div>
        )}

        {/* Free-text search input */}
        <div className="relative w-56 xl:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search actor, action, IP, entity..."
            value={qParam}
            onChange={(e) => updateFilters({ q: e.target.value })}
            className="w-full h-8 pl-8 pr-8 text-xs bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs transition-colors"
          />
          {qParam && (
            <button
              type="button"
              onClick={() => updateFilters({ q: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Actor Select */}
        <div className="w-36 shrink-0">
          <Select
            aria-label="Filter by actor"
            size="sm"
            value={actorParam || ''}
            onChange={(val) => updateFilters({ actor: val || '' })}
            options={[
              { value: '', label: 'All Actors' },
              ...(facets.actors || []).map((u) => ({
                value: String(u.id),
                label: `${u.name}${u.is_deactivated ? ' (Deactivated)' : ''}`
              }))
            ]}
          />
        </div>

        {/* Category Select */}
        <div className="w-32 shrink-0">
          <Select
            aria-label="Filter by category"
            size="sm"
            value={categoryParam || 'all'}
            onChange={(val) => updateFilters({ category: val || 'all' })}
            options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
          />
        </div>

        {/* Outcome Select */}
        <div className="w-30 shrink-0">
          <Select
            aria-label="Filter by outcome"
            size="sm"
            value={outcomeParam || 'all'}
            onChange={(val) => updateFilters({ outcome: val || 'all' })}
            options={[
              { value: 'all', label: 'All Outcomes' },
              { value: 'success', label: 'Success' },
              { value: 'denied', label: 'Denied' },
              { value: 'failed', label: 'Failed' }
            ]}
          />
        </div>

        {/* Severity Select */}
        <div className="w-30 shrink-0">
          <Select
            aria-label="Filter by severity"
            size="sm"
            value={severityParam || 'all'}
            onChange={(val) => updateFilters({ severity: val || 'all' })}
            options={[
              { value: 'all', label: 'All Severities' },
              { value: 'info', label: 'Info' },
              { value: 'notice', label: 'Notice' },
              { value: 'warning', label: 'Warning' },
              { value: 'critical', label: 'Critical' }
            ]}
          />
        </div>

        {/* Board Select (when workspace has boards) */}
        {facets.boards?.length > 0 && (
          <div className="w-34 shrink-0">
            <Select
              aria-label="Filter by board"
              size="sm"
              value={boardParam || 'all'}
              onChange={(val) => updateFilters({ board: val || 'all' })}
              options={[
                { value: 'all', label: 'All Boards' },
                ...facets.boards.map((b) => ({ value: String(b.id), label: b.name }))
              ]}
            />
          </div>
        )}

        {/* Clear Filters Button - Inline, polished red pill */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="h-8 px-2.5 rounded-lg border border-danger/25 bg-danger-tint/30 hover:bg-danger-tint/60 text-danger text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
            title="Reset all active filters"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-danger/15 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto bg-app">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <Spinner size="lg" />
            <p className="text-xs font-semibold text-text-secondary">Loading audit events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-text-muted border border-border">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">No audit records match your filters</h3>
            <p className="text-xs text-text-secondary max-w-sm">
              Try adjusting the date range, search keywords, or clearing active filters.
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-[11px] font-bold text-text-secondary uppercase tracking-wider sticky top-0 z-10 select-none">
                <th className="py-3 px-4 w-44">Timestamp</th>
                <th className="py-3 px-4 w-52">Actor</th>
                <th className="py-3 px-4">Action & Narrative</th>
                <th className="py-3 px-3 w-32">Category</th>
                <th className="py-3 px-3 w-28">Outcome</th>
                <th className="py-3 px-4 w-32">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {events.map((ev) => {
                const ts = formatTimestamp(ev.occurred_at, workspace?.timezone || 'Asia/Kolkata');
                const sentence = buildReadableSentence(ev);
                const initials = (ev.actor_name || 'System')
                  .split(' ')
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr
                    key={ev.id}
                    onClick={() => handleRowClick(ev)}
                    className="hover:bg-primary-tint/30 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap text-text-secondary font-mono text-[11px]" title={ts.utc}>
                      {ts.local}
                    </td>

                    {/* Actor with Initials Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 border border-primary/20">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-text-primary truncate">
                            {ev.actor_name || 'System'}
                          </div>
                          <div className="text-[10px] text-text-muted truncate">
                            {ev.actor_role ? `${ev.actor_role} • ` : ''}{ev.actor_email || ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Action & Narrative */}
                    <td className="py-3 px-4">
                      <div className="text-text-primary font-medium leading-relaxed group-hover:text-primary transition-colors">
                        {sentence}
                      </div>
                      <div className="text-[11px] font-mono text-text-muted mt-1 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-surface-muted text-text-secondary text-[10px] border border-border">
                          {ev.action}
                        </span>
                        {ev.entity_type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-text-muted font-sans border border-border/80">
                            {ev.entity_type}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-muted text-text-secondary border border-border/80 uppercase tracking-wide">
                        {ev.category}
                      </span>
                    </td>

                    {/* Outcome */}
                    <td className="py-3 px-3">
                      {ev.outcome === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Success</span>
                        </span>
                      ) : ev.outcome === 'denied' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Denied</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-semibold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    {/* IP */}
                    <td className="py-3 px-4 text-text-secondary font-mono text-[11px] whitespace-nowrap">
                      {ev.ip_address || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-2.5 bg-surface border-t border-border flex items-center justify-between text-xs text-text-secondary shrink-0 select-none">
        <div className="flex items-center gap-4">
          <span>
            Showing <strong className="text-text-primary font-semibold">{events.length}</strong> of{' '}
            <strong className="text-text-primary font-semibold">{totalCount.toLocaleString()}</strong> records
          </span>
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Per page:</span>
            <div className="w-28">
              <Select
                aria-label="Records per page"
                size="sm"
                value={String(limitParam)}
                onChange={(val) => updateFilters({ limit: Number(val) })}
                options={[
                  { value: '20', label: '20 / page' },
                  { value: '50', label: '50 / page' },
                  { value: '100', label: '100 / page' },
                  { value: '200', label: '200 / page' }
                ]}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs text-text-secondary font-medium px-2.5 py-1 rounded-md bg-surface-muted border border-border">
            Page {cursorHistory.length + 1}
          </span>

          <div className="inline-flex items-center rounded-lg border border-border bg-surface shadow-2xs p-0.5">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={cursorHistory.length === 0 || loading}
              className="h-7 px-2.5 text-xs font-medium text-text-primary hover:bg-surface-muted disabled:opacity-35 disabled:hover:bg-transparent rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="w-px h-3.5 bg-border my-auto" />
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!nextCursor || loading}
              className="h-7 px-2.5 text-xs font-medium text-text-primary hover:bg-surface-muted disabled:opacity-35 disabled:hover:bg-transparent rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              title="Next page"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Forensic Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedEventId)}
        onClose={() => {
          setSelectedEventId(null);
          setSelectedEvent(null);
        }}
        title="Audit Event Forensics"
        size="lg"
      >
        {selectedEvent && (
          <div className="p-6 space-y-6 text-xs text-text-primary">
            {/* Action Banner */}
            <div className="p-4 rounded-xl bg-surface-muted/60 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary">{selectedEvent.action}</span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-surface border border-border">
                  {selectedEvent.category}
                </span>
              </div>
              <p className="text-sm font-semibold text-text-primary">
                {buildReadableSentence(selectedEvent)}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-bold text-text-muted uppercase">Event UID</span>
                <p className="font-mono text-[11px] text-text-secondary truncate" title={selectedEvent.event_uid}>
                  {selectedEvent.event_uid}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-text-muted uppercase">Timestamp (UTC)</span>
                <p className="font-mono text-[11px] text-text-secondary">
                  {selectedEvent.occurred_at}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-text-muted uppercase">Actor</span>
                <p className="font-semibold text-text-primary">
                  {selectedEvent.actor_name || 'System'} ({selectedEvent.actor_role || 'No Role'})
                </p>
                <p className="text-text-muted text-[11px]">{selectedEvent.actor_email || '—'}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-text-muted uppercase">Outcome & Severity</span>
                <p className="font-semibold capitalize text-text-primary">
                  {selectedEvent.outcome} • {selectedEvent.severity}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-text-muted uppercase">IP Address</span>
                <p className="font-mono text-text-secondary">{selectedEvent.ip_address || '—'}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-text-muted uppercase">Request ID</span>
                <p className="font-mono text-[11px] text-text-secondary truncate">{selectedEvent.request_id || '—'}</p>
              </div>

              <div className="col-span-2">
                <span className="text-[11px] font-bold text-text-muted uppercase">User Agent</span>
                <p className="font-mono text-[11px] text-text-secondary break-all">
                  {selectedEvent.user_agent || '—'}
                </p>
              </div>
            </div>

            {/* Changes Section (Before vs After) */}
            <div>
              <span className="text-[11px] font-bold text-text-muted uppercase mb-2 block">
                Recorded Changes (Before / After)
              </span>
              {selectedEvent.changes && Array.isArray(selectedEvent.changes) && selectedEvent.changes.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {selectedEvent.changes.map((ch, idx) => (
                    <div key={idx} className="p-3 bg-surface text-xs space-y-1.5">
                      <div className="font-bold font-mono text-primary text-[11px]">{ch.field}</div>
                      <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                        <div className="p-2 rounded bg-danger/10 border border-danger/20 text-danger break-words">
                          <span className="text-[10px] font-bold uppercase block text-danger/80">From:</span>
                          {typeof ch.from === 'object' ? JSON.stringify(ch.from) : String(ch.from ?? '—')}
                        </div>
                        <div className="p-2 rounded bg-success/10 border border-success/20 text-success break-words">
                          <span className="text-[10px] font-bold uppercase block text-success/80">To:</span>
                          {typeof ch.to === 'object' ? JSON.stringify(ch.to) : String(ch.to ?? '—')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-surface-muted text-text-muted text-center italic">
                  No property state mutations recorded.
                </div>
              )}
            </div>

            {/* Meta Section */}
            {selectedEvent.meta && Object.keys(selectedEvent.meta).length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-text-muted uppercase mb-2 block">
                  Event Metadata
                </span>
                <pre className="p-3 rounded-xl bg-surface-muted font-mono text-[11px] text-text-secondary overflow-x-auto max-h-48 border border-border">
                  {JSON.stringify(selectedEvent.meta, null, 2)}
                </pre>
              </div>
            )}

            {/* Cryptographic Chain Hashes */}
            <div className="p-4 rounded-xl bg-surface-muted/40 border border-border space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase block flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span>Cryptographic Proof</span>
              </span>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase block">Previous Row Hash:</span>
                <p className="font-mono text-[10.5px] text-text-secondary break-all">
                  {selectedEvent.prev_hash || '0'.repeat(64)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase block">Row Hash:</span>
                <p className="font-mono text-[10.5px] text-primary font-semibold break-all">
                  {selectedEvent.row_hash}
                </p>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
