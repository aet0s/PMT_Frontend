// client/src/pages/NotesPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUserPref, setUserPref } from '../lib/storage';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../components/ui/Toast';
import Skeleton from '../components/ui/Skeleton';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import AccessDeniedPage from './AccessDeniedPage';
import NotesToolbar from '../components/Notes/NotesToolbar';
import NotesBoard from '../components/Notes/NotesBoard';
import NotesListView from '../components/Notes/NotesListView';
import NotesTrash from '../components/Notes/NotesTrash';
import {
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  ZOOM_STEP,
  clampZoom,
  clampNotePosition
} from '../components/Notes/noteConstants';
import { useNotes } from '../hooks/useNotes';

export default function NotesPage() {
  const { hasPermission, loading: permLoading } = usePermissions();
  const canView = hasPermission('notes.view_own');
  const canManage = hasPermission('notes.manage_own');
  const toast = useToast();

  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
  const [viewMode, setViewMode] = useState(() =>
    getUserPref('notes_view_mode', isMobileViewport ? 'list' : 'board')
  );
  const [zoom, setZoom] = useState(() => clampZoom(getUserPref('notes_zoom', 1)));
  const [pan, setPan] = useState(() => getUserPref('notes_pan', { x: 0, y: 0 }));
  const [searchQuery, setSearchQuery] = useState(() => getUserPref('notes_search', ''));
  const [colorFilter, setColorFilter] = useState(() => getUserPref('notes_color_filter', null));
  const [showTrash, setShowTrash] = useState(false);

  const viewportRef = useRef(null);
  const cascadeCountRef = useRef(0);

  const {
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
  } = useNotes({ canView, canManage });

  useEffect(() => {
    document.title = 'Notes | TaskFlow';
  }, []);

  useEffect(() => { setUserPref('notes_view_mode', viewMode); }, [viewMode]);
  useEffect(() => { setUserPref('notes_zoom', zoom); }, [zoom]);
  useEffect(() => { setUserPref('notes_pan', pan); }, [pan]);
  useEffect(() => { setUserPref('notes_search', searchQuery); }, [searchQuery]);
  useEffect(() => { setUserPref('notes_color_filter', colorFilter); }, [colorFilter]);

  const handleCreateCenter = useCallback((explicitX, explicitY) => {
    if (!canManage) return;
    let x = explicitX;
    let y = explicitY;
    if (x === undefined || y === undefined) {
      const rect = viewportRef.current?.getBoundingClientRect();
      const offset = (cascadeCountRef.current % 6) * 24;
      cascadeCountRef.current += 1;
      if (rect) {
        const centerX = (rect.width / 2 - pan.x) / zoom - DEFAULT_NOTE_WIDTH / 2 + offset;
        const centerY = (rect.height / 2 - pan.y) / zoom - DEFAULT_NOTE_HEIGHT / 2 + offset;
        const clamped = clampNotePosition(centerX, centerY, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT);
        x = clamped.x;
        y = clamped.y;
      } else {
        x = 160 + offset;
        y = 120 + offset;
      }
    }
    createNote({ x, y, color: colorFilter || 'yellow', content: '' });
  }, [canManage, pan.x, pan.y, zoom, colorFilter, createNote]);

  const handleDeleteWithUndo = useCallback((id) => {
    if (!canManage) return;
    deleteNote(id);
    toast?.info?.('Note moved to Trash', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => restoreNote(id)
      }
    });
  }, [canManage, deleteNote, restoreNote, toast]);

  const handleBlurEmpty = useCallback((id) => {
    if (newNoteId === id) {
      setNewNoteId(null);
    }
    const target = notes.find((n) => n.id === id);
    if (target && !(target.content || '').trim()) {
      deleteNote(id, { silent: true });
    }
  }, [newNoteId, setNewNoteId, notes, deleteNote]);

  if (!permLoading && !canView) {
    return <AccessDeniedPage />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-muted overflow-hidden">
      <NotesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        colorFilter={colorFilter}
        onColorFilterChange={setColorFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showTrash={showTrash}
        onToggleTrash={() => setShowTrash((v) => !v)}
        trashCount={trashedNotes.length}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
        onZoomOut={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
        onZoomReset={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}
        onCreateNote={() => handleCreateCenter()}
        canManage={canManage}
        saveStatus={saveStatus}
      />

      {error && (
        <div className="px-4 sm:px-6 pt-3">
          <Alert variant="danger" title="Could not load notes">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
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
      ) : showTrash ? (
        <NotesTrash
          trashedNotes={trashedNotes}
          canManage={canManage}
          onRestore={restoreNote}
          onPurge={purgeNote}
          onBack={() => setShowTrash(false)}
        />
      ) : viewMode === 'list' ? (
        <NotesListView
          notes={notes}
          allNotesCount={notes.length}
          canManage={canManage}
          searchQuery={searchQuery}
          colorFilter={colorFilter}
          newNoteId={newNoteId}
          onCreateNote={() => handleCreateCenter()}
          onChangeContent={(id, content) => updateNote(id, { content })}
          onChangeColor={(id, color) => updateNote(id, { color })}
          onTogglePin={(id, is_pinned) => updateNote(id, { is_pinned })}
          onDuplicate={duplicateNote}
          onDelete={handleDeleteWithUndo}
          onBlurEmpty={handleBlurEmpty}
          onClearFilters={() => {
            setSearchQuery('');
            setColorFilter(null);
          }}
        />
      ) : (
        <NotesBoard
          viewportRef={viewportRef}
          notes={notes}
          allNotesCount={notes.length}
          zoom={zoom}
          pan={pan}
          onZoomChange={setZoom}
          onPanChange={setPan}
          canManage={canManage}
          searchQuery={searchQuery}
          colorFilter={colorFilter}
          newNoteId={newNoteId}
          onCreateAt={handleCreateCenter}
          onBringToFront={bringToFront}
          onChangeContent={(id, content) => updateNote(id, { content })}
          onCommitPosition={(id, x, y) => updateNote(id, { x, y })}
          onCommitSize={(id, width, height) => updateNote(id, { width, height })}
          onChangeColor={(id, color) => updateNote(id, { color })}
          onTogglePin={(id, is_pinned) => updateNote(id, { is_pinned })}
          onDuplicate={duplicateNote}
          onDelete={handleDeleteWithUndo}
          onBlurEmpty={handleBlurEmpty}
          onClearFilters={() => {
            setSearchQuery('');
            setColorFilter(null);
          }}
        />
      )}
    </div>
  );
}
