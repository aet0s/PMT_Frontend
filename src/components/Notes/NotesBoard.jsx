// client/src/components/Notes/NotesBoard.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import StickyNote from './StickyNote';
import NotesEmptyState from './NotesEmptyState';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  clampNotePosition,
  clampZoom
} from './noteConstants';

export default function NotesBoard({
  notes = [],
  allNotesCount = 0,
  zoom = 1,
  pan = { x: 0, y: 0 },
  onZoomChange,
  onPanChange,
  canManage = true,
  searchQuery = '',
  colorFilter = null,
  tiltEnabled = true,
  snapEnabled = true,
  newNoteId = null,
  onCreateAt,
  onBringToFront,
  onChangeContent,
  onCommitPosition,
  onCommitSize,
  onChangeColor,
  onTogglePin,
  onDuplicate,
  onDelete,
  onBlurEmpty,
  onClearFilters,
  viewportRef: externalViewportRef
}) {
  const internalViewportRef = useRef(null);
  const viewportRef = externalViewportRef || internalViewportRef;
  const panDragRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);

  // Track Spacebar for Space+drag panning
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        setSpacePressed(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Wheel pan & Ctrl/Cmd+wheel zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      onZoomChange?.(clampZoom(zoom + delta));
      return;
    }
    onPanChange?.({
      x: Math.min(200, Math.max(-CANVAS_WIDTH * zoom + 300, pan.x - e.deltaX)),
      y: Math.min(200, Math.max(-CANVAS_HEIGHT * zoom + 300, pan.y - e.deltaY))
    });
  }, [zoom, pan, onZoomChange, onPanChange]);

  const handleBackgroundPointerDown = (e) => {
    if (e.target !== e.currentTarget && !e.target.dataset?.boardSurface) return;
    if (e.button !== 0 && !spacePressed) return;
    setIsPanning(true);
    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleBackgroundPointerMove = (e) => {
    const st = panDragRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    onPanChange?.({
      x: Math.min(200, Math.max(-CANVAS_WIDTH * zoom + 300, st.origPanX + dx)),
      y: Math.min(200, Math.max(-CANVAS_HEIGHT * zoom + 300, st.origPanY + dy))
    });
  };

  const handleBackgroundPointerUp = (e) => {
    if (!panDragRef.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    panDragRef.current = null;
    setIsPanning(false);
  };

  const handleDoubleClick = (e) => {
    if (!canManage) return;
    if (e.target !== e.currentTarget && !e.target.dataset?.boardSurface) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasX = (e.clientX - rect.left - pan.x) / zoom - DEFAULT_NOTE_WIDTH / 2;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom - DEFAULT_NOTE_HEIGHT / 2;
    const clamped = clampNotePosition(canvasX, canvasY, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT);
    onCreateAt?.(clamped.x, clamped.y);
  };

  const q = searchQuery.trim().toLowerCase();
  const hasFilters = Boolean(q || colorFilter);

  return (
    <div
      ref={viewportRef}
      onWheel={handleWheel}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerUp}
      onPointerCancel={handleBackgroundPointerUp}
      onDoubleClick={handleDoubleClick}
      data-board-surface="true"
      style={{
        backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)',
        backgroundSize: `${Math.round(24 * zoom)}px ${Math.round(24 * zoom)}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`
      }}
      className={`relative flex-1 w-full h-full overflow-hidden bg-surface-muted select-none ${
        isPanning || spacePressed ? 'cursor-grabbing' : 'cursor-default'
      }`}
    >
      {/* Empty states */}
      {allNotesCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
          <NotesEmptyState
            variant="empty"
            canManage={canManage}
            onCreateNote={() => onCreateAt?.()}
          />
        </div>
      )}

      {allNotesCount > 0 && hasFilters && notes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
          <NotesEmptyState
            variant="search"
            canManage={canManage}
            onClearFilters={onClearFilters}
          />
        </div>
      )}

      {/* Logical 4000x3000 Canvas */}
      <div
        data-board-surface="true"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
        className="relative will-change-transform"
      >
        {notes.map((note) => {
          const matchesSearch = !q || (note.content || '').toLowerCase().includes(q);
          const matchesColor = !colorFilter || note.color === colorFilter;
          const dimmed = hasFilters && (!matchesSearch || !matchesColor);

          return (
            <StickyNote
              key={note.id}
              note={note}
              zoom={zoom}
              canManage={canManage}
              tiltEnabled={tiltEnabled}
              snapEnabled={snapEnabled}
              dimmed={dimmed}
              autoFocus={newNoteId === note.id}
              onBringToFront={onBringToFront}
              onChangeContent={onChangeContent}
              onCommitPosition={onCommitPosition}
              onCommitSize={onCommitSize}
              onChangeColor={onChangeColor}
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
