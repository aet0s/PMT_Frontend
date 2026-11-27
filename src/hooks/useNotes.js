// client/src/hooks/useNotes.js
// Phase 1 local-first hook; wired to /api/notes in Phase 4.
import { useState, useCallback, useRef } from 'react';
import {
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  clampNotePosition,
  clampNoteSize,
  getNextZIndex
} from '../components/Notes/noteConstants';

const INITIAL_MOCK_NOTES = [
  {
    id: 'mock-1',
    content: 'Review sprint goals before standup\n- Check API latency\n- Confirm QA sign-off',
    color: 'yellow',
    x: 120,
    y: 96,
    width: 240,
    height: 200,
    z_index: 1,
    is_pinned: false,
    rotation_seed: 3,
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-2',
    content: 'Remember to follow up on design tokens with the team.',
    color: 'sky',
    x: 400,
    y: 120,
    width: 220,
    height: 180,
    z_index: 2,
    is_pinned: true,
    rotation_seed: 14,
    updated_at: new Date().toISOString()
  }
];

export function useNotes({ canView = true, canManage = true } = {}) {
  const [notes, setNotes] = useState(INITIAL_MOCK_NOTES);
  const [trashedNotes, setTrashedNotes] = useState([]);
  const [loading] = useState(false);
  const [error] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [newNoteId, setNewNoteId] = useState(null);
  const idSeqRef = useRef(100);

  const createNote = useCallback(({ x = 200, y = 160, color = 'yellow', content = '' } = {}) => {
    if (!canManage || !canView) return null;
    idSeqRef.current += 1;
    const id = `mock-${idSeqRef.current}`;
    const pos = clampNotePosition(x, y, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT);
    const created = {
      id,
      content,
      color,
      x: pos.x,
      y: pos.y,
      width: DEFAULT_NOTE_WIDTH,
      height: DEFAULT_NOTE_HEIGHT,
      z_index: getNextZIndex(notes),
      is_pinned: false,
      rotation_seed: idSeqRef.current % 21,
      updated_at: new Date().toISOString()
    };
    setNotes((prev) => [...prev, created]);
    setNewNoteId(id);
    return created;
  }, [canManage, canView, notes]);

  const updateNote = useCallback((id, patch) => {
    if (!canManage) return;
    setSaveStatus('saving');
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const size = clampNoteSize(patch.width ?? n.width, patch.height ?? n.height);
        const pos = clampNotePosition(patch.x ?? n.x, patch.y ?? n.y, size.width, size.height);
        return {
          ...n,
          ...patch,
          width: size.width,
          height: size.height,
          x: pos.x,
          y: pos.y,
          updated_at: new Date().toISOString()
        };
      })
    );
    setTimeout(() => setSaveStatus('saved'), 150);
  }, [canManage]);

  const bringToFront = useCallback((id) => {
    setNotes((prev) => {
      const nextZ = getNextZIndex(prev);
      const target = prev.find((n) => n.id === id);
      if (!target || target.z_index === nextZ - 1) return prev;
      return prev.map((n) => (n.id === id ? { ...n, z_index: nextZ } : n));
    });
  }, []);

  const duplicateNote = useCallback((id) => {
    if (!canManage) return;
    setNotes((prev) => {
      const src = prev.find((n) => n.id === id);
      if (!src) return prev;
      idSeqRef.current += 1;
      const pos = clampNotePosition(src.x + 24, src.y + 24, src.width, src.height);
      const copy = {
        ...src,
        id: `mock-${idSeqRef.current}`,
        x: pos.x,
        y: pos.y,
        z_index: getNextZIndex(prev),
        is_pinned: false,
        updated_at: new Date().toISOString()
      };
      return [...prev, copy];
    });
  }, [canManage]);

  const deleteNote = useCallback((id) => {
    if (!canManage) return;
    setNotes((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target) {
        setTrashedNotes((t) => [{ ...target, deleted_at: new Date().toISOString() }, ...t]);
      }
      return prev.filter((n) => n.id !== id);
    });
  }, [canManage]);

  const restoreNote = useCallback((id) => {
    if (!canManage) return;
    setTrashedNotes((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target) {
        const { deleted_at, ...rest } = target;
        setNotes((active) => [...active, rest]);
      }
      return prev.filter((n) => n.id !== id);
    });
  }, [canManage]);

  const purgeNote = useCallback((id) => {
    if (!canManage) return;
    setTrashedNotes((prev) => prev.filter((n) => n.id !== id));
  }, [canManage]);

  return {
    notes,
    trashedNotes,
    loading,
    error,
    saveStatus,
    newNoteId,
    setNewNoteId,
    createNote,
    updateNote,
    bringToFront,
    duplicateNote,
    deleteNote,
    restoreNote,
    purgeNote
  };
}
