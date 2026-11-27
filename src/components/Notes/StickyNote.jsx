// client/src/components/Notes/StickyNote.jsx
import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Pin, Copy, Trash2, GripHorizontal } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import {
  getNoteColorMeta,
  getDeterministicTilt,
  clampNotePosition,
  clampNoteSize,
  snapToGrid,
  screenToCanvasPoint,
  MAX_NOTE_CONTENT_LENGTH,
  GRID_SNAP_PX
} from './noteConstants';

function StickyNoteInner({
  note,
  zoom = 1,
  bounds = null,
  canManage = true,
  tiltEnabled = true,
  snapEnabled = true,
  dimmed = false,
  autoFocus = false,
  onFocusNote,
  onBringToFront,
  onChangeContent,
  onCommitPosition,
  onCommitSize,
  onChangeColor,
  onTogglePin,
  onDuplicate,
  onDelete,
  onBlurEmpty
}) {
  const shouldReduceMotion = useReducedMotion();
  const colorMeta = getNoteColorMeta('sky');
  const [isEditing, setIsEditing] = useState(Boolean(autoFocus));
  const [draftText, setDraftText] = useState(note.content || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [livePos, setLivePos] = useState(null);
  const [liveSize, setLiveSize] = useState(null);

  const noteRef = useRef(null);
  const textareaRef = useRef(null);
  const pointerStateRef = useRef(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftText(note.content || '');
    }
  }, [note.content, isEditing]);

  useEffect(() => {
    if (autoFocus && canManage) {
      setIsEditing(true);
    }
  }, [autoFocus, canManage]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const width = liveSize ? liveSize.width : note.width;
  const height = liveSize ? liveSize.height : note.height;
  const x = livePos ? livePos.x : note.x;
  const y = livePos ? livePos.y : note.y;
  const tiltDeg = isDragging || isEditing ? 0 : getDeterministicTilt(note.rotation_seed, tiltEnabled);

  const clampToBounds = (rawX, rawY, w, h) => {
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      const pad = 8;
      const maxX = Math.max(pad, bounds.width - w - pad);
      const maxY = Math.max(pad, bounds.height - h - pad);
      return {
        x: Math.round(Math.min(maxX, Math.max(pad, rawX))),
        y: Math.round(Math.min(maxY, Math.max(pad, rawY)))
      };
    }
    return clampNotePosition(rawX, rawY, w, h);
  };

  const startDrag = (e) => {
    if (!canManage || note.is_pinned || isEditing) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    didDragRef.current = false;
    onBringToFront?.(note.id);
    setIsDragging(true);
    pointerStateRef.current = {
      mode: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      origX: note.x,
      origY: note.y
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const startResize = (e) => {
    if (!canManage || note.is_pinned) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    didDragRef.current = false;
    onBringToFront?.(note.id);
    setIsResizing(true);
    pointerStateRef.current = {
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      origW: note.width,
      origH: note.height
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const st = pointerStateRef.current;
    if (!st) return;
    e.stopPropagation();
    if (Math.abs(e.clientX - st.startX) > 3 || Math.abs(e.clientY - st.startY) > 3) {
      didDragRef.current = true;
    }
    const delta = screenToCanvasPoint(e.clientX - st.startX, e.clientY - st.startY, zoom);
    if (st.mode === 'drag') {
      const rawX = snapToGrid(st.origX + delta.x, GRID_SNAP_PX, snapEnabled);
      const rawY = snapToGrid(st.origY + delta.y, GRID_SNAP_PX, snapEnabled);
      setLivePos(clampToBounds(rawX, rawY, width, height));
    } else if (st.mode === 'resize') {
      const rawW = snapToGrid(st.origW + delta.x, GRID_SNAP_PX, snapEnabled);
      const rawH = snapToGrid(st.origH + delta.y, GRID_SNAP_PX, snapEnabled);
      const clamped = clampNoteSize(rawW, rawH);
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        clamped.width = Math.min(clamped.width, Math.max(160, bounds.width - x - 8));
        clamped.height = Math.min(clamped.height, Math.max(120, bounds.height - y - 8));
      }
      setLiveSize(clamped);
    }
  };

  const handlePointerUp = (e) => {
    const st = pointerStateRef.current;
    if (!st) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    pointerStateRef.current = null;

    if (st.mode === 'drag') {
      setIsDragging(false);
      if (livePos && (livePos.x !== note.x || livePos.y !== note.y)) {
        onCommitPosition?.(note.id, livePos.x, livePos.y);
      }
      setLivePos(null);
    } else if (st.mode === 'resize') {
      setIsResizing(false);
      if (liveSize && (liveSize.width !== note.width || liveSize.height !== note.height)) {
        onCommitSize?.(note.id, liveSize.width, liveSize.height);
      }
      setLiveSize(null);
    }
  };

  const handleTextChange = (e) => {
    const next = e.target.value.slice(0, MAX_NOTE_CONTENT_LENGTH);
    setDraftText(next);
    onChangeContent?.(note.id, next);
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (!draftText.trim()) {
      onBlurEmpty?.(note.id);
    }
  };

  const handleKeyDown = (e) => {
    if (isEditing) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsEditing(false);
        noteRef.current?.focus();
      }
      return;
    }

    if (e.key === 'Enter' && canManage) {
      e.preventDefault();
      setIsEditing(true);
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && canManage) {
      e.preventDefault();
      onDelete?.(note.id);
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && canManage && !note.is_pinned) {
      e.preventDefault();
      const step = e.shiftKey ? 32 : 8;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      if (e.key === 'ArrowRight') dx = step;
      if (e.key === 'ArrowUp') dy = -step;
      if (e.key === 'ArrowDown') dy = step;
      const next = clampNotePosition(note.x + dx, note.y + dy, note.width, note.height);
      onCommitPosition?.(note.id, next.x, next.y);
    }
  };

  const previewSnippet = (note.content || '').trim().slice(0, 40) || 'Empty note';

  return (
    <motion.div
      ref={noteRef}
      role="group"
      tabIndex={0}
      aria-label={`Sticky note: ${previewSnippet}`}
      onKeyDown={handleKeyDown}
      onMouseDown={() => {
        onFocusNote?.(note.id);
        onBringToFront?.(note.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (canManage) setIsEditing(true);
      }}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
      animate={{
        opacity: dimmed ? 0.25 : 1,
        scale: isDragging ? 1.02 : 1,
        x,
        y,
        rotate: tiltDeg
      }}
      transition={shouldReduceMotion || isDragging || isResizing ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
      style={{
        width,
        height,
        zIndex: note.z_index || 1,
        backgroundColor: colorMeta.bgVar,
        borderColor: colorMeta.borderVar,
        position: 'absolute',
        top: 0,
        left: 0,
        touchAction: 'none'
      }}
      className={`group rounded-xl border flex flex-col overflow-hidden select-none transition-shadow focus-ring ${
        isDragging ? 'shadow-lg ring-2 ring-primary/30' : 'shadow-2xs hover:shadow-md'
      }`}
    >
      {/* Top slim drag-handle strip */}
      <div
        onPointerDown={startDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`h-7 px-2 flex items-center justify-between border-b border-border/40 shrink-0 ${
          canManage && !note.is_pinned ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span
            style={{ backgroundColor: colorMeta.dotVar }}
            className="w-2 h-2 rounded-full shrink-0"
            aria-hidden="true"
          />
          <GripHorizontal className="w-3.5 h-3.5 text-text-muted/70 shrink-0" aria-hidden="true" />
          {note.is_pinned && (
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide px-1">
              Pinned
            </span>
          )}
        </div>

        {/* Action controls */}
        <div
          className="flex items-center gap-0.5 opacity-85 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Tooltip content={canManage ? (note.is_pinned ? 'Unpin note' : 'Pin position') : 'View-only permission'}>
            <button
              type="button"
              disabled={!canManage}
              aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin?.(note.id, !note.is_pinned);
              }}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                note.is_pinned ? 'text-primary bg-surface/70' : 'text-text-secondary hover:bg-surface/60'
              } ${!canManage ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Pin className="w-3 h-3" />
            </button>
          </Tooltip>

          <Tooltip content={canManage ? 'Duplicate note' : 'View-only permission'}>
            <button
              type="button"
              disabled={!canManage}
              aria-label="Duplicate note"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate?.(note.id);
              }}
              className={`p-1 rounded-md text-text-secondary hover:bg-surface/60 transition-colors cursor-pointer ${
                !canManage ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Copy className="w-3 h-3" />
            </button>
          </Tooltip>

          <Tooltip content={canManage ? 'Delete note' : 'View-only permission'}>
            <button
              type="button"
              disabled={!canManage}
              aria-label="Delete note"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(note.id);
              }}
              className={`p-1 rounded-md text-text-secondary hover:text-danger hover:bg-surface/60 transition-colors cursor-pointer ${
                !canManage ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Note Body */}
      <div
        onPointerDown={(e) => {
          if (!isEditing && canManage && !note.is_pinned) {
            startDrag(e);
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => {
          e.stopPropagation();
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          if (canManage && !isDragging) {
            setIsEditing(true);
          }
        }}
        className="flex-1 p-3 overflow-hidden flex flex-col"
      >
        {isEditing && canManage ? (
          <textarea
            ref={textareaRef}
            value={draftText}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Write a quick note..."
            maxLength={MAX_NOTE_CONTENT_LENGTH}
            aria-label="Note text"
            className="w-full h-full flex-1 resize-none bg-transparent border-0 outline-none text-[14px] leading-relaxed text-text-primary placeholder:text-text-muted select-text"
          />
        ) : (
          <div className="w-full h-full overflow-y-auto text-[14px] leading-relaxed text-text-primary whitespace-pre-wrap break-words select-text">
            {note.content?.trim() ? (
              note.content
            ) : (
              <span className="text-text-muted italic">
                {canManage ? 'Click to write...' : 'Empty note'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom-right resize handle */}
      {canManage && !note.is_pinned && (
        <div
          role="separator"
          aria-label="Resize note"
          onPointerDown={startResize}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-80 group-focus-within:opacity-80 transition-opacity flex items-end justify-end p-0.5"
        >
          <span className="w-2.5 h-2.5 border-r-2 border-b-2 border-text-muted/70 rounded-br-[2px]" />
        </div>
      )}
    </motion.div>
  );
}

const StickyNote = memo(StickyNoteInner);
export default StickyNote;
