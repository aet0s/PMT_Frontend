// client/src/components/Notes/NotesBoard.jsx
import React, { useRef, useState, useEffect } from 'react';
import StickyNote from './StickyNote';
import NotesEmptyState from './NotesEmptyState';
import {
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT
} from './noteConstants';

export default function NotesBoard({
  notes = [],
  allNotesCount = 0,
  canManage = true,
  tiltEnabled = true,
  snapEnabled = true,
  newNoteId = null,
  onCreateAt,
  onBringToFront,
  onChangeContent,
  onCommitPosition,
  onCommitSize,
  onTogglePin,
  onDuplicate,
  onDelete,
  onBlurEmpty,
  viewportRef: externalViewportRef
}) {
  const internalViewportRef = useRef(null);
  const viewportRef = externalViewportRef || internalViewportRef;
  const [viewportBounds, setViewportBounds] = useState(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const updateBounds = () => {
      setViewportBounds({
        width: el.clientWidth,
        height: el.clientHeight
      });
    };
    updateBounds();
    const ro = new ResizeObserver(updateBounds);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewportRef]);

  const handleDoubleClick = (e) => {
    if (!canManage) return;
    if (e.target !== e.currentTarget && !e.target.dataset?.boardSurface) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pad = 8;
    const maxX = Math.max(pad, rect.width - DEFAULT_NOTE_WIDTH - pad);
    const maxY = Math.max(pad, rect.height - DEFAULT_NOTE_HEIGHT - pad);
    const x = Math.round(Math.min(maxX, Math.max(pad, e.clientX - rect.left - DEFAULT_NOTE_WIDTH / 2)));
    const y = Math.round(Math.min(maxY, Math.max(pad, e.clientY - rect.top - DEFAULT_NOTE_HEIGHT / 2)));
    onCreateAt?.(x, y);
  };

  return (
    <div
      ref={viewportRef}
      onDoubleClick={handleDoubleClick}
      data-board-surface="true"
      style={{
        backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
      className="relative flex-1 w-full h-full overflow-hidden bg-surface-muted select-none cursor-default"
    >
      {/* Empty state */}
      {allNotesCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
          <NotesEmptyState
            variant="empty"
            canManage={canManage}
            onCreateNote={() => onCreateAt?.()}
          />
        </div>
      )}

      {/* Viewport-bounded Canvas */}
      <div
        data-board-surface="true"
        className="relative w-full h-full"
      >
        {notes.map((note) => {
          const pad = 8;
          const maxX = viewportBounds ? Math.max(pad, viewportBounds.width - note.width - pad) : note.x;
          const maxY = viewportBounds ? Math.max(pad, viewportBounds.height - note.height - pad) : note.y;
          const clampedNote = viewportBounds
            ? {
                ...note,
                x: Math.min(maxX, Math.max(pad, note.x)),
                y: Math.min(maxY, Math.max(pad, note.y))
              }
            : note;

          return (
            <StickyNote
              key={note.id}
              note={clampedNote}
              zoom={1}
              bounds={viewportBounds}
              canManage={canManage}
              tiltEnabled={tiltEnabled}
              snapEnabled={snapEnabled}
              autoFocus={newNoteId === note.id}
              onBringToFront={onBringToFront}
              onChangeContent={onChangeContent}
              onCommitPosition={onCommitPosition}
              onCommitSize={onCommitSize}
              onTogglePin={onTogglePin}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onBlurEmpty={onBlurEmpty}
            />
          );
        })}
      </div>
    </div>
  );
}
