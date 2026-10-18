// client/src/components/Board/CalendarView.jsx
import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Menu,
  Search,
  CheckSquare,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { formatDate } from '../../lib/dateFormat';

export default function CalendarView({ board, onCardClick, onOpenMobileSidebar }) {
  const [, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCardClick = (card) => {
    if (onCardClick) {
      onCardClick(card);
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('card', String(card.id));
        return next;
      });
    }
  };

  const datedCards = useMemo(() => {
    return (board?.lists || []).flatMap((list) =>
      (list.cards || [])
        .filter((card) => Boolean(card.due_date))
        .map((card) => ({ ...card, listName: list.name }))
    );
  }, [board]);

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return datedCards;
    const q = searchQuery.toLowerCase();
    return datedCards.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.listName?.toLowerCase().includes(q)
    );
  }, [datedCards, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app select-none text-left">
      {/* Main Content Area: Floating Rounded Surface */}
      <div className="flex-1 flex overflow-hidden min-h-0 px-3 pb-3 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 relative pt-2">
        <section aria-label="Project Calendar View" className="flex-1 min-w-0 h-full rounded-[28px] lg:rounded-[36px] bg-board-neutral p-4 sm:p-6 lg:p-8 overflow-y-auto shadow-xs no-scrollbar">
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary-tint text-primary flex items-center justify-center">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Sprint Timeline & Deadlines
                </h2>
                <p className="text-xs text-text-secondary">
                  Showing {filteredCards.length} of {datedCards.length} scheduled sprint milestones
                </p>
              </div>
            </div>
          </div>

          {filteredCards.length === 0 ? (
            <div className="p-12 sm:p-16 bg-surface border border-border rounded-3xl text-center space-y-3 max-w-md mx-auto my-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-primary-tint text-primary mx-auto flex items-center justify-center">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-text-primary">
                {searchQuery ? `No deadlines matching "${searchQuery}"` : 'No scheduled tasks with due dates'}
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Add due dates to cards on your board to see them here on your calendar timeline.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(card);
                    }
                  }}
                  className="p-5 bg-surface hover:bg-surface-muted border border-border hover:border-primary/50 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between gap-4 min-h-[140px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary-tint text-primary text-[10px] font-bold border border-primary/20">
                        {card.listName}
                      </span>
                      <span className="text-xs text-text-muted group-hover:text-primary transition-colors flex items-center gap-0.5">
                        Open <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2">
                      {card.title}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-border/70 flex items-center justify-between text-xs text-text-secondary">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary bg-surface-muted px-2.5 py-1 rounded-lg border border-border">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {formatDate(card.due_date)}
                    </span>

                    <div className="flex items-center -space-x-1.5">
                      {(card.members || card.assigned_users || []).map((u) => (
                        <Avatar key={u.id} name={u.name} src={u.avatar_url || u.avatar} user={u} size="xs" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </section>
      </div>
    </div>
  );
}
