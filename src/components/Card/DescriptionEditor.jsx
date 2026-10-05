import React, { useState, useEffect, Suspense } from 'react';
import { usePermissions } from '../../context/PermissionContext';
import { AlignLeft, Loader2, FileEdit } from 'lucide-react';
import { getDraft, setDraft, clearDraft } from '../../lib/storage';

const RichTextEditor = React.lazy(() => import('./RichTextEditor'));

export default function DescriptionEditor({ cardId, initialValue = '', onSave }) {
  const { hasPermission } = usePermissions();
  const canEditCard = hasPermission('card.edit');

  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

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
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </Suspense>
      ) : (
        <div
          onClick={() => canEditCard && setIsEditing(true)}
          className={`p-4 bg-surface border border-border rounded-lg min-h-[90px] transition-colors ${
            canEditCard ? 'hover:bg-surface-muted/50 cursor-pointer' : 'cursor-default'
          }`}
        >
          {currentValue && currentValue !== '<p></p>' ? (
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
      )}
    </div>
  );
}
