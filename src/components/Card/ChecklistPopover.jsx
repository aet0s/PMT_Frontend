import React, { useState } from 'react';
import Popover from '../shared/Popover';
import { Plus, X, ListChecks } from 'lucide-react';

export default function ChecklistPopover({ isOpen, onClose, anchorRef, onAddChecklist }) {
  const [title, setTitle] = useState('Checklist');
  const [currentItem, setCurrentItem] = useState('');
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = (e) => {
    e?.preventDefault();
    if (!currentItem.trim()) return;
    setItems((prev) => [...prev, currentItem.trim()]);
    setCurrentItem('');
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    // If user has typed something in the currentItem input but didn't press "Add", include it
    let finalItems = [...items];
    if (currentItem.trim()) {
      finalItems.push(currentItem.trim());
    }

    if (finalItems.length === 0) return;

    setIsSubmitting(true);
    try {
      await onAddChecklist(title.trim(), finalItems);
      setTitle('Checklist');
      setCurrentItem('');
      setItems([]);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = title.trim() && (items.length > 0 || currentItem.trim());

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} title="Add Checklist" className="w-80">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Checklist Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Definition of Done, Tasks"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Checklist Items <span className="text-danger">*</span>
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={currentItem}
              onChange={(e) => setCurrentItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              placeholder="Add an item and press Enter..."
              className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 text-xs"
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!currentItem.trim()}
              className="px-2.5 py-2 bg-surface-muted hover:bg-surface border border-border disabled:opacity-40 text-text-primary font-medium text-xs rounded-lg transition-colors cursor-pointer shrink-0"
              title="Add item to list"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Checklists require at least one item.
          </p>
        </div>

        {/* Added Items Preview */}
        {items.length > 0 && (
          <div className="space-y-1 max-h-36 overflow-y-auto p-1.5 bg-surface-muted rounded-lg border border-border">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-1.5 bg-surface rounded border border-border/60 text-xs"
              >
                <span className="flex items-center gap-1.5 truncate text-text-primary min-w-0">
                  <ListChecks className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{it}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-0.5 text-text-muted hover:text-danger rounded transition-colors cursor-pointer shrink-0"
                  title="Remove item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className="w-full py-2 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? 'Adding...' : `Add Checklist (${items.length + (currentItem.trim() ? 1 : 0)} items)`}
        </button>
      </form>
    </Popover>
  );
}
