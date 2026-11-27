// client/src/components/Notes/NotesToolbar.jsx
import React from 'react';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  CheckCircle2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import Tooltip from '../ui/Tooltip';
import { NOTE_COLOR_LIST, MIN_ZOOM, MAX_ZOOM } from './noteConstants';

export default function NotesToolbar({
  searchQuery = '',
  onSearchChange,
  colorFilter = null,
  onColorFilterChange,
  viewMode = 'board',
  onViewModeChange,
  showTrash = false,
  onToggleTrash,
  trashCount = 0,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onCreateNote,
  canManage = true,
  saveStatus = 'saved', // 'saved' | 'saving' | 'error'
  onRetrySave
}) {
  const zoomPct = Math.round(zoom * 100);

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
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search notes..."
              aria-label="Search notes"
              className="w-full h-8 pl-8 pr-7 text-xs bg-surface-muted border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange?.('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Colour filter chips */}
          {!showTrash && (
            <div className="hidden md:flex items-center gap-1 px-1.5 py-1 bg-surface-muted border border-border rounded-lg" role="group" aria-label="Filter by colour">
              {NOTE_COLOR_LIST.map((c) => {
                const active = colorFilter === c.key;
                return (
                  <Tooltip key={c.key} content={active ? `Clear ${c.label} filter` : `Filter ${c.label}`}>
                    <button
                      type="button"
                      aria-label={`Filter ${c.label}`}
                      aria-pressed={active}
                      onClick={() => onColorFilterChange?.(active ? null : c.key)}
                      style={{ backgroundColor: c.bgVar, borderColor: c.dotVar }}
                      className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                        active ? 'scale-125 ring-2 ring-primary ring-offset-1' : 'hover:scale-110'
                      }`}
                    />
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Board / List Toggle */}
          {!showTrash && (
            <div className="inline-flex items-center bg-surface-muted border border-border rounded-lg p-0.5" role="group" aria-label="View mode">
              <Tooltip content="Freeform board view">
                <button
                  type="button"
                  aria-label="Board view"
                  aria-pressed={viewMode === 'board'}
                  onClick={() => onViewModeChange?.('board')}
                  className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
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
                  className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
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
          )}

          {/* Compact Zoom Controls (Board mode only) */}
          {!showTrash && viewMode === 'board' && (
            <div className="hidden sm:inline-flex items-center bg-surface-muted border border-border rounded-lg px-1 py-0.5 gap-0.5">
              <Tooltip content="Zoom out">
                <IconButton
                  icon={<ZoomOut className="w-3.5 h-3.5" />}
                  size="sm"
                  aria-label="Zoom out"
                  disabled={zoom <= MIN_ZOOM}
                  onClick={onZoomOut}
                />
              </Tooltip>
              <span className="text-[11px] font-semibold text-text-secondary w-10 text-center tabular-nums">
                {zoomPct}%
              </span>
              <Tooltip content="Zoom in">
                <IconButton
                  icon={<ZoomIn className="w-3.5 h-3.5" />}
                  size="sm"
                  aria-label="Zoom in"
                  disabled={zoom >= MAX_ZOOM}
                  onClick={onZoomIn}
                />
              </Tooltip>
              <Tooltip content="Reset view">
                <IconButton
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  size="sm"
                  aria-label="Reset view"
                  onClick={onZoomReset}
                />
              </Tooltip>
            </div>
          )}

          {/* Trash Toggle */}
          <Tooltip content={showTrash ? 'Back to Notes' : 'View Trash'}>
            <Button
              variant={showTrash ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onToggleTrash}
              aria-pressed={showTrash}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Trash{trashCount > 0 ? ` (${trashCount})` : ''}</span>
            </Button>
          </Tooltip>

          {/* + New Note Primary Button */}
          {!showTrash && (
            <Tooltip content={canManage ? 'Create a new note' : 'View-only permission'}>
              <span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canManage}
                  onClick={onCreateNote}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New note
                </Button>
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}
