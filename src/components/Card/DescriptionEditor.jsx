import React, { useState, useEffect, Suspense } from 'react';
import { usePermissions } from '../../context/PermissionContext';
import { AlignLeft, Loader2, FileEdit, Maximize2 } from 'lucide-react';
import { getDraft, setDraft, clearDraft } from '../../lib/storage';
import Modal from '../shared/Modal';
import { safeLazy } from '../../lib/safeLazy';

const RichTextEditor = safeLazy(() => import('./RichTextEditor'), 'RichTextEditor');

export default function DescriptionEditor({ cardId, cardTitle = '', initialValue = '', onSave }) {
  const { hasPermission } = usePermissions();
  const canEditCard = hasPermission('task.edit');

  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (cardId) {
      const draft = getDraft(null, cardId, 'description');
      if (draft && draft !== initialValue && draft.trim()) {
        setCurrentValue(draft);
        setIsDraftRestored(true);
      } else {
        setCurrentValue(initialValue);
      }
    } else {
      setCurrentValue(initialValue);
    }
  }, [cardId, initialValue]);

  const handleSave = (html) => {
    onSave(html);
    if (cardId) clearDraft(null, cardId, 'description');
    setIsDraftRestored(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (cardId) clearDraft(null, cardId, 'description');
    setIsDraftRestored(false);
    setIsEditing(false);
  };

  const hasContent = Boolean(
    currentValue &&
    currentValue.trim() &&
    currentValue !== '<p></p>' &&
    currentValue !== '<p><br></p>'
  );

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <AlignLeft className="w-4 h-4 text-primary" />
          Description
        </h3>
        <div className="flex items-center gap-2">
          {isDraftRestored && (
            <span className="text-[10px] font-medium text-warning-text bg-warning-tint px-2 py-0.5 rounded-full flex items-center gap-1">
              <FileEdit className="w-3 h-3" />
              Draft restored
            </span>
          )}
          {hasContent && !isEditing && (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-muted hover:bg-border rounded-md transition-colors cursor-pointer"
              title="Open description preview popup"
            >
              <Maximize2 className="w-3.5 h-3.5 text-text-muted" />
              <span>Preview</span>
            </button>
          )}
          {!isEditing && canEditCard && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-muted hover:bg-border rounded-md transition-colors cursor-pointer"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {isEditing && canEditCard ? (
        <Suspense
          fallback={
            <div className="p-6 flex items-center justify-center gap-2 text-xs text-text-muted bg-surface-muted border border-border rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Loading editor...
            </div>
          }
        >
          <RichTextEditor
            initialValue={currentValue}
            cardTitle={cardTitle}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </Suspense>
      ) : (
        <div className="space-y-1.5">
          <div
            onClick={() => canEditCard && setIsEditing(true)}
            className={`p-4 bg-surface border border-border rounded-lg min-h-[90px] max-h-[220px] overflow-y-auto transition-colors ${
              canEditCard ? 'hover:bg-surface-muted/50 cursor-pointer' : 'cursor-default'
            }`}
          >
            {hasContent ? (
              <div
                className="prose prose-sm max-w-none text-text-primary"
                dangerouslySetInnerHTML={{ __html: currentValue }}
              />
            ) : (
              <p className="text-sm text-text-secondary italic">
                {canEditCard ? 'Add a more detailed description...' : 'No description provided.'}
              </p>
            )}
          </div>

          {hasContent && (
            <div className="flex items-center justify-between px-2 text-[11px] text-text-muted">
              <span>{canEditCard ? 'Click above to edit' : 'Description preview'}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                className="flex items-center gap-1 font-medium text-primary hover:text-primary-hover hover:underline cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Open Full Preview</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Description Preview Modal Popup */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-primary" />
            <span className="font-semibold text-text-primary">Description Preview</span>
            {cardTitle && (
              <span className="text-xs text-text-muted font-normal truncate max-w-xs md:max-w-md">
                — {cardTitle}
              </span>
            )}
          </div>
        }
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-text-muted">
              {cardId ? `Card #${cardId}` : ''}
            </span>
            <div className="flex items-center gap-2">
              {canEditCard && !isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setIsEditing(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-primary hover:text-primary-hover bg-primary-tint hover:bg-primary-tint/80 border border-primary/20 rounded-md transition-colors cursor-pointer"
                >
                  Edit Description
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-muted hover:bg-border rounded-md transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        <div className="max-h-[68vh] overflow-y-auto p-5 bg-surface border border-border rounded-xl">
          {hasContent ? (
            <div
              className="prose prose-sm sm:prose-base max-w-none text-text-primary"
              dangerouslySetInnerHTML={{ __html: currentValue }}
            />
          ) : (
            <p className="text-sm text-text-muted italic py-8 text-center">
              No description content to preview.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
