// client/src/hooks/useNotes.js
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getNotes,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
  duplicateNote as apiDuplicateNote,
  deleteNote as apiDeleteNote,
  restoreNote as apiRestoreNote,
  purgeNote as apiPurgeNote
} from '../api/notes';
import { useSocket } from '../context/SocketProvider';
import { useAuth } from './useAuth';
import { usePermissions } from '../context/PermissionContext';
import { getTenantItem, setTenantItem, removeTenantItem } from '../lib/storage';
import {
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  clampNotePosition,
  clampNoteSize,
  getNextZIndex
} from '../components/Notes/noteConstants';

const DEBOUNCE_MS = 600;
const BACKUP_KEY = 'notes_unsaved_backup';

export function useNotes({ canView = true, canManage = true } = {}) {
  const { user } = useAuth();
  const { refreshPermissions } = usePermissions();
  let socket = null;
  try {
    socket = useSocket()?.socket || null;
  } catch {}

  const [notes, setNotes] = useState([]);
  const [trashedNotes, setTrashedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionRevoked, setPermissionRevoked] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'
  const [newNoteId, setNewNoteId] = useState(null);

  const notesRef = useRef(notes);
  notesRef.current = notes;
  const timersRef = useRef(new Map());
  const pendingPatchesRef = useRef(new Map());
  const retryCountsRef = useRef(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const t of timersRef.current.values()) clearTimeout(t);
      timersRef.current.clear();
    };
  }, []);

  // Persist unsaved backup locally so text is never lost on network failure
  const syncLocalBackup = useCallback(() => {
    const entries = Array.from(pendingPatchesRef.current.entries());
    if (entries.length === 0) {
      removeTenantItem(user?.tenant_id, BACKUP_KEY);
    } else {
      setTenantItem(user?.tenant_id, BACKUP_KEY, entries);
    }
  }, [user?.tenant_id]);

  // Warn before leaving only if unsaved changes are pending
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (pendingPatchesRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const handleApiError = useCallback((err) => {
    if (err?.status === 403 || err?.code === 'FORBIDDEN') {
      setPermissionRevoked(true);
      refreshPermissions?.();
      return true;
    }
    return false;
  }, [refreshPermissions]);

  const fetchAll = useCallback(async ({ silent = false } = {}) => {
    if (!canView) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [activeRes, trashRes] = await Promise.all([
        getNotes({ trash: false }),
        getNotes({ trash: true })
      ]);
      if (!mountedRef.current) return;
      const activeList = Array.isArray(activeRes?.notes) ? activeRes.notes : [];
      const trashList = Array.isArray(trashRes?.notes) ? trashRes.notes : [];

      // Reapply any unsaved local patches over server data
      const backup = getTenantItem(user?.tenant_id, BACKUP_KEY, null);
      if (Array.isArray(backup) && backup.length > 0 && pendingPatchesRef.current.size === 0) {
        for (const [id, patch] of backup) {
          pendingPatchesRef.current.set(id, patch);
        }
      }
      const merged = activeList.map((n) => {
        const pending = pendingPatchesRef.current.get(n.id);
        return pending ? { ...n, ...pending } : n;
      });

      setNotes(merged);
      setTrashedNotes(trashList);
      setPermissionRevoked(false);
    } catch (err) {
      if (!mountedRef.current) return;
      if (!handleApiError(err)) {
        setError(err?.message || 'Failed to load notes');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [canView, user?.tenant_id, handleApiError]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refetch on window focus for cross-tab consistency
  useEffect(() => {
    const onFocus = () => {
      if (canView && pendingPatchesRef.current.size === 0) {
        fetchAll({ silent: true });
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [canView, fetchAll]);

  // Live socket sync (owner-only rooms)
  useEffect(() => {
    if (!socket || !canView) return;

    const onCreated = ({ note }) => {
      if (!note) return;
      setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
    };
    const onUpdated = ({ note }) => {
      if (!note) return;
      if (pendingPatchesRef.current.has(note.id)) return;
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    };
    const onDeleted = ({ id, note }) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (note) {
        setTrashedNotes((prev) => (prev.some((t) => t.id === id) ? prev : [note, ...prev]));
      }
    };
    const onRestored = ({ note }) => {
      if (!note) return;
      setTrashedNotes((prev) => prev.filter((t) => t.id !== note.id));
      setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
    };
    const onPurged = ({ id }) => {
      setTrashedNotes((prev) => prev.filter((t) => t.id !== id));
    };

    socket.on('note:created', onCreated);
    socket.on('note:updated', onUpdated);
    socket.on('note:deleted', onDeleted);
    socket.on('note:restored', onRestored);
    socket.on('note:purged', onPurged);
    return () => {
      socket.off('note:created', onCreated);
      socket.off('note:updated', onUpdated);
      socket.off('note:deleted', onDeleted);
      socket.off('note:restored', onRestored);
      socket.off('note:purged', onPurged);
    };
  }, [socket, canView]);

  const flushPatch = useCallback(async (id) => {
    const patch = pendingPatchesRef.current.get(id);
    if (!patch) return;

    setSaveStatus('saving');
    try {
      const target = notesRef.current.find((n) => n.id === id);
      const payload = { ...patch };
      if (target?.updated_at && !payload.updated_at) {
        payload.updated_at = target.updated_at;
      }
      const res = await apiUpdateNote(id, payload);
      if (!mountedRef.current) return;
      pendingPatchesRef.current.delete(id);
      retryCountsRef.current.delete(id);
      syncLocalBackup();

      if (res?.note) {
        setNotes((prev) => prev.map((n) => (n.id === id ? res.note : n)));
      }
      if (pendingPatchesRef.current.size === 0) {
        setSaveStatus('saved');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      if (err?.status === 409 && err?.data?.note) {
        // Conflict: refresh server note
        pendingPatchesRef.current.delete(id);
        syncLocalBackup();
        setNotes((prev) => prev.map((n) => (n.id === id ? err.data.note : n)));
        setSaveStatus('saved');
        return;
      }
      if (handleApiError(err)) {
        pendingPatchesRef.current.delete(id);
        syncLocalBackup();
        return;
      }
      // Retry with exponential backoff
      setSaveStatus('error');
      const attempt = (retryCountsRef.current.get(id) || 0) + 1;
      retryCountsRef.current.set(id, attempt);
      const delay = Math.min(30000, 1000 * Math.pow(2, attempt - 1));
      const existingTimer = timersRef.current.get(id);
      if (existingTimer) clearTimeout(existingTimer);
      timersRef.current.set(id, setTimeout(() => flushPatch(id), delay));
    }
  }, [handleApiError, syncLocalBackup]);

  const retryAllPending = useCallback(() => {
    for (const id of pendingPatchesRef.current.keys()) {
      flushPatch(id);
    }
  }, [flushPatch]);

  const createNote = useCallback(async ({ x = 160, y = 120, color = 'sky', content = '' } = {}) => {
    if (!canManage || !canView) return null;
    const pos = clampNotePosition(x, y, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT);
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      content,
      color,
      x: pos.x,
      y: pos.y,
      width: DEFAULT_NOTE_WIDTH,
      height: DEFAULT_NOTE_HEIGHT,
      z_index: getNextZIndex(notesRef.current),
      is_pinned: false,
      rotation_seed: Math.floor(Math.random() * 21),
      updated_at: new Date().toISOString()
    };

    setNotes((prev) => [...prev, optimistic]);
    setNewNoteId(tempId);
    setSaveStatus('saving');

    try {
      const res = await apiCreateNote({
        content,
        color,
        x: pos.x,
        y: pos.y,
        width: DEFAULT_NOTE_WIDTH,
        height: DEFAULT_NOTE_HEIGHT,
        z_index: optimistic.z_index,
        rotation_seed: optimistic.rotation_seed
      });
      if (!mountedRef.current) return null;
      const saved = res?.note;
      if (saved) {
        setNotes((prev) => prev.map((n) => (n.id === tempId ? saved : n)));
        setNewNoteId((curr) => (curr === tempId ? saved.id : curr));
        setSaveStatus('saved');
        return saved;
      }
    } catch (err) {
      if (!mountedRef.current) return null;
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      if (!handleApiError(err)) {
        setSaveStatus('error');
        setError(err?.message || 'Could not create note');
      }
    }
    return null;
  }, [canManage, canView, handleApiError]);

  const updateNote = useCallback((id, patch, { immediate = false } = {}) => {
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
          y: pos.y
        };
      })
    );

    if (String(id).startsWith('temp-')) return;

    const prevPending = pendingPatchesRef.current.get(id) || {};
    pendingPatchesRef.current.set(id, { ...prevPending, ...patch });
    syncLocalBackup();

    const existingTimer = timersRef.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    if (immediate) {
      flushPatch(id);
    } else {
      timersRef.current.set(id, setTimeout(() => flushPatch(id), DEBOUNCE_MS));
    }
  }, [canManage, flushPatch, syncLocalBackup]);

  const bringToFront = useCallback((id) => {
    const nextZ = getNextZIndex(notesRef.current);
    const target = notesRef.current.find((n) => n.id === id);
    if (!target || target.z_index === nextZ - 1) return;
    if (canManage) {
      updateNote(id, { z_index: nextZ });
    } else {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, z_index: nextZ } : n)));
    }
  }, [canManage, updateNote]);

  const duplicateNote = useCallback(async (id) => {
    if (!canManage || String(id).startsWith('temp-')) return;
    setSaveStatus('saving');
    try {
      const res = await apiDuplicateNote(id);
      if (!mountedRef.current) return;
      if (res?.note) {
        setNotes((prev) => (prev.some((n) => n.id === res.note.id) ? prev : [...prev, res.note]));
      }
      setSaveStatus('saved');
    } catch (err) {
      if (!handleApiError(err)) {
        setSaveStatus('error');
        setError(err?.message || 'Could not duplicate note');
      }
    }
  }, [canManage, handleApiError]);

  const deleteNote = useCallback(async (id) => {
    if (!canManage) return;
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);
    pendingPatchesRef.current.delete(id);
    syncLocalBackup();

    const target = notesRef.current.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));

    if (String(id).startsWith('temp-')) return;

    try {
      await apiDeleteNote(id);
      await apiPurgeNote(id).catch(() => {});
    } catch (err) {
      if (target) setNotes((prev) => [...prev, target]);
      handleApiError(err);
    }
  }, [canManage, handleApiError, syncLocalBackup]);

  const restoreNote = useCallback(async (id) => {
    if (!canManage) return;
    const target = trashedNotes.find((t) => t.id === id);
    setTrashedNotes((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await apiRestoreNote(id);
      if (!mountedRef.current) return;
      if (res?.note) {
        setNotes((prev) => (prev.some((n) => n.id === res.note.id) ? prev : [...prev, res.note]));
      }
    } catch (err) {
      if (target) setTrashedNotes((prev) => [target, ...prev]);
      handleApiError(err);
    }
  }, [canManage, trashedNotes, handleApiError]);

  const purgeNote = useCallback(async (id) => {
    if (!canManage) return;
    const target = trashedNotes.find((t) => t.id === id);
    setTrashedNotes((prev) => prev.filter((t) => t.id !== id));
    try {
      await apiPurgeNote(id);
    } catch (err) {
      if (target) setTrashedNotes((prev) => [target, ...prev]);
      handleApiError(err);
    }
  }, [canManage, trashedNotes, handleApiError]);

  return {
    notes,
    trashedNotes,
    loading,
    error,
    permissionRevoked,
    saveStatus,
    newNoteId,
    setNewNoteId,
    retryAllPending,
    refetch: fetchAll,
    createNote,
    updateNote,
    bringToFront,
    duplicateNote,
    deleteNote,
    restoreNote,
    purgeNote
  };
}
