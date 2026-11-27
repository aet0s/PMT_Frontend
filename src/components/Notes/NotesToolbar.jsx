// client/src/components/Notes/NotesToolbar.jsx
import React from 'react';
import {
  Plus,
  LayoutGrid,
  List,
  CheckCircle2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import Button from '../ui/Button';
import Tooltip from '../ui/Tooltip';

export default function NotesToolbar({
  viewMode = 'board',
  onViewModeChange,
  onCreateNote,
  canManage = true,
  saveStatus = 'saved', // 'saved' | 'saving' | 'error'
  onRetrySave
}) {
  return (
    <header className="bg-surface border-b border-border px-4 sm:px-6 py-3 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Subtitle + Save Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-text-primary leading-tight">Notes</h1>
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving…
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <button
                  type="button"
                  onClick={onRetrySave}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-danger hover:underline cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Not saved, retrying
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted">Your private notes. Only you can see them.</p>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-2.5">
          {/* Board / List Toggle */}
          <div className="inline-flex items-center bg-surface-muted border border-border rounded-lg p-0.5" role="group" aria-label="View mode">
            <Tooltip content="Freeform board view">
              <button
                type="button"
                aria-label="Board view"
                aria-pressed={viewMode === 'board'}
                onClick={() => onViewModeChange?.('board')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-surface text-text-primary shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Board</span>
              </button>
            </Tooltip>
            <Tooltip content="List grid view">
              <button
                type="button"
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                onClick={() => onViewModeChange?.('list')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-surface text-text-primary shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </Tooltip>
          </div>

          {/* + New Note Primary Button */}
          <Tooltip content={canManage ? 'Create a new note' : 'View-only permission'}>
            <span>
              <Button
                variant="primary"
                size="sm"
                disabled={!canManage}
                onClick={onCreateNote}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>New note</span>
                </span>
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
