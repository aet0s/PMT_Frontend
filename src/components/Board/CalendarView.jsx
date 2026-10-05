// client/src/components/Board/CalendarView.jsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { formatDate } from '../../lib/dateFormat';

export default function CalendarView({ board, onCardClick }) {
  const [, setSearchParams] = useSearchParams();

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

  const datedCards = (board?.lists || []).flatMap((list) =>
    (list.cards || [])
      .filter((card) => Boolean(card.due_date))
      .map((card) => ({ ...card, listName: list.name }))
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 text-left select-none">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-text-primary">Scheduled Tasks & Deadlines</h2>
        </div>

        {datedCards.length === 0 ? (
          <div className="p-12 bg-surface border border-border rounded-xl text-center text-xs text-text-muted">
            No cards with due dates set on this board.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {datedCards.map((card) => (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="p-4 bg-surface hover:bg-surface-hover border border-border hover:border-primary/40 rounded-xl shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-semibold text-text-primary line-clamp-2">
                    {card.title}
                  </span>
                  <span className="text-[11px] text-text-secondary mt-1 block">
                    {card.listName}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-text-muted" />
                    {formatDate(card.due_date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
