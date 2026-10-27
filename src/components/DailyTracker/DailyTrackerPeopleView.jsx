// client/src/components/DailyTracker/DailyTrackerPeopleView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Link2,
  ExternalLink,
  Plus,
  Coffee,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  HelpCircle,
  Paperclip,
  CheckSquare,
  MessageSquare,
  Eye,
  ShieldAlert,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { getWorkspaceDailyTrackerPeople, createWorkspaceLeaveDay } from '../../api/workspaces';
import { reviewCheckin } from '../../api/cards';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { usePermissions } from '../../context/PermissionContext';
import { useAuth } from '../../hooks/useAuth';
import QuickCheckinModal from './QuickCheckinModal';

export default function DailyTrackerPeopleView({
  workspaceId,
  selectedDate,
  onCardClick
}) {
  const { hasPermission, userRole } = usePermissions();
  const { user } = useAuth();

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

  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [cutoffPassed, setCutoffPassed] = useState(false);
  const [filterState, setFilterState] = useState('all'); // 'all' | 'Blocked' | 'No update today' | 'Updated today' | 'No open tasks' | 'On leave'
  const [error, setError] = useState(null);
  const [expandedPersonId, setExpandedPersonId] = useState(null);
  const [ownerDetailsPersonId, setOwnerDetailsPersonId] = useState(null);

  // Leave modal state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveUserId, setLeaveUserId] = useState('');
  const [leaveReason, setLeaveReason] = useState('Annual Leave');
  const [savingLeave, setSavingLeave] = useState(false);

  // Review inline action state
  const [activeReviewCheckinId, setActiveReviewCheckinId] = useState(null);
  const [reviewAction, setReviewAction] = useState('seen'); // 'seen' | 'ask_proof'
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
      setCutoffPassed(Boolean(res.cutoff_passed));
    } catch (err) {
      setError(err?.message || 'Failed to load people tracker');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, selectedDate]);

  useEffect(() => {
    fetchPeopleData();
  }, [fetchPeopleData]);

  // Handle Owner Review: Seen or Ask for proof
  const handleReviewSubmit = async (checkinId) => {
    if (!checkinId || submittingReview) return;
    setSubmittingReview(true);
    try {
      await reviewCheckin(checkinId, {
        action: reviewAction,
        note: reviewNote.trim() || null
      });
      setActiveReviewCheckinId(null);
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

  // Exactly five states filter
  const filteredPeople = people.filter((p) => {
    if (filterState === 'all') return true;
    return p.state === filterState;
  });

  // State Counts for Pills
  const counts = {
    all: people.length,
    'Blocked': people.filter(p => p.state === 'Blocked').length,
    'No update today': people.filter(p => p.state === 'No update today').length,
    'Updated today': people.filter(p => p.state === 'Updated today').length,
    'No open tasks': people.filter(p => p.state === 'No open tasks').length,
    'On leave': people.filter(p => p.state === 'On leave').length
  };

  // Exact 5 states badge rendering
  // Requirement 9: green = updated, amber = no update today, red = blocked, grey = no tasks, purple = on leave
  const getStateBadge = (state) => {
    switch (state) {
      case 'Blocked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-danger-tint text-danger border border-danger/30">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
            Blocked
          </span>
        );
      case 'No update today':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            No update today
          </span>
        );
      case 'Updated today':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Updated today
          </span>
        );
      case 'On leave':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-500 border border-purple-500/30">
            <Coffee className="w-3.5 h-3.5" />
            On leave
          </span>
        );
      case 'No open tasks':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-text-muted border border-border">
            No open tasks
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app text-text-primary text-left">
      {/* Help bar with exact role wording per Requirement 9 */}
      <div className="px-4 sm:px-6 py-2.5 bg-surface border-b border-border/60 text-xs text-text-secondary flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong className="text-text-primary">Owner/Admin:</strong> Open the People tab: <span className="text-emerald-500 font-bold">green = updated</span>, <span className="text-amber-500 font-bold">amber = no update today</span>, <span className="text-danger font-bold">red = blocked</span>, <span className="text-text-muted font-bold">grey = no tasks</span>.
          </span>
        </div>
        {canManageLeave && (
          <button
            type="button"
            onClick={() => setLeaveModalOpen(true)}
            className="px-3 py-1 bg-surface-muted hover:bg-border text-xs font-bold rounded-lg border border-border transition-colors flex items-center gap-1.5 cursor-pointer text-text-primary shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span>Record Leave</span>
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="px-4 sm:px-6 py-3 bg-surface border-b border-border/60 shrink-0 flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex p-1 bg-app border border-border/80 rounded-xl shadow-2xs gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterState('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Members ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('Blocked')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterState === 'Blocked'
                ? 'bg-danger text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-danger" />
            Blocked ({counts['Blocked']})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('No update today')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterState === 'No update today'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            No update today ({counts['No update today']})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('Updated today')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterState === 'Updated today'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Updated today ({counts['Updated today']})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('No open tasks')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'No open tasks'
                ? 'bg-surface-muted text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            No open tasks ({counts['No open tasks']})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('On leave')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterState === 'On leave'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            On leave ({counts['On leave']})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-muted">
            <Spinner className="w-7 h-7 text-primary mb-3" />
            <p className="text-xs">Computing daily updates & team states...</p>
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
              const isExpanded = expandedPersonId === person.id;
              const isOwnerDetailsOpen = ownerDetailsPersonId === person.id;
              const isBlocked = person.state === 'Blocked';
              const checkins = person.evidence?.check_ins || [];
              const completedCards = person.evidence?.completed_cards || [];
              const visibleWarnings = person.visible_warnings || [];
              const internalFlags = person.internal_flags || [];
              const openCards = person.open_cards || [];
              const checkedItems = person.evidence?.checked_items || [];
              const files = person.evidence?.files || [];
              const comments = person.evidence?.comments || [];

              return (
                <div
                  key={person.id}
                  className={`bg-surface border rounded-2xl p-4 sm:p-5 transition-all shadow-2xs ${
                    isBlocked
                      ? 'border-danger/40 ring-1 ring-danger/20'
                      : person.state === 'No update today'
                      ? 'border-amber-500/30 ring-1 ring-amber-500/20'
                      : person.state === 'Updated today'
                      ? 'border-emerald-500/30'
                      : 'border-border/80'
                  }`}
                >
                  {/* Person Card Top Header (Click to expand/collapse) */}
                  <div
                    onClick={() => setExpandedPersonId(isExpanded ? null : person.id)}
                    className="flex items-center justify-between gap-4 pb-3 border-b border-border/60 flex-wrap cursor-pointer hover:opacity-95 transition-opacity"
                  >
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
                            {person.role || 'Member'}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-text-muted truncate block">
                          {person.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStateBadge(person.state)}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                  </div>

                  {/* Exactly Three Visible Warnings (Requirement 6) */}
                  {visibleWarnings.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {visibleWarnings.map((warn, wIdx) => (
                        <div
                          key={wIdx}
                          className="px-3 py-1.5 rounded-xl bg-danger-tint border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary row */}
                  <div className="pt-3 flex items-center justify-between text-xs text-text-secondary flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                      <span>
                        <strong className="text-text-primary">{person.open_cards_count || 0}</strong> open tasks
                      </span>
                      <span>
                        <strong className="text-text-primary">{checkins.length}</strong> updates today
                      </span>
                      {completedCards.length > 0 && (
                        <span>
                          <strong className="text-success">{completedCards.length}</strong> completed today
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPersonId(isExpanded ? null : person.id);
                      }}
                      className="text-primary hover:underline font-bold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide details' : "View today's updates & items"}</span>
                    </button>
                  </div>

                  {/* Expanded Person Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/60 space-y-4">
                      {/* 1. Assigned Tasks & Open Items */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            <span>Assigned Tasks & Open Items ({openCards.length})</span>
                          </h4>
                        </div>

                        {openCards.length === 0 ? (
                          <div className="p-3 bg-app/50 border border-dashed border-border rounded-xl text-center text-xs text-text-muted">
                            No open tasks currently assigned to this member.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {openCards.map((c) => {
                              const cardId = c.id || c.card_id;
                              const cardTitle = c.title || c.card_title || `Card #${cardId}`;
                              return (
                                <div
                                  key={cardId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCardClick?.({ id: cardId, card_id: cardId, title: cardTitle });
                                  }}
                                  className="p-3 bg-app hover:bg-surface-muted/60 border border-border/80 hover:border-primary/50 rounded-xl space-y-2 cursor-pointer transition-all shadow-2xs group"
                                  title="Click to view card details"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2">
                                      {cardTitle}
                                    </span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary shrink-0 transition-colors" />
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                    {c.needs_update && (
                                      <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Needs update
                                      </span>
                                    )}
                                    {c.due_date ? (
                                      <span className="px-2 py-0.5 rounded-full font-medium bg-surface text-text-secondary border border-border flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Due {c.due_date}
                                      </span>
                                    ) : (
                                      <span className="text-text-muted">No due date</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 2. That Day's Updates */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                          <span>Today's Updates ({checkins.length})</span>
                        </h4>

                        {checkins.length === 0 ? (
                          <div className="p-3 bg-app/50 border border-dashed border-border rounded-xl text-center text-xs text-text-muted">
                            No updates submitted today.
                          </div>
                        ) : (
                          checkins.map((ci) => (
                            <div key={ci.id} className="p-3.5 bg-app border border-border/80 rounded-xl space-y-3">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCardClick?.({ id: ci.card_id, card_id: ci.card_id, title: ci.card_title });
                                  }}
                                  className="text-xs font-bold text-text-primary hover:text-primary hover:underline text-left cursor-pointer flex items-center gap-1.5 group"
                                  title="View task details"
                                >
                                  <span>Task: {ci.card_title}</span>
                                  <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary shrink-0 transition-colors" />
                                </button>
                                <span className="text-xs font-bold text-primary">
                                  {ci.progress_pct ?? 0}% Progress
                                </span>
                              </div>

                              <div className="text-xs space-y-1">
                                <span className="font-semibold text-text-secondary block">What I did:</span>
                                <p className="bg-surface p-2.5 rounded-lg border border-border/60 text-text-primary leading-relaxed">
                                  {ci.did}
                                </p>
                              </div>

                              <div className="text-xs space-y-1">
                                <span className="font-semibold text-text-secondary block">Next step:</span>
                                <p className="bg-surface p-2.5 rounded-lg border border-border/60 text-text-primary leading-relaxed">
                                  {ci.next_step}
                                </p>
                              </div>

                              {ci.blocker && (
                                <div className="p-2.5 bg-danger-tint border border-danger/30 rounded-lg text-danger text-xs space-y-1">
                                  <span className="font-bold flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Blocked:</span>
                                  </span>
                                  <p className="leading-relaxed pl-5">{ci.blocker}</p>
                                </div>
                              )}

                              {ci.evidence_url && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="font-bold text-text-secondary">Link:</span>
                                  <a
                                    href={ci.evidence_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium truncate flex items-center gap-1"
                                  >
                                    <span>{ci.evidence_url}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}

                              {/* Owner Actions: Seen and Ask for proof (Requirement 5) */}
                              {canReview && (
                                <div className="pt-2 border-t border-border/60">
                                  {activeReviewCheckinId === ci.id ? (
                                    <div className="p-3 bg-surface rounded-xl border border-border space-y-2.5">
                                      <span className="text-xs font-bold text-text-primary block">
                                        Review Action: {reviewAction === 'seen' ? 'Mark as Seen' : 'Ask for proof'}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setReviewAction('seen')}
                                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                                            reviewAction === 'seen'
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-surface-muted text-text-secondary'
                                          }`}
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>Seen</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setReviewAction('ask_proof')}
                                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                                            reviewAction === 'ask_proof'
                                              ? 'bg-amber-600 text-white'
                                              : 'bg-surface-muted text-text-secondary'
                                          }`}
                                        >
                                          <HelpCircle className="w-3.5 h-3.5" />
                                          <span>Ask for proof</span>
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        value={reviewNote}
                                        onChange={(e) => setReviewNote(e.target.value)}
                                        placeholder={reviewAction === 'seen' ? 'Optional acknowledgment note...' : 'Explain what proof or link is required...'}
                                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-app border border-border outline-none focus:border-primary text-text-primary"
                                      />
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setActiveReviewCheckinId(null)}
                                          className="px-3 py-1 text-xs font-semibold rounded-lg text-text-muted hover:text-text-primary"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleReviewSubmit(ci.id)}
                                          disabled={submittingReview}
                                          className="px-4 py-1 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-hover shadow-xs cursor-pointer"
                                        >
                                          {submittingReview ? 'Submitting...' : 'Confirm'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveReviewCheckinId(ci.id);
                                          setReviewAction('seen');
                                        }}
                                        className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Seen</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveReviewCheckinId(ci.id);
                                          setReviewAction('ask_proof');
                                        }}
                                        className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        <span>Ask for proof</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* 3. Completed Items Today */}
                      {completedCards.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-success" />
                            <span>Completed Today ({completedCards.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {completedCards.map((cc) => {
                              const cardId = cc.id || cc.card_id;
                              const cardTitle = cc.title || cc.card_title || `Card #${cardId}`;
                              return (
                                <div
                                  key={cardId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCardClick?.({ id: cardId, card_id: cardId, title: cardTitle });
                                  }}
                                  className="p-2.5 bg-app hover:bg-surface-muted/60 border border-border/80 hover:border-success/40 rounded-xl space-y-1 cursor-pointer transition-all shadow-2xs group"
                                  title="Click to view card details"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-bold text-text-primary group-hover:text-success transition-colors line-clamp-1">
                                      {cardTitle}
                                    </span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-success shrink-0" />
                                  </div>
                                  {cc.completion_note && (
                                    <p className="text-[11px] text-text-secondary italic">
                                      Result: "{cc.completion_note}"
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. Work Evidence & Activity Today */}
                      {(checkedItems.length > 0 || files.length > 0 || comments.length > 0) && (
                        <div className="space-y-2 pt-2 border-t border-border/60">
                          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-primary" />
                            <span>Work Evidence & Activity</span>
                          </h4>
                          {checkedItems.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-text-muted">Checked checklist items:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {checkedItems.map((item, iIdx) => (
                                  <span key={iIdx} className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-text-primary flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3 h-3 text-success" />
                                    <span>{item}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {files.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-text-muted">Attached Files:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {files.map((file, fIdx) => (
                                  <a
                                    key={fIdx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-primary hover:underline flex items-center gap-1.5"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>{file.name}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {comments.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-text-muted">Comments Posted:</span>
                              <div className="space-y-1">
                                {comments.map((comm, cIdx) => (
                                  <p key={cIdx} className="p-2 rounded-lg bg-surface border border-border text-xs text-text-primary italic">
                                    "{comm}"
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5. Summary when member has no items and no updates */}
                      {openCards.length === 0 && checkins.length === 0 && completedCards.length === 0 && (
                        <div className="p-3.5 bg-app/60 border border-dashed border-border/80 rounded-xl text-center text-xs space-y-1">
                          <p className="font-semibold text-text-secondary">No updates or assigned tasks for this day</p>
                          <p className="text-[11px] text-text-muted">This member has no active assigned cards or submitted updates on {selectedDate}.</p>
                        </div>
                      )}

                      {/* 3. Owner "Details" Expander for internal computed flags (Requirement 6) */}
                      {canReview && internalFlags.length > 0 && (
                        <div className="pt-2 border-t border-border/60">
                          <button
                            type="button"
                            onClick={() => setOwnerDetailsPersonId(isOwnerDetailsOpen ? null : person.id)}
                            className="text-xs font-bold text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            <span>Owner Details & Internal Flags ({internalFlags.length})</span>
                            {isOwnerDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isOwnerDetailsOpen && (
                            <div className="mt-2 p-3 bg-app rounded-xl border border-border/80 space-y-1.5 text-xs text-text-secondary">
                              <span className="font-semibold block text-[11px] text-text-muted uppercase tracking-wider">
                                Computed Internal Flags:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {internalFlags.map((flag, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-mono text-text-primary"
                                  >
                                    {flag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
            <Select
              value={leaveUserId}
              onChange={(val) => setLeaveUserId(val)}
              placeholder="-- Choose member --"
              options={people.map((p) => ({
                value: String(p.id),
                label: `${p.name} (${p.role})`
              }))}
            />
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
              placeholder="e.g. Vacation, Sick Leave, Personal Leave"
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
