import React, { useState } from 'react';
import Popover from '../shared/Popover';

export default function ChecklistPopover({ isOpen, onClose, anchorRef, onAddChecklist }) {
  const [title, setTitle] = useState('Checklist');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddChecklist(title.trim());
      setTitle('Checklist');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} title="Add Checklist" className="w-72">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Title
          </label>
          <input
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Checklist"
            className="w-full px-3 py-2 bg-surface border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="w-full py-2 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-white font-medium text-xs rounded-md shadow-xs transition-colors cursor-pointer"
        >
          {isSubmitting ? 'Adding...' : 'Add Checklist'}
        </button>
      </form>
    </Popover>
  );
}
