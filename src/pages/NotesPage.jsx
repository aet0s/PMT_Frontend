// client/src/pages/NotesPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUserPref, setUserPref } from '../lib/storage';
import { usePermissions } from '../context/PermissionContext';
import Skeleton from '../components/ui/Skeleton';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import AccessDeniedPage from './AccessDeniedPage';
import NotesToolbar from '../components/Notes/NotesToolbar';
import NotesBoard from '../components/Notes/NotesBoard';
import NotesListView from '../components/Notes/NotesListView';
import {
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT
} from '../components/Notes/noteConstants';
import { useNotes } from '../hooks/useNotes';

export default function NotesPage() {
  const { hasPermission, loading: permLoading } = usePermissions();
  const canView = hasPermission('notes.view_own');
  const canManage = hasPermission('notes.manage_own');

  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
  const [viewMode, setViewMode] = useState(() =>
    getUserPref('notes_view_mode', isMobileViewport ? 'list' : 'board')
  );

  const viewportRef = useRef(null);
  const cascadeCountRef = useRef(0);

  const {
    notes,
    loading,
    error,
    permissionRevoked,
    saveStatus,
    newNoteId,
    setNewNoteId,
    retryAllPending,
    refetch,
    createNote,
    updateNote,
    bringToFront,
    duplicateNote,
    deleteNote
  } = useNotes({ canView, canManage });

  useEffect(() => {
    document.title = 'Notes | TaskFlow';
  }, []);

  useEffect(() => { setUserPref('notes_view_mode', viewMode); }, [viewMode]);

  const handleCreateCenter = useCallback((explicitX, explicitY) => {
    if (!canManage) return;
    let x = explicitX;
    let y = explicitY;
    if (x === undefined || y === undefined) {
      const rect = viewportRef.current?.getBoundingClientRect();
      const offset = (cascadeCountRef.current % 6) * 24;
      cascadeCountRef.current += 1;
      if (rect) {
        const pad = 8;
        const maxX = Math.max(pad, rect.width - DEFAULT_NOTE_WIDTH - pad);
        const maxY = Math.max(pad, rect.height - DEFAULT_NOTE_HEIGHT - pad);
        x = Math.round(Math.min(maxX, Math.max(pad, rect.width / 2 - DEFAULT_NOTE_WIDTH / 2 + offset)));
        y = Math.round(Math.min(maxY, Math.max(pad, rect.height / 2 - DEFAULT_NOTE_HEIGHT / 2 + offset)));
      } else {
        x = 160 + offset;
        y = 120 + offset;
      }
    }
    createNote({ x, y, color: 'sky', content: '' });
  }, [canManage, createNote]);

  const handleBlurEmpty = useCallback((id) => {
    if (newNoteId === id) {
      setNewNoteId(null);
    }
    const target = notes.find((n) => n.id === id);
    if (target && !(target.content || '').trim()) {
      deleteNote(id);
    }
  }, [newNoteId, setNewNoteId, notes, deleteNote]);

  if (!permLoading && (!canView || permissionRevoked)) {
    return <AccessDeniedPage />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-muted overflow-hidden">
      <NotesToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateNote={() => handleCreateCenter()}
        canManage={canManage}
        saveStatus={saveStatus}
        onRetrySave={retryAllPending}
      />

      {error && (
        <div className="px-4 sm:px-6 pt-3">
          <Alert variant="danger" title="Could not load notes">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {loading ? (
        <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 content-start">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <NotesListView
          notes={notes}
          allNotesCount={notes.length}
          canManage={canManage}
          newNoteId={newNoteId}
          onCreateNote={() => handleCreateCenter()}
          onChangeContent={(id, content) => updateNote(id, { content })}
          onTogglePin={(id, is_pinned) => updateNote(id, { is_pinned }, { immediate: true })}
          onDuplicate={duplicateNote}
          onDelete={deleteNote}
          onBlurEmpty={handleBlurEmpty}
        />
      ) : (
        <NotesBoard
          viewportRef={viewportRef}
          notes={notes}
          allNotesCount={notes.length}
          canManage={canManage}
          newNoteId={newNoteId}
          onCreateAt={handleCreateCenter}
          onBringToFront={bringToFront}
          onChangeContent={(id, content) => updateNote(id, { content })}
          onCommitPosition={(id, x, y) => updateNote(id, { x, y }, { immediate: true })}
          onCommitSize={(id, width, height) => updateNote(id, { width, height }, { immediate: true })}
          onTogglePin={(id, is_pinned) => updateNote(id, { is_pinned }, { immediate: true })}
          onDuplicate={duplicateNote}
          onDelete={deleteNote}
          onBlurEmpty={handleBlurEmpty}
        />
      )}
    </div>
  );
}
