// client/src/components/Board/ListView.jsx
import React, { useState, useMemo } from 'react';
import { useSearchParams, NavLink, useParams } from 'react-router-dom';
import {
  CheckSquare,
  Calendar,
  Search,
  Menu,
  Clock,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  User
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { formatDate } from '../../lib/dateFormat';

export default function ListView({ board, onCardClick, onOpenMobileSidebar }) {
  const { workspaceId } = useParams();
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

  const allCards = useMemo(() => {
    return (board?.lists || []).flatMap((list) =>
      (list.cards || []).map((card) => ({ ...card, listName: list.name }))
    );
  }, [board]);

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return allCards;
    const q = searchQuery.toLowerCase();
    return allCards.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.listName?.toLowerCase().includes(q)
    );
  }, [allCards, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app select-none text-left">
      {/* List View Header on Outer Shell */}
      <header className="relative z-20 px-4 sm:px-6 lg:px-8 py-3.5 bg-app flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileSidebar && (
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="p-2 text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-muted border border-border rounded-xl lg:hidden transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Open Navigation"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <h1 tabIndex={-1} className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight truncate">
              {board?.name || 'Project'}
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-tint text-primary border border-primary/20">
              {filteredCards.length} tasks
            </span>
          </div>

          {/* View Switcher Pills */}
          <div className="flex items-center gap-1 ml-2 bg-surface-muted p-1 rounded-xl border border-border text-xs">
            <NavLink
              to={`/w/${workspaceId}/p/${board?.id}/board`}
              className={({ isActive }) =>
                `px-3 py-1 rounded-lg font-semibold transition-all min-h-[28px] flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? 'bg-surface text-primary shadow-xs font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </NavLink>
            <NavLink
              to={`/w/${workspaceId}/p/${board?.id}/list`}
              className={({ isActive }) =>
                `px-3 py-1 rounded-lg font-semibold transition-all min-h-[28px] flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? 'bg-surface text-primary shadow-xs font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              <ListIcon className="w-3.5 h-3.5" />
              List
            </NavLink>
            <NavLink
              to={`/w/${workspaceId}/p/${board?.id}/calendar`}
              className={({ isActive }) =>
                `px-3 py-1 rounded-lg font-semibold transition-all min-h-[28px] flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? 'bg-surface text-primary shadow-xs font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendar
            </NavLink>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <label htmlFor="list-search-input" className="sr-only">
            Filter tasks
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            id="list-search-input"
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted text-xs focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 transition-all shadow-xs"
          />
        </div>
      </header>

      {/* Main Content Area: Floating Rounded Surface */}
      <div className="flex-1 flex overflow-hidden min-h-0 px-3 pb-3 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 relative">
        <section aria-label="Project List View" className="flex-1 min-w-0 h-full rounded-[28px] lg:rounded-[36px] bg-board-neutral p-4 sm:p-6 lg:p-8 overflow-y-auto shadow-xs no-scrollbar">
        {filteredCards.length === 0 ? (
          <div className="p-12 sm:p-16 bg-surface border border-border rounded-3xl text-center space-y-3 max-w-md mx-auto my-8 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-primary-tint text-primary mx-auto flex items-center justify-center">
              <CheckSquare className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-text-primary">
              {searchQuery ? `No tasks matching "${searchQuery}"` : 'No tasks on this board yet'}
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Switch to Board view to create cards and organize sprint columns.
            </p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-muted text-text-secondary border-b border-border">
                  <tr>
                    <th scope="col" className="py-3.5 px-5 font-bold uppercase tracking-wider text-[11px]">Task Title</th>
                    <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Pipeline Stage</th>
                    <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Due Date</th>
                    <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Assigners</th>
                    <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Assignees</th>
                    <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-primary">
                  {filteredCards.map((card) => (
                    <tr
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleCardClick(card);
                        }
                      }}
                      className="hover:bg-primary-tint/30 cursor-pointer transition-colors focus:outline-none focus-visible:bg-primary-tint/40 group"
                    >
                      <td className="py-3.5 px-5 font-bold max-w-sm text-text-primary group-hover:text-primary transition-colors truncate">
                        {card.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-semibold text-text-secondary shadow-2xs">
                          {card.listName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        {card.due_date ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {formatDate(card.due_date)}
                          </span>
                        ) : (
                          <span className="text-text-muted font-normal">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center -space-x-1.5">
                          {(card.assigners || []).map((u) => (
                            <Avatar key={u.id} name={u.name} size="xs" className="border border-primary/40" />
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center -space-x-1.5">
                          {(card.members || card.assigned_users || []).map((u) => (
                            <Avatar key={u.id} name={u.name} size="xs" />
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 inline-flex items-center gap-0.5 transition-transform">
                          Open <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stack View (< 768px) */}
            <div className="md:hidden space-y-3">
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
                  className="p-4 bg-surface hover:bg-surface-muted border border-border rounded-2xl shadow-xs transition-all cursor-pointer min-h-[44px] flex flex-col justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <span className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2">
                      {card.title}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-muted border border-border text-[10px] font-bold text-text-secondary shrink-0">
                      {card.listName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-secondary pt-2 border-t border-border/70">
                    <div>
                      {card.due_date ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-primary font-medium">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          {formatDate(card.due_date)}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">No deadline</span>
                      )}
                    </div>

                    <div className="flex items-center -space-x-1.5">
                      {(card.members || card.assigned_users || []).map((u) => (
                        <Avatar key={u.id} name={u.name} size="xs" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </section>
      </div>
    </div>
  );
}
