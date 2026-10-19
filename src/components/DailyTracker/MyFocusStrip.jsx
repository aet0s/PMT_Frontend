// client/src/components/DailyTracker/MyFocusStrip.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Target, Brain, CheckCircle2, Clock, Plus, Sparkles, ChevronRight } from 'lucide-react';
import { getWorkspaceDailyTrackerPeople } from '../../api/workspaces';
import QuickCheckinModal from './QuickCheckinModal';

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MyFocusStrip({
  workspaceId,
  currentUserId,
  onCardClick
}) {
  const [focusCards, setFocusCards] = useState([]);
  const [latestCheckin, setLatestCheckin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkinCard, setCheckinCard] = useState(null);

  const fetchMyFocus = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const today = getTodayString();
      const res = await getWorkspaceDailyTrackerPeople(workspaceId, { date: today });
      const me = (res.people || []).find((p) => Number(p.id) === Number(currentUserId));
      if (me) {
        setFocusCards(me.focus_cards || []);
        setLatestCheckin(me.checkins?.[0] || null);
      } else {
        setFocusCards([]);
        setLatestCheckin(null);
      }
    } catch (err) {
      console.warn('Could not load focus strip:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUserId]);

  useEffect(() => {
    fetchMyFocus();
  }, [fetchMyFocus]);

  if (focusCards.length === 0 && !loading) {
    return null; // Silent if no focus cards set
  }

  return (
    <div className="w-full bg-surface border-b border-border/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 select-none flex-wrap">
      <div className="flex items-center gap-3 flex-wrap min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-primary shrink-0">
          <Target className="w-4 h-4" />
          <span>My Focus Today:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {focusCards.map((card) => {
            const hasCheckedIn = Boolean(latestCheckin && latestCheckin.card_id === card.id);
            return (
              <div
                key={card.id}
                className="inline-flex items-center gap-2 px-3 py-1 bg-app border border-border/80 rounded-xl hover:border-primary/40 transition-colors shadow-2xs max-w-sm"
              >
                <span
                  onClick={() => onCardClick && onCardClick({ id: card.id })}
                  className="text-xs font-bold text-text-primary hover:text-primary transition-colors cursor-pointer truncate max-w-[200px]"
                >
                  {card.title}
                </span>

                {card.deep_work ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 shrink-0">
                    <Brain className="w-2.5 h-2.5" />
                    <span>Deep</span>
                  </span>
                ) : null}

                {hasCheckedIn ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{latestCheckin.progress_percent}%</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCheckinCard(card)}
                    className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-md hover:bg-primary-hover transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    Check In
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {checkinCard && (
        <QuickCheckinModal
          isOpen={Boolean(checkinCard)}
          onClose={() => setCheckinCard(null)}
          card={checkinCard}
          onSuccess={fetchMyFocus}
        />
      )}
    </div>
  );
}
