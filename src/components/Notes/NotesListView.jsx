// client/src/components/Notes/NotesListView.jsx
import React from 'react';
import { Pin, Copy, Trash2 } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import NotesEmptyState from './NotesEmptyState';
import { getNoteColorMeta, MAX_NOTE_CONTENT_LENGTH } from './noteConstants';

function ListNoteCard({
  note,
  canManage,
  autoFocus,
  onChangeContent,
  onTogglePin,
  onDuplicate,
  onDelete,
  onBlurEmpty
}) {
  const colorMeta = getNoteColorMeta('sky');

  return (
    <div
      style={{ backgroundColor: colorMeta.bgVar, borderColor: colorMeta.borderVar }}
      className="rounded-xl border shadow-2xs hover:shadow-md transition-shadow flex flex-col min-h-[190px] overflow-hidden"
    >
      <div className="h-8 px-3 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-1.5">
          <span style={{ backgroundColor: colorMeta.dotVar }} className="w-2 h-2 rounded-full" />
          {note.is_pinned && (
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">
              Pinned
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip content={canManage ? (note.is_pinned ? 'Unpin' : 'Pin') : 'View-only permission'}>
            <button
              type="button"
              disabled={!canManage}
              aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
              onClick={() => onTogglePin?.(note.id, !note.is_pinned)}
              className={`p-1 rounded-md cursor-pointer ${
                note.is_pinned ? 'text-primary bg-surface/70' : 'text-text-secondary hover:bg-surface/60'
              } ${!canManage ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content={canManage ? 'Duplicate note' : 'View-only permission'}>
            <button
              type="button"
              disabled={!canManage}
              aria-label="Duplicate note"
              onClick={() => onDuplicate?.(note.id)}
              className={`p-1 rounded-md text-text-secondary hover:bg-surface/60 cursor-pointer ${
                !canManage ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content={canManage ? 'Delete note' : 'View-only permission'}>
            <button
              type="button"
              disabled={!canManage}
              aria-label="Delete note"
              onClick={() => onDelete?.(note.id)}
              className={`p-1 rounded-md text-text-secondary hover:text-danger hover:bg-surface/60 cursor-pointer ${
                !canManage ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col">
        {canManage ? (
          <textarea
            autoFocus={autoFocus}
            value={note.content || ''}
            maxLength={MAX_NOTE_CONTENT_LENGTH}
            placeholder="Write a quick note..."
            aria-label="Note text"
            onChange={(e) => onChangeContent?.(note.id, e.target.value.slice(0, MAX_NOTE_CONTENT_LENGTH))}
            onBlur={(e) => {
              if (!e.target.value.trim()) onBlurEmpty?.(note.id);
            }}
            className="w-full h-full min-h-[130px] resize-none bg-transparent border-0 outline-none text-[14px] leading-relaxed text-text-primary placeholder:text-text-muted"
          />
        ) : (
          <div className="text-[14px] leading-relaxed text-text-primary whitespace-pre-wrap break-words">
            {note.content?.trim() || <span className="text-text-muted italic">Empty note</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotesListView({
  notes = [],
  allNotesCount = 0,
  canManage = true,
  searchQuery = '',
  colorFilter = null,
  newNoteId = null,
  onCreateNote,
  onChangeContent,
  onChangeColor,
  onTogglePin,
  onDuplicate,
  onDelete,
  onBlurEmpty,
  onClearFilters
}) {
  const q = searchQuery.trim().toLowerCase();
  const filtered = notes.filter((n) => {
    const matchesSearch = !q || (n.content || '').toLowerCase().includes(q);
    const matchesColor = !colorFilter || n.color === colorFilter;
    return matchesSearch && matchesColor;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1;
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });

  if (allNotesCount === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-surface-muted p-6 flex items-center justify-center">
        <NotesEmptyState variant="empty" canManage={canManage} onCreateNote={onCreateNote} />
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-surface-muted p-6 flex items-center justify-center">
        <NotesEmptyState variant="search" canManage={canManage} onClearFilters={onClearFilters} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-muted p-4 sm:p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((note) => (
          <ListNoteCard
            key={note.id}
            note={note}
            canManage={canManage}
            autoFocus={newNoteId === note.id}
            onChangeContent={onChangeContent}
            onChangeColor={onChangeColor}
            onTogglePin={onTogglePin}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onBlurEmpty={onBlurEmpty}
          />
        ))}
      </div>
    </div>
  );
}
