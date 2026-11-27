// client/src/components/Notes/NotesEmptyState.jsx
import React from 'react';
import { Plus, SearchX, StickyNote } from 'lucide-react';
import Button from '../ui/Button';

export default function NotesEmptyState({
  variant = 'empty',
  canManage = true,
  onCreateNote,
  onClearFilters
}) {
  if (variant === 'search') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center mb-4">
          <SearchX className="w-6 h-6 text-text-muted" />
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-1">No matching notes</h3>
        <p className="text-sm text-text-secondary mb-4">
          Try a different search term or clear your active colour filter.
        </p>
        {onClearFilters && (
          <Button variant="secondary" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center select-none">
      {/* Ghost sticky preview */}
      <div
        style={{ backgroundColor: 'var(--color-board-sky)' }}
        className="w-[220px] h-[160px] rounded-xl border border-dashed border-border-strong shadow-2xs p-4 mb-6 flex flex-col justify-between text-left opacity-85"
        aria-hidden="true"
      >
        <div className="flex items-center justify-between">
          <span className="w-10 h-1.5 rounded-full bg-border-strong/60" />
          <StickyNote className="w-4 h-4 text-primary-text/70" />
        </div>
        <div className="space-y-2">
          <div className="w-4/5 h-2 rounded bg-border-strong/50" />
          <div className="w-3/5 h-2 rounded bg-border-strong/40" />
          <div className="w-2/3 h-2 rounded bg-border-strong/30" />
        </div>
        <span className="text-[11px] font-medium text-primary-text/80">
          Private to you
        </span>
      </div>

      <h3 className="text-base font-semibold text-text-primary mb-1">
        {canManage ? 'Double-click anywhere to add your first note' : 'No notes yet'}
      </h3>
      <p className="text-sm text-text-secondary max-w-sm mb-5">
        Keep quick reminders, links, and scratchpad ideas right where you work.
      </p>
      {canManage && onCreateNote && (
        <Button variant="primary" size="md" onClick={onCreateNote}>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Plus className="w-4 h-4 shrink-0" />
            <span>New note</span>
          </span>
        </Button>
      )}
    </div>
  );
}
