// client/src/components/Board/ListView.jsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckSquare, Calendar, Tag, User } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { formatDate } from '../../lib/dateFormat';

export default function ListView({ board, onCardClick }) {
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

  const allCards = (board?.lists || []).flatMap((list) =>
    (list.cards || []).map((card) => ({ ...card, listName: list.name }))
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 text-left select-none">
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-surface-muted/60 text-text-secondary border-b border-border">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Title</th>
              <th className="py-2.5 px-4 font-semibold">Status / List</th>
              <th className="py-2.5 px-4 font-semibold">Due Date</th>
              <th className="py-2.5 px-4 font-semibold">Assigner</th>
              <th className="py-2.5 px-4 font-semibold">Assignees</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text-primary">
            {allCards.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-text-muted">
                  No tasks found on this board.
                </td>
              </tr>
            ) : (
              allCards.map((card) => (
                <tr
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className="hover:bg-primary-tint/30 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-medium max-w-xs truncate">
                    {card.title}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[11px] text-text-secondary">
                      {card.listName}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-text-secondary">
                    {card.due_date ? formatDate(card.due_date) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center -space-x-1.5">
                      {(card.assigners || []).map((u) => (
                        <Avatar key={u.id} name={u.name} size="xs" className="border border-indigo-500/50" />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center -space-x-1.5">
                      {(card.members || card.assigned_users || []).map((u) => (
                        <Avatar key={u.id} name={u.name} size="xs" />
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
