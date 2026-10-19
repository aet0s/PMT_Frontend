// client/src/components/DailyTracker/CheckinPopup.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertCircle, X, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';
import { getWorkspacePendingCheckins } from '../../api/workspaces';
import { useAuth } from '../../hooks/useAuth';
import QuickCheckinModal from './QuickCheckinModal';

export default function CheckinPopup({ workspaceId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingData, setPendingData] = useState(null);
  const [activeCheckinCard, setActiveCheckinCard] = useState(null);
  const [dismissCount, setDismissCount] = useState(0);
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  const getStorageKey = (dateStr) => {
    return `checkin_popup_dismiss_${workspaceId}_${user?.id || 'anon'}_${dateStr}`;
  };

  const loadPendingCards = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await getWorkspacePendingCheckins(workspaceId);
      setPendingData(res);

      if (res?.date) {
        const key = getStorageKey(res.date);
        const stored = parseInt(localStorage.getItem(key) || '0', 10);
        setDismissCount(stored);
        if (stored > 0) {
          setIsModalDismissed(true);
        }
      }
    } catch (err) {
      // Silently fail if not authorized or network error
    } finally {
      setLoading(false);
    }
  }, [workspaceId, user?.id]);

  useEffect(() => {
    loadPendingCards();
  }, [loadPendingCards]);

  if (loading || !pendingData) return null;

  const { is_working_day, cutoff_passed, cards = [], date } = pendingData;

  // Only shown on working days, after cutoff, and if there are cards needing updates
  if (!is_working_day || !cutoff_passed || cards.length === 0) {
    return null;
  }

  const handleDismissLater = () => {
    const key = getStorageKey(date);
    const newCount = dismissCount + 1;
    localStorage.setItem(key, String(newCount));
    setDismissCount(newCount);
    setIsModalDismissed(true);
  };

  const handleCardCheckinSuccess = () => {
    setActiveCheckinCard(null);
    loadPendingCards();
  };

  // If dismissed 2 or more times, stays as a small banner
  // If dismissed 0 times, shows modal popup
  const showModal = !isModalDismissed && dismissCount < 2;

  return (
    <>
      {/* 1. Modal Popup (shown once per working day after cutoff until dismissed twice with 'Later') */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 animate-in fade-in duration-200">
          <div className="bg-surface border border-border/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Daily Check-in Reminder
                  </h3>
                  <p className="text-xs text-text-secondary">
                    If your task takes more than a day, write a short update each day.
                  </p>
                </div>
              </div>
            </div>

            {/* List up to 3 oldest cards needing an update */}
            <div className="space-y-2.5 pt-1">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Tasks Needing Update ({cards.length})
              </span>
              {cards.slice(0, 3).map((card) => (
                <div
                  key={card.id}
                  className="p-3 bg-app border border-border/80 rounded-xl flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-text-primary truncate">
                      {card.title}
                    </h4>
                    <span className="text-[11px] text-text-muted">
                      {card.board_title || 'Board'} &bull; {card.days_open || 1} day(s) open
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveCheckinCard(card)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-hover text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Write update
                  </button>
                </div>
              ))}
            </div>

            {/* Footer with "Later" button */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <span className="text-[11px] text-text-muted">
                {dismissCount === 0 ? 'Dismissable twice before remaining as banner' : 'Final dismissal before banner mode'}
              </span>
              <button
                type="button"
                onClick={handleDismissLater}
                className="px-4 py-1.5 rounded-xl bg-surface-muted hover:bg-border text-xs font-bold text-text-primary transition-colors cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Small Banner (stays after 'Later' dismissed twice, or when modal is dismissed) */}
      {(isModalDismissed || dismissCount >= 2) && cards.length > 0 && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/25 px-4 py-2 flex items-center justify-between gap-3 text-xs text-text-primary shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">
              <strong>Daily update due:</strong> You have {cards.length} task(s) needing an update today.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {cards.slice(0, 1).map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveCheckinCard(card)}
                className="px-3 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-bold text-xs transition-colors cursor-pointer"
              >
                Write update: {card.title.slice(0, 20)}...
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Checkin Modal */}
      {activeCheckinCard && (
        <QuickCheckinModal
          isOpen={Boolean(activeCheckinCard)}
          onClose={() => setActiveCheckinCard(null)}
          card={activeCheckinCard}
          onSuccess={handleCardCheckinSuccess}
        />
      )}
    </>
  );
}
