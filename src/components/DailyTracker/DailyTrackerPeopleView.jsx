// client/src/components/DailyTracker/DailyTrackerPeopleView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  Coffee,
  MinusCircle,
  Plus,
  Search,
  Download,
  X,
  MessageSquare,
  HelpCircle,
  Eye,
  Paperclip,
  ShieldAlert,
  Calendar,
  ArrowUpRight,
  Check
} from 'lucide-react';
import {
  getWorkspaceDailyTrackerPeople,
  getDailyTrackerPersonTimeline,
  exportDailyTrackerPeopleCsv,
  createWorkspaceLeaveDay,
  reviewDailyUpdate
} from '../../api/workspaces';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import Select from '../ui/Select';
import { Modal } from '../ui/Modal';
import { usePermissions } from '../../context/PermissionContext';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const FIXED_STATES = [
  {
    code: 'blocked',
    label: 'Blocked / Needs help',
    tooltip: 'Reported a blocker on one or more tasks and needs help.',
    badgeClass: 'bg-danger-tint text-danger border-danger/30',
    pillActive: 'bg-danger text-white shadow-xs',
    dotClass: 'bg-danger',
    Icon: AlertCircle
  },
  {
    code: 'not_updated',
    label: 'Not updated yet',
    tooltip: 'Has active tasks and has not submitted today’s update yet.',
    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    pillActive: 'bg-amber-500 text-white shadow-xs',
    dotClass: 'bg-amber-500',
    Icon: Clock
  },
  {
    code: 'on_track',
    label: 'On track',
    tooltip: 'Updated today or showed real work activity.',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
    pillActive: 'bg-emerald-600 text-white shadow-xs',
    dotClass: 'bg-emerald-500',
    Icon: CheckCircle2
  },
  {
    code: 'no_tasks',
    label: 'No tasks assigned',
    tooltip: 'No active tasks assigned in this workspace.',
    badgeClass: 'bg-surface-muted text-text-muted border-border',
    pillActive: 'bg-slate-600 text-white shadow-xs',
    dotClass: 'bg-slate-400',
    Icon: MinusCircle
  },
  {
    code: 'on_leave',
    label: 'On leave',
    tooltip: 'On approved leave for this day.',
    badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
    pillActive: 'bg-purple-600 text-white shadow-xs',
    dotClass: 'bg-purple-500',
    Icon: Coffee
  }
];

const STATE_BY_CODE = Object.fromEntries(FIXED_STATES.map((s) => [s.code, s]));

const SILENT_FLAG_LABELS = {
  same_note_as_yesterday: 'Same note as yesterday',
  identical_notes_across_cards: 'Identical notes across cards',
  marked_done_within_minutes: 'Marked done within minutes',
  edited_after_submit: 'Edited after submit'
};

