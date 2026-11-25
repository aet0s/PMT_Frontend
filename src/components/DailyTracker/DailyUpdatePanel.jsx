// client/src/components/DailyTracker/DailyUpdatePanel.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Coffee,
  BellOff,
  Calendar,
  Send,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Check
} from 'lucide-react';
import {
  getTodayDailyUpdate,
  submitDailyUpdate,
  editDailyUpdate,
  snoozeDailyTracker,
  markOnLeaveToday,
  answerDailyUpdateReview
} from '../../api/workspaces';
import Spinner from '../ui/Spinner';
import Select from '../ui/Select';
import toast from 'react-hot-toast';

const STATUS_CHIPS = [
  {
    value: 'working',
    label: 'Working on it',
    activeClass: 'bg-primary text-white border-primary shadow-xs',
    idleClass: 'bg-surface text-text-secondary border-border hover:border-primary/40 hover:text-text-primary'
  },
  {
    value: 'done_today',
    label: 'Done today',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
    idleClass: 'bg-surface text-text-secondary border-border hover:border-emerald-500/40 hover:text-emerald-700'
  },
  {
    value: 'blocked',
    label: 'Blocked',
    activeClass: 'bg-danger text-white border-danger shadow-xs',
    idleClass: 'bg-surface text-text-secondary border-border hover:border-danger/40 hover:text-danger'
  }
];

const NOTE_PLACEHOLDERS = [
  'e.g. Finished API wiring, testing edge cases',
  'e.g. Waiting on design sign-off for header',
  'e.g. Reviewing PRs and fixing layout bug'
];

