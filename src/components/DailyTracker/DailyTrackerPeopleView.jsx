// client/src/components/DailyTracker/DailyTrackerPeopleView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  Brain,
  MessageSquare,
  HelpCircle,
  FileCheck,
  Calendar,
  Send,
  Link2,
  ExternalLink,
  Plus,
  Coffee,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getWorkspaceDailyTrackerPeople, createWorkspaceLeaveDay } from '../../api/workspaces';
import { reviewCheckin, answerCheckinReview } from '../../api/cards';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { usePermissions } from '../../context/PermissionContext';
import QuickCheckinModal from './QuickCheckinModal';

export default function DailyTrackerPeopleView({
  workspaceId,
  selectedDate,
  onCardClick
}) {
  const { hasPermission } = usePermissions();
  const canReview = hasPermission('checkin.review');
  const canManageLeave = hasPermission('workspace.edit') || hasPermission('company.manage_security');

  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filterState, setFilterState] = useState('all'); // 'all' | 'attention' | 'done' | 'idle' | 'leave'
  const [error, setError] = useState(null);

  // Leave modal state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveUserId, setLeaveUserId] = useState('');
  const [leaveReason, setLeaveReason] = useState('Annual Leave');
  const [savingLeave, setSavingLeave] = useState(false);

  // Review inline action state
  const [activeReviewCardId, setActiveReviewCardId] = useState(null);
  const [reviewAction, setReviewAction] = useState('ack');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Quick check-in modal
  const [checkinModalCard, setCheckinModalCard] = useState(null);

  const fetchPeopleData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkspaceDailyTrackerPeople(workspaceId, { date: selectedDate });
      setPeople(res.people || []);
      setSummary(res.summary || null);
    } catch (err) {
      setError(err?.message || 'Failed to load people tracker');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, selectedDate]);

  useEffect(() => {
    fetchPeopleData();
  }, [fetchPeopleData]);

  // Handle Owner Review
  const handleReviewSubmit = async (checkinId) => {
    if (!checkinId || submittingReview) return;
    setSubmittingReview(true);
    try {
      await reviewCheckin(checkinId, {
        action: reviewAction,
        note: reviewNote.trim() || null
      });
      setActiveReviewCardId(null);
      setReviewNote('');
      await fetchPeopleData();
    } catch (err) {
      alert(err?.message || 'Review failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle Log Leave
  const handleSaveLeave = async (e) => {
    e.preventDefault();
    if (!leaveUserId || savingLeave) return;
    setSavingLeave(true);
    try {
      await createWorkspaceLeaveDay(workspaceId, {
        user_id: Number(leaveUserId),
        date: selectedDate,
        reason: leaveReason.trim()
      });
      setLeaveModalOpen(false);
      setLeaveUserId('');
      await fetchPeopleData();
    } catch (err) {
      alert(err?.message || 'Failed to record leave day');
    } finally {
      setSavingLeave(false);
    }
  };

  // Filtered members list
  const filteredPeople = people.filter((p) => {
    if (filterState === 'all') return true;
    if (filterState === 'attention') {
      return ['Blocked', 'Focused-check-in-missing', 'Needs review'].includes(p.state);
    }
    if (filterState === 'done') {
      return p.state === 'Focused-check-in-done';
    }
    if (filterState === 'idle') {
      return p.state === 'Idle';
    }
    if (filterState === 'leave') {
      return p.state === 'On leave';
    }
    return true;
  });

  const getStateBadge = (state) => {
    switch (state) {
      case 'Blocked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-danger-tint text-danger border border-danger/30">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
            Blocked
          </span>
        );
      case 'Focused-check-in-missing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Check-in Missing
          </span>
        );
      case 'Needs review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
            Needs Review
          </span>
        );
      case 'Focused-check-in-done':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Check-in Done
          </span>
        );
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/30">
            <Sparkles className="w-3.5 h-3.5" />
            Active
          </span>
        );
      case 'On leave':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-500 border border-purple-500/30">
            <Coffee className="w-3.5 h-3.5" />
            On Leave
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-text-muted border border-border">
            Idle
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app text-text-primary text-left">
      {/* People Stats Bar */}
      <div className="px-4 sm:px-6 py-3.5 bg-surface border-b border-border/60 shrink-0 flex items-center justify-between gap-4 flex-wrap">
        {/* Quick Filter Pills */}
        <div className="inline-flex p-1 bg-app border border-border/80 rounded-xl shadow-2xs gap-1">
          <button
            type="button"
            onClick={() => setFilterState('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Members ({summary?.total_members || people.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('attention')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterState === 'attention'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Attention Needed ({(summary?.blocked || 0) + (summary?.focused_checkin_missing || 0) + (summary?.needs_review || 0)})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('done')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'done'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Check-in Done ({summary?.focused_checkin_done || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('idle')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'idle'
                ? 'bg-surface-muted text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Idle ({summary?.idle || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('leave')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'leave'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            On Leave ({summary?.on_leave || 0})
          </button>
        </div>

        {/* Action Button: Log Leave */}
        {canManageLeave && (
          <button
            type="button"
            onClick={() => setLeaveModalOpen(true)}
            className="px-3 py-1.5 bg-surface border border-border/80 hover:bg-surface-muted text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer text-text-primary"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span>Record Leave Day</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted">
            <Spinner className="w-7 h-7 text-primary mb-3" />
            <p className="text-xs">Computing daily focus & check-in states...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-danger-tint border border-danger/30 text-danger text-xs text-center">
            {error}
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="text-center py-20 bg-surface border border-border/60 rounded-2xl p-8">
            <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary mb-1">No Members In This Category</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              No team members match the "{filterState}" filter for {selectedDate}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto">
            {filteredPeople.map((person) => {
              const latestCheckin = person.checkins?.[0] || null;
              const hasCheckin = Boolean(latestCheckin);
              const isBlocked = person.state === 'Blocked';

              return (
                <div
                  key={person.id}
                  className={`bg-surface border rounded-2xl p-4 sm:p-5 transition-all shadow-2xs ${
                    isBlocked
                      ? 'border-danger/40 ring-1 ring-danger/20'
                      : person.state === 'Focused-check-in-missing'
                      ? 'border-amber-500/30'
                      : 'border-border/80'
                  }`}
                >
                  {/* Member Top Bar */}
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/60 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={person.avatar_url}
                        name={person.name}
                        size="md"
                        className="ring-2 ring-border/50"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-text-primary truncate">
                            {person.name}
                          </h3>
                          <Badge variant="subtle" size="sm">
                            {person.role_name || 'Member'}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-text-muted truncate block">
                          {person.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStateBadge(person.state)}
                    </div>
                  </div>

                  {/* Focus Tasks Section */}
                  <div className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        Active Focus Tasks ({person.focus_cards?.length || 0}/2)
                      </span>
                    </div>

                    {person.focus_cards && person.focus_cards.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {person.focus_cards.map((fc) => (
                          <div
                            key={fc.id}
                            className="p-3 rounded-xl bg-app border border-border/80 hover:border-primary/40 transition-colors flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                onClick={() => onCardClick && onCardClick({ id: fc.id })}
                                className="text-xs font-bold text-text-primary hover:text-primary transition-colors cursor-pointer line-clamp-2"
                              >
                                {fc.title}
                              </h4>
                              {fc.deep_work ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0">
                                  <Brain className="w-3 h-3" />
                                  <span>Deep Work</span>
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-between pt-1 text-[11px] text-text-muted">
                              <span>Estimated: {fc.duration_hours || 4}h</span>
                              <button
                                type="button"
                                onClick={() => setCheckinModalCard(fc)}
                                className="px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Check-in
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-app/50 border border-dashed border-border rounded-xl text-center text-xs text-text-muted">
                        No active focus card selected for today.
                      </div>
                    )}
                  </div>

                  {/* Latest Check-in Breakdown */}
                  {hasCheckin ? (
                    <div className="mt-2 pt-3 border-t border-border/60 bg-app/60 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Today's Check-in Summary</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary">
                            {latestCheckin.progress_percent}% Complete
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, latestCheckin.progress_percent))}%` }}
                        />
                      </div>

                      {/* Accomplished ("Did") */}
                      <div className="text-xs space-y-1">
                        <span className="font-bold text-text-secondary block">Accomplished:</span>
                        <p className="text-text-primary leading-relaxed bg-surface p-2.5 rounded-lg border border-border/60">
                          {latestCheckin.did}
                        </p>
                      </div>

                      {/* Next step */}
                      <div className="text-xs space-y-1">
                        <span className="font-bold text-text-secondary block">Next Step:</span>
                        <p className="text-text-primary leading-relaxed bg-surface p-2.5 rounded-lg border border-border/60">
                          {latestCheckin.next_step}
                        </p>
                      </div>

                      {/* Blockers Callout */}
                      {latestCheckin.blockers ? (
                        <div className="p-2.5 rounded-lg bg-danger-tint border border-danger/30 text-danger text-xs space-y-1">
                          <span className="font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Reported Blocker:</span>
                          </span>
                          <p className="leading-relaxed pl-5">{latestCheckin.blockers}</p>
                        </div>
                      ) : null}

                      {/* Attached Evidence Link */}
                      {latestCheckin.evidence_url ? (
                        <div className="flex items-center gap-2 text-xs">
                          <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-bold text-text-secondary">Evidence:</span>
                          <a
                            href={latestCheckin.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium truncate flex items-center gap-1"
                          >
                            <span>{latestCheckin.evidence_url}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : null}

                      {/* Review Section */}
                      {canReview && (
                        <div className="pt-2 border-t border-border/60 space-y-2">
                          {activeReviewCardId === latestCheckin.id ? (
                            <div className="p-3 bg-surface rounded-xl border border-border space-y-2.5">
                              <span className="text-xs font-bold text-text-primary block">
                                Review Check-in Action
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setReviewAction('ack')}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                    reviewAction === 'ack'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-surface-muted text-text-secondary'
                                  }`}
                                >
                                  Acknowledge
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewAction('question')}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                    reviewAction === 'question'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-surface-muted text-text-secondary'
                                  }`}
                                >
                                  Ask Question
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewAction('request_evidence')}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                    reviewAction === 'request_evidence'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-surface-muted text-text-secondary'
                                  }`}
                                >
                                  Request Evidence
                                </button>
                              </div>
                              <input
                                type="text"
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                placeholder="Add note or instruction for the member..."
                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-app border border-border outline-none focus:border-primary text-text-primary"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveReviewCardId(null)}
                                  className="px-3 py-1 text-xs font-semibold rounded-lg text-text-muted hover:text-text-primary"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewSubmit(latestCheckin.id)}
                                  disabled={submittingReview}
                                  className="px-4 py-1 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-hover shadow-xs"
                                >
                                  {submittingReview ? 'Submitting...' : 'Submit Action'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-text-muted">
                                {person.reviews?.length || 0} manager reviews recorded
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReviewCardId(latestCheckin.id);
                                  setReviewAction('ack');
                                }}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-surface border border-border/80 hover:bg-surface-muted text-text-primary transition-colors cursor-pointer"
                              >
                                Review / Feedback
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
            <select
              value={leaveUserId}
              onChange={(e) => setLeaveUserId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border text-text-primary outline-none focus:border-primary"
            >
              <option value="">-- Choose member --</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role_name})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary">
              Date
            </label>
            <input
              type="text"
              readOnly
              value={selectedDate}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-muted border border-border text-text-muted outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary">
              Reason / Category
            </label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="e.g. Vacation, Sick Leave, Family Emergency"
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border text-text-primary outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setLeaveModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!leaveUserId || savingLeave}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-xs cursor-pointer"
            >
              {savingLeave ? 'Saving...' : 'Record Leave'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Checkin Modal */}
      {checkinModalCard && (
        <QuickCheckinModal
          isOpen={Boolean(checkinModalCard)}
          onClose={() => setCheckinModalCard(null)}
          card={checkinModalCard}
          onSuccess={fetchPeopleData}
        />
      )}
    </div>
  );
}