function StateBadge({ code }) {
  const meta = STATE_BY_CODE[code] || STATE_BY_CODE.no_tasks;
  const Icon = meta.Icon;
  return (
    <span
      title={meta.tooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badgeClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{meta.label}</span>
    </span>
  );
}

export default function DailyTrackerPeopleView({
  workspaceId,
  workspaces = [],
  selectedDate,
  onCardClick
}) {
  const { hasPermission, userRole } = usePermissions();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleName = (typeof userRole === 'string' ? userRole : userRole?.name || user?.company_role || user?.role || '')?.toLowerCase();
  const userRank = Number(userRole?.rank || 0);
  const isOwnerOrManager =
    ['owner', 'super admin', 'admin', 'project manager'].includes(roleName) ||
    userRank >= 40 ||
    Boolean(user?.is_company_owner) ||
    user?.company_role === 'owner' ||
    user?.company_role === 'admin';

  const canReview = isOwnerOrManager || hasPermission('checkin.review');
  const canManageLeave = isOwnerOrManager || hasPermission('leave.approve') || hasPermission('workspace.edit');

  // URL-persisted filters & drawer state
  const filterState = searchParams.get('p_state') || 'all';
  const filterWsId = searchParams.get('p_ws') || String(workspaceId || '');
  const filterBoardId = searchParams.get('p_board') || 'all';
  const filterMemberId = searchParams.get('p_member') || 'all';
  const filterRole = searchParams.get('p_role') || 'all';
  const startDate = searchParams.get('p_start') || selectedDate;
  const endDate = searchParams.get('p_end') || selectedDate;
  const [searchInput, setSearchInput] = useState(searchParams.get('p_q') || '');
  const drawerUserId = searchParams.get('p_person') ? Number(searchParams.get('p_person')) : null;

  const setParam = useCallback((patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '' || v === 'all') {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [peopleData, setPeopleData] = useState({
    people: [],
    counts: { all: 0, blocked: 0, not_updated: 0, on_track: 0, no_tasks: 0, on_leave: 0 },
    filter_options: { boards: [], roles: [] },
    pending_requests: []
  });

  // Side drawer state
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineData, setTimelineData] = useState(null);
  const [reviewUpdateId, setReviewUpdateId] = useState(null);
  const [reviewAction, setReviewAction] = useState('ack');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Leave modal state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveUserId, setLeaveUserId] = useState('');
  const [leaveReason, setLeaveReason] = useState('Annual Leave');
  const [savingLeave, setSavingLeave] = useState(false);
  const [exporting, setExporting] = useState(false);

  const effectiveWsId = Number(filterWsId || workspaceId);

  const fetchPeople = useCallback(async () => {
    if (!effectiveWsId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkspaceDailyTrackerPeople(effectiveWsId, {
        date: selectedDate,
        start_date: startDate,
        end_date: endDate,
        board_id: filterBoardId,
        member_id: filterMemberId,
        role: filterRole,
        state: filterState,
        search: searchInput.trim() || undefined
      });
      setPeopleData(res);
    } catch (err) {
      setError(err?.message || 'Failed to load people tracker');
    } finally {
      setLoading(false);
    }
  }, [effectiveWsId, selectedDate, startDate, endDate, filterBoardId, filterMemberId, filterRole, filterState, searchInput]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const loadTimeline = useCallback(async (userId) => {
    if (!effectiveWsId || !userId) return;
    setTimelineLoading(true);
    try {
      const res = await getDailyTrackerPersonTimeline(effectiveWsId, userId, { date: selectedDate });
      setTimelineData(res);
    } catch (err) {
      toast.error(err?.message || 'Failed to load 7-day timeline');
    } finally {
      setTimelineLoading(false);
    }
  }, [effectiveWsId, selectedDate]);

  useEffect(() => {
    if (drawerUserId) {
      loadTimeline(drawerUserId);
    } else {
      setTimelineData(null);
    }
  }, [drawerUserId, loadTimeline]);

  const handleReviewSubmit = async (updateId) => {
    if (!updateId || submittingReview) return;
    setSubmittingReview(true);
    try {
      await reviewDailyUpdate(updateId, {
        action: reviewAction,
        note: reviewNote.trim() || null
      });
      toast.success('Review recorded');
      setReviewUpdateId(null);
      setReviewNote('');
      await fetchPeople();
      if (drawerUserId) await loadTimeline(drawerUserId);
    } catch (err) {
      toast.error(err?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleExportCsv = async () => {
    if (exporting || !effectiveWsId) return;
    setExporting(true);
    try {
      const csvText = await exportDailyTrackerPeopleCsv(effectiveWsId, {
        date: selectedDate,
        start_date: startDate,
        end_date: endDate,
        board_id: filterBoardId,
        member_id: filterMemberId,
        role: filterRole,
        state: filterState,
        search: searchInput.trim() || undefined
      });
      const blob = new Blob([typeof csvText === 'string' ? csvText : JSON.stringify(csvText)], {
        type: 'text/csv;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-tracker-people-${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err) {
      toast.error(err?.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveLeave = async (e) => {
    e.preventDefault();
    if (!leaveUserId || savingLeave) return;
    setSavingLeave(true);
    try {
      await createWorkspaceLeaveDay(effectiveWsId, {
        user_id: Number(leaveUserId),
        date: selectedDate,
        reason: leaveReason.trim()
      });
      toast.success('Leave recorded');
      setLeaveModalOpen(false);
      setLeaveUserId('');
      await fetchPeople();
    } catch (err) {
      toast.error(err?.message || 'Failed to record leave day');
    } finally {
      setSavingLeave(false);
    }
  };

  const people = peopleData.people || [];
  const counts = peopleData.counts || { all: 0, blocked: 0, not_updated: 0, on_track: 0, no_tasks: 0, on_leave: 0 };
  const selectedPerson = useMemo(
    () => people.find((p) => Number(p.id) === Number(drawerUserId)) || null,
    [people, drawerUserId]
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app text-text-primary text-left relative">
      {/* Legend + Actions */}
      <div className="px-4 sm:px-6 py-2.5 bg-surface border-b border-border/60 text-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap" aria-label="Status legend">
          <span className="font-bold text-text-primary">Legend:</span>
          {FIXED_STATES.map((st) => (
            <span
              key={st.code}
              title={st.tooltip}
              className="inline-flex items-center gap-1.5 text-text-secondary cursor-help"
            >
              <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
              <span>{st.label}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportCsv}
            className="px-3 py-1 bg-surface-muted hover:bg-border/70 text-xs font-bold rounded-lg border border-border transition-colors flex items-center gap-1.5 cursor-pointer text-text-primary disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          {canManageLeave && (
            <button
              type="button"
              onClick={() => setLeaveModalOpen(true)}
              className="px-3 py-1 bg-surface-muted hover:bg-border/70 text-xs font-bold rounded-lg border border-border transition-colors flex items-center gap-1.5 cursor-pointer text-text-primary"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>Record Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Summary Strip (clickable counts) + Filters */}
      <div className="px-4 sm:px-6 py-3 bg-surface border-b border-border/60 space-y-3 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setParam({ p_state: null })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterState === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-app border border-border/80 text-text-secondary hover:text-text-primary'
            }`}
          >
            All ({counts.all || 0})
          </button>
          {FIXED_STATES.map((st) => {
            const active = filterState === st.code;
            const Icon = st.Icon;
            return (
              <button
                key={st.code}
                type="button"
                title={st.tooltip}
                onClick={() => setParam({ p_state: active ? null : st.code })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? st.pillActive
                    : 'bg-app border border-border/80 text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{st.label} ({counts[st.code] || 0})</span>
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setParam({ p_q: e.target.value.trim() || null });
              }}
              placeholder="Search member name..."
              aria-label="Search member name"
              className="w-full pl-8 pr-3 py-1.5 bg-app border border-border/80 rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-primary"
            />
          </div>

          {workspaces.length > 1 && (
            <div className="min-w-[140px]">
              <Select
                aria-label="Filter by workspace"
                size="sm"
                value={String(effectiveWsId)}
                onChange={(val) => setParam({ p_ws: val, p_board: null })}
                options={workspaces.map((w) => ({ value: String(w.id), label: w.name }))}
              />
            </div>
          )}

          <div className="min-w-[130px]">
            <Select
              aria-label="Filter by board"
              size="sm"
              value={filterBoardId}
              onChange={(val) => setParam({ p_board: val })}
              options={[
                { value: 'all', label: 'All Boards' },
                ...(peopleData.filter_options?.boards || []).map((b) => ({ value: String(b.id), label: b.name }))
              ]}
            />
          </div>

          <div className="min-w-[130px]">
            <Select
              aria-label="Filter by role"
              size="sm"
              value={filterRole}
              onChange={(val) => setParam({ p_role: val })}
              options={[
                { value: 'all', label: 'All Roles' },
                ...(peopleData.filter_options?.roles || []).map((r) => ({ value: r, label: r }))
              ]}
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <input
              type="date"
              aria-label="Summary start date"
              value={startDate}
              onChange={(e) => setParam({ p_start: e.target.value || null })}
              className="px-2 py-1 rounded-lg bg-app border border-border/80 text-xs text-text-primary outline-none focus:border-primary"
            />
            <span>to</span>
            <input
              type="date"
              aria-label="Summary end date"
              value={endDate}
              onChange={(e) => setParam({ p_end: e.target.value || null })}
              className="px-2 py-1 rounded-lg bg-app border border-border/80 text-xs text-text-primary outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* People List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Spinner className="w-7 h-7 text-primary mb-3" />
            <p className="text-xs">Loading team status...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-danger-tint border border-danger/30 text-danger text-xs text-center max-w-md mx-auto">
            {error}
          </div>
        ) : people.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-border/60 rounded-2xl p-8 max-w-md mx-auto">
            <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary mb-1">No Members Match Filters</h3>
            <p className="text-xs text-text-secondary">Try clearing one of the active filters above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-5xl mx-auto">
            {people.map((person) => {
              const items = person.daily_update?.items || [];
              const blockedItems = items.filter((it) => it.status === 'blocked');
              const silentFlags = person.silent_flags || [];
              const wsSummary = person.weekly_summary || { days_updated: 0, days_blocked: 0, days_on_leave: 0, working_days: 7 };

              return (
                <div
                  key={person.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setParam({ p_person: person.id })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setParam({ p_person: person.id });
                    }
                  }}
                  className={`bg-surface border rounded-2xl p-4 transition-all shadow-2xs cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    person.state === 'blocked'
                      ? 'border-danger/40'
                      : person.state === 'not_updated'
                      ? 'border-amber-500/30'
                      : 'border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={person.avatar_url} name={person.name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-text-primary truncate">{person.name}</h3>
                          <Badge variant="subtle" size="sm">{person.role || 'Member'}</Badge>
                        </div>
                        <div className="text-[11px] text-text-muted flex items-center gap-3 flex-wrap mt-0.5">
                          <span>{person.open_cards_count} active task{person.open_cards_count === 1 ? '' : 's'}</span>
                          <span>7-day: {wsSummary.days_updated} updated / {wsSummary.days_blocked} blocked / {wsSummary.days_on_leave} leave</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {silentFlags.length > 0 && (
                        <span
                          title={silentFlags.map((f) => SILENT_FLAG_LABELS[f] || f).join(', ')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/30"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>{SILENT_FLAG_LABELS[silentFlags[0]] || silentFlags[0]}</span>
                        </span>
                      )}
                      <StateBadge code={person.state} />
                    </div>
                  </div>

                  {/* Quick inline preview of blocker or summary */}
                  {blockedItems.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-danger-tint/50 border border-danger/30 text-xs text-danger space-y-1">
                      {blockedItems.map((bi) => (
                        <div key={bi.id} className="flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span><strong>{bi.card_title}:</strong> {bi.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {person.daily_update?.summary_note && blockedItems.length === 0 && (
                    <p className="mt-2 text-xs text-text-secondary line-clamp-1">
                      &ldquo;{person.daily_update.summary_note}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7-Working-Day Side Drawer */}
      {drawerUserId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-text-primary/30 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-surface h-full border-l border-border shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-label="Member 7-day timeline"
          >
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  src={timelineData?.member?.avatar_url || selectedPerson?.avatar_url}
                  name={timelineData?.member?.name || selectedPerson?.name || 'Member'}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text-primary truncate">
                    {timelineData?.member?.name || selectedPerson?.name || 'Loading...'}
                  </h3>
                  <span className="text-xs text-text-muted">
                    {timelineData?.member?.role_name || selectedPerson?.role || ''} &bull; Last 7 working days
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setParam({ p_person: null })}
                aria-label="Close drawer"
                className="p-1.5 rounded-lg hover:bg-surface-muted text-text-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {selectedPerson && (
                <div className="p-3 bg-app border border-border/80 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <StateBadge code={selectedPerson.state} />
                  <div className="text-xs text-text-secondary">
                    7-day: <strong>{selectedPerson.weekly_summary?.days_updated || 0}</strong> updated &bull;{' '}
                    <strong>{selectedPerson.weekly_summary?.days_blocked || 0}</strong> blocked &bull;{' '}
                    <strong>{selectedPerson.weekly_summary?.days_on_leave || 0}</strong> leave
                  </div>
                </div>
              )}

              {timelineLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-text-muted">
                  <Spinner size="sm" />
                  <span>Loading 7-day timeline...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {(timelineData?.days || []).map((day) => {
                    const du = day.daily_update;
                    return (
                      <div key={day.date} className="p-3.5 bg-app border border-border/80 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold text-text-primary">{day.date}</span>
                          <StateBadge code={day.state} />
                        </div>

                        {day.leave_reason && (
                          <p className="text-xs text-purple-700">Leave: {day.leave_reason}</p>
                        )}

                        {du ? (
                          <div className="space-y-2 text-xs">
                            {du.edited_at && (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 text-[10px] font-semibold">
                                Edited after submit
                              </span>
                            )}
                            {du.summary_note && (
                              <p className="p-2 rounded-lg bg-surface border border-border/60 text-text-primary">
                                {du.summary_note}
                              </p>
                            )}
                            {(du.items || []).map((it) => (
                              <div key={it.id} className="p-2 rounded-lg bg-surface border border-border/60 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onCardClick?.({ id: it.card_id, card_id: it.card_id, title: it.card_title })}
                                    className="font-bold text-text-primary hover:text-primary flex items-center gap-1 cursor-pointer text-left"
                                  >
                                    <span>{it.card_title}</span>
                                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                                  </button>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    it.status === 'blocked'
                                      ? 'bg-danger-tint text-danger'
                                      : it.status === 'done_today'
                                      ? 'bg-emerald-500/10 text-emerald-700'
                                      : 'bg-primary/10 text-primary'
                                  }`}>
                                    {it.status === 'done_today' ? 'Done today' : it.status === 'blocked' ? 'Blocked' : 'Working'}
                                  </span>
                                </div>
                                {it.note && <p className="text-text-secondary">{it.note}</p>}
                              </div>
                            ))}

                            {/* Existing reviews */}
                            {(du.reviews || []).map((rev) => (
                              <div key={rev.id} className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-[11px] space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-text-primary">{rev.reviewer_name} ({rev.action})</span>
                                  {rev.answered_at && (
                                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Answered
                                    </span>
                                  )}
                                </div>
                                {rev.note && <p className="text-text-secondary">{rev.note}</p>}
                                {rev.answer_note && <p className="text-text-primary font-medium">Reply: {rev.answer_note}</p>}
                              </div>
                            ))}

                            {/* Reviewer actions */}
                            {canReview && (
                              <div className="pt-1">
                                {reviewUpdateId === du.id ? (
                                  <div className="p-2.5 bg-surface rounded-lg border border-border space-y-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {[
                                        { id: 'ack', label: 'Acknowledge', Icon: Eye },
                                        { id: 'question', label: 'Ask question', Icon: MessageSquare },
                                        { id: 'request_evidence', label: 'Request evidence', Icon: HelpCircle }
                                      ].map((opt) => (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => setReviewAction(opt.id)}
                                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                            reviewAction === opt.id ? 'bg-primary text-white' : 'bg-surface-muted text-text-secondary'
                                          }`}
                                        >
                                          <opt.Icon className="w-3 h-3" />
                                          <span>{opt.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                    <input
                                      type="text"
                                      value={reviewNote}
                                      onChange={(e) => setReviewNote(e.target.value)}
                                      placeholder="Optional note or question..."
                                      maxLength={500}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-app border border-border text-xs text-text-primary outline-none focus:border-primary"
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setReviewUpdateId(null)}
                                        className="px-2.5 py-1 text-xs text-text-muted cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={submittingReview}
                                        onClick={() => handleReviewSubmit(du.id)}
                                        className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                      >
                                        {submittingReview ? 'Saving...' : 'Send'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => { setReviewUpdateId(du.id); setReviewAction('ack'); }}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 text-[11px] font-bold cursor-pointer"
                                    >
                                      Acknowledge
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setReviewUpdateId(du.id); setReviewAction('question'); }}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/30 text-[11px] font-bold cursor-pointer"
                                    >
                                      Ask question
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setReviewUpdateId(du.id); setReviewAction('request_evidence'); }}
                                      className="px-2.5 py-1 rounded-lg bg-surface border border-border text-text-secondary text-[11px] font-bold cursor-pointer"
                                    >
                                      Request evidence
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-text-muted">No daily update submitted.</p>
                        )}

                        {(day.activities || []).length > 0 && (
                          <div className="pt-1 border-t border-border/50 text-[11px] text-text-secondary space-y-0.5">
                            <span className="font-semibold text-text-muted">Work signals:</span>
                            {day.activities.slice(0, 4).map((act, idx) => (
                              <div key={idx} className="truncate">
                                &bull; {act.action_type.replace(/_/g, ' ')}{act.card_title ? ` — ${act.card_title}` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Leave Modal */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Record Leave Day"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveLeave} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary">
              Select Team Member <span className="text-danger">*</span>
            </label>
            <Select
              value={leaveUserId}
              onChange={(val) => setLeaveUserId(val)}
              placeholder="-- Choose member --"
              options={people.map((p) => ({ value: String(p.id), label: `${p.name} (${p.role})` }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary">Date</label>
            <input
              type="text"
              readOnly
              value={selectedDate}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-muted border border-border text-text-muted outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary">Reason / Category</label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="e.g. Vacation, Sick Leave, Personal Leave"
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border text-text-primary outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setLeaveModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!leaveUserId || savingLeave}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingLeave ? 'Saving...' : 'Record Leave'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
