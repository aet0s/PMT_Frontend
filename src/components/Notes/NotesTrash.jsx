// client/src/components/Notes/NotesTrash.jsx
import React, { useState } from 'react';
import { RotateCcw, Trash2, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import { getNoteColorMeta } from './noteConstants';

export default function NotesTrash({
  trashedNotes = [],
  canManage = true,
  onRestore,
  onPurge,
  onBack
}) {
  const [confirmPurgeId, setConfirmPurgeId] = useState(null);

  return (
    <div className="flex-1 overflow-y-auto bg-surface-muted p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Trash</h2>
            <p className="text-xs text-text-secondary">
              Deleted notes are automatically purged after 30 days.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Notes
          </Button>
        </div>

        {trashedNotes.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <div className="w-11 h-11 rounded-xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5 text-text-muted" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Trash is empty</h3>
            <p className="text-xs text-text-secondary">
              Notes you delete will appear here for 30 days before permanent removal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trashedNotes.map((note) => {
              const colorMeta = getNoteColorMeta(note.color);
              return (
                <div
                  key={note.id}
                  style={{ backgroundColor: colorMeta.bgVar, borderColor: colorMeta.borderVar }}
                  className="rounded-xl border shadow-2xs p-4 flex flex-col justify-between min-h-[160px]"
                >
                  <p className="text-[14px] leading-relaxed text-text-primary whitespace-pre-wrap break-words line-clamp-5 mb-4">
                    {note.content?.trim() || <span className="italic text-text-muted">Empty note</span>}
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!canManage}
                      onClick={() => onRestore?.(note.id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Restore
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={!canManage}
                      onClick={() => setConfirmPurgeId(note.id)}
                    >
                      Delete forever
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmPurgeId)}
        onClose={() => setConfirmPurgeId(null)}
        onConfirm={() => {
          if (confirmPurgeId) onPurge?.(confirmPurgeId);
          setConfirmPurgeId(null);
        }}
        title="Delete note forever?"
        description="This note will be permanently removed and cannot be recovered."
        confirmText="Delete forever"
        variant="danger"
      />
    </div>
  );
}