export default function DailyUpdatePanel({
  workspaceId: initialWorkspaceId,
  workspaces = [],
  highlightCardId = null,
  onSuccess,
  compact = false
}) {
  const [selectedWsId, setSelectedWsId] = useState(initialWorkspaceId ? String(initialWorkspaceId) : '');
  useEffect(() => {
    if (initialWorkspaceId) setSelectedWsId(String(initialWorkspaceId));
  }, [initialWorkspaceId]);

  const effectiveWsId = Number(selectedWsId || initialWorkspaceId || workspaces[0]?.id || 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [itemsByCard, setItemsByCard] = useState({});
  const [summaryNote, setSummaryNote] = useState('');
  const [showAllCards, setShowAllCards] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingId, setReplyingId] = useState(null);

  const loadData = useCallback(async () => {
    if (!effectiveWsId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getTodayDailyUpdate(effectiveWsId);
      setData(res);

      const nextMap = {};
      const existingItems = res.today_update?.items || [];
      (res.cards || []).forEach((c) => {
        const match = existingItems.find((it) => Number(it.card_id) === Number(c.id));
        nextMap[c.id] = {
          card_id: c.id,
          status: match?.status || 'working',
          note: match?.note || '',
          is_long_task: match ? Boolean(match.is_long_task) : Boolean(c.is_long_task),
          expected_finish_date: match?.expected_finish_date
            ? String(match.expected_finish_date).slice(0, 10)
            : (c.expected_finish_date || '')
        };
      });
      setItemsByCard(nextMap);
      setSummaryNote(res.today_update?.summary_note || '');
    } catch (err) {
      setError(err?.message || 'Failed to load today’s daily update');
    } finally {
      setLoading(false);
    }
  }, [effectiveWsId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const orderedCards = useMemo(() => {
    const list = data?.cards || [];
    if (!highlightCardId) return list;
    const target = list.find((c) => Number(c.id) === Number(highlightCardId));
    if (!target) return list;
    return [target, ...list.filter((c) => Number(c.id) !== Number(highlightCardId))];
  }, [data?.cards, highlightCardId]);

  const visibleCards = showAllCards ? orderedCards : orderedCards.slice(0, 5);
  const hiddenCount = Math.max(0, orderedCards.length - 5);

  const updateCardItem = (cardId, patch) => {
    setItemsByCard((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || { card_id: cardId, status: 'working', note: '', is_long_task: false, expected_finish_date: '' }),
        ...patch
      }
    }));
  };

  const handleSameAsYesterday = () => {
    const yItems = data?.yesterday_update?.items || [];
    if (yItems.length === 0 && !data?.yesterday_update?.summary_note) {
      toast('No update from yesterday to copy.');
      return;
    }
    setItemsByCard((prev) => {
      const next = { ...prev };
      orderedCards.forEach((c) => {
        const yMatch = yItems.find((yi) => Number(yi.card_id) === Number(c.id));
        if (yMatch) {
          next[c.id] = {
            ...(next[c.id] || { card_id: c.id }),
            status: yMatch.status || 'working',
            note: yMatch.note || '',
            is_long_task: Boolean(yMatch.is_long_task),
            expected_finish_date: yMatch.expected_finish_date ? String(yMatch.expected_finish_date).slice(0, 10) : ''
          };
        }
      });
      return next;
    });
    if (data?.yesterday_update?.summary_note) {
      setSummaryNote(data.yesterday_update.summary_note);
    }
    toast.success('Copied yesterday’s statuses and notes');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !effectiveWsId) return;

    const items = orderedCards.map((c) => {
      const cur = itemsByCard[c.id] || { card_id: c.id, status: 'working', note: '', is_long_task: false, expected_finish_date: '' };
      return {
        card_id: c.id,
        status: cur.status || 'working',
        note: (cur.note || '').trim() || null,
        is_long_task: Boolean(cur.is_long_task),
        expected_finish_date: cur.is_long_task && cur.expected_finish_date ? cur.expected_finish_date : null
      };
    });

    const missingBlockerNote = items.find((it) => it.status === 'blocked' && !it.note);
    if (missingBlockerNote) {
      const cardTitle = orderedCards.find((c) => Number(c.id) === Number(missingBlockerNote.card_id))?.title || 'Blocked task';
      toast.error(`Please add a short note explaining what is blocking "${cardTitle}".`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items,
        summary_note: summaryNote.trim() || null,
        ...(data?.today_update?.version ? { expected_version: data.today_update.version } : {})
      };

      if (data?.today_update?.id) {
        await editDailyUpdate(effectiveWsId, data.today_update.id, payload);
        toast.success('Daily update updated');
      } else {
        await submitDailyUpdate(effectiveWsId, payload);
        toast.success('Daily update submitted');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('daily-tracker-updated'));
      }
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.message || 'Could not save daily update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnooze = async () => {
    if (actionBusy || !effectiveWsId) return;
    setActionBusy(true);
    try {
      await snoozeDailyTracker(effectiveWsId);
      toast.success('Reminder snoozed until tomorrow');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('daily-tracker-updated'));
      }
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Failed to snooze reminder');
    } finally {
      setActionBusy(false);
    }
  };

  const handleLeaveToday = async () => {
    if (actionBusy || !effectiveWsId) return;
    setActionBusy(true);
    try {
      await markOnLeaveToday(effectiveWsId, 'On leave today');
      toast.success('Marked as on leave today');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('daily-tracker-updated'));
      }
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.message || 'Failed to mark leave');
    } finally {
      setActionBusy(false);
    }
  };

  const handleAnswerReview = async (reviewId) => {
    const answerText = (replyDrafts[reviewId] || '').trim();
    if (!answerText || replyingId) return;
    setReplyingId(reviewId);
    try {
      await answerDailyUpdateReview(reviewId, { answer_note: answerText });
      toast.success('Reply sent');
      setReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Failed to send reply');
    } finally {
      setReplyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-surface border border-border/80 rounded-2xl flex items-center justify-center gap-3 text-xs text-text-secondary">
        <Spinner size="sm" />
        <span>Loading your daily update...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-tint border border-danger/30 rounded-2xl text-xs text-danger flex items-center justify-between gap-3">
        <span>{error}</span>
        <button type="button" onClick={loadData} className="px-3 py-1 rounded-lg bg-surface border border-border text-text-primary font-semibold cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  const isEditing = Boolean(data?.today_update);
  const pendingReviews = data?.pending_reviews || [];

  return (
    <div className={`bg-surface border border-border/80 rounded-2xl shadow-2xs text-left ${compact ? 'p-4' : 'p-4 sm:p-5'} space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Today&apos;s Daily Update</span>
            </h3>
            {isEditing && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Submitted (editable until end of day)
              </span>
            )}
            {data?.on_leave_today && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/30">
                <Coffee className="w-3 h-3" />
                On leave today
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Once a day, tell us how your work is going. Tap one status, optionally add a note. That&apos;s it.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {workspaces.length > 1 && (
            <div className="min-w-[150px]">
              <Select
                aria-label="Workspace for daily update"
                size="sm"
                value={String(effectiveWsId)}
                onChange={(val) => setSelectedWsId(String(val))}
                options={workspaces.map((w) => ({ value: String(w.id), label: w.name }))}
              />
            </div>
          )}

          {data?.yesterday_update && (
            <button
              type="button"
              onClick={handleSameAsYesterday}
              className="px-3 py-1.5 rounded-xl bg-surface-muted hover:bg-border/70 border border-border text-xs font-semibold text-text-primary flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-primary" />
              <span>Same as yesterday</span>
            </button>
          )}

          {!isEditing && !data?.on_leave_today && (
            <>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleLeaveToday}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-xs font-semibold text-purple-700 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>I&apos;m on leave today</span>
              </button>
              {!data?.is_snoozed && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleSnooze}
                  className="px-3 py-1.5 rounded-xl bg-surface-muted hover:bg-border/70 border border-border text-xs font-semibold text-text-secondary flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Snooze until tomorrow</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pending Reviewer Questions */}
      {pendingReviews.length > 0 && (
        <div className="space-y-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Questions from reviewer ({pendingReviews.length})</span>
          </span>
          {pendingReviews.map((rev) => (
            <div key={rev.id} className="p-2.5 bg-surface rounded-lg border border-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-text-primary">{rev.reviewer_name}</span>
                <span className="text-[11px] text-text-muted">{String(rev.work_date).slice(0, 10)}</span>
              </div>
              {rev.note && <p className="text-text-secondary">&ldquo;{rev.note}&rdquo;</p>}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyDrafts[rev.id] || ''}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [rev.id]: e.target.value }))}
                  placeholder="Write a quick reply..."
                  maxLength={500}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-app border border-border text-xs text-text-primary outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={!(replyDrafts[rev.id] || '').trim() || replyingId === rev.id}
                  onClick={() => handleAnswerReview(rev.id)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                >
                  {replyingId === rev.id ? 'Sending...' : 'Reply'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Cards List */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {orderedCards.length === 0 ? (
          <div className="p-4 bg-app border border-dashed border-border rounded-xl text-xs text-text-secondary text-center">
            You have no active assigned tasks in this workspace right now. You can still add an optional general note below.
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleCards.map((card, idx) => {
              const item = itemsByCard[card.id] || { status: 'working', note: '', is_long_task: false, expected_finish_date: '' };
              const isBlocked = item.status === 'blocked';
              const placeholder = isBlocked
                ? 'Required: briefly explain what is blocking you...'
                : NOTE_PLACEHOLDERS[idx % NOTE_PLACEHOLDERS.length];

              return (
                <div
                  key={card.id}
                  className={`p-3 rounded-xl border transition-colors space-y-2.5 ${
                    isBlocked ? 'bg-danger-tint/40 border-danger/40' : 'bg-app border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-text-primary truncate">{card.title}</span>
                        <span className="text-[11px] text-text-muted">{card.board_title}</span>
                        {card.long_task_covered && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                            Long task (covered)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* One-tap status chips */}
                    <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label={`Status for ${card.title}`}>
                      {STATUS_CHIPS.map((chip) => {
                        const active = item.status === chip.value;
                        return (
                          <button
                            key={chip.value}
                            type="button"
                            onClick={() => updateCardItem(card.id, { status: chip.value })}
                            aria-pressed={active}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                              active ? chip.activeClass : chip.idleClass
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional one-line note (required only when Blocked) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={item.note || ''}
                      onChange={(e) => updateCardItem(card.id, { note: e.target.value })}
                      placeholder={placeholder}
                      maxLength={500}
                      aria-label={`Note for ${card.title}`}
                      className={`flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-surface border text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors ${
                        isBlocked && !(item.note || '').trim()
                          ? 'border-danger focus:border-danger'
                          : 'border-border focus:border-primary'
                      }`}
                    />
                  </div>

                  {/* Long task toggle */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-text-secondary">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(item.is_long_task)}
                        onChange={(e) => updateCardItem(card.id, { is_long_task: e.target.checked })}
                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                      />
                      <span className="font-medium text-text-primary">This is a long task</span>
                      <span className="text-text-muted">(short note every 2–3 working days is enough)</span>
                    </label>

                    {item.is_long_task && (
                      <label className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-text-muted" />
                        <span>Expected finish:</span>
                        <input
                          type="date"
                          value={item.expected_finish_date || ''}
                          onChange={(e) => updateCardItem(card.id, { expected_finish_date: e.target.value })}
                          className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] text-text-primary outline-none focus:border-primary"
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllCards((v) => !v)}
                className="w-full py-1.5 rounded-xl bg-app hover:bg-surface-muted border border-border/80 text-xs font-semibold text-primary flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                {showAllCards ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show fewer tasks</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Show {hiddenCount} more task{hiddenCount > 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Optional overall note + Submit */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60 flex-wrap">
          <input
            type="text"
            value={summaryNote}
            onChange={(e) => setSummaryNote(e.target.value)}
            placeholder="Optional overall note for today (e.g. pairing with QA in the afternoon)..."
            maxLength={500}
            aria-label="Optional overall note"
            className="flex-1 min-w-[220px] px-3 py-2 rounded-xl bg-app border border-border text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={submitting || (orderedCards.length === 0 && !summaryNote.trim())}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Spinner size="xs" /> : <Send className="w-3.5 h-3.5" />}
            <span>{submitting ? 'Saving...' : isEditing ? 'Save changes' : 'Submit update'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
