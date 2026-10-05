import React, { useState } from 'react';
import { CheckSquare, Trash2, X } from 'lucide-react';
import CustomCheckbox from '../shared/CustomCheckbox';

export default function ChecklistSection({
  checklists = [],
  onDeleteChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem
}) {
  const [newItemTexts, setNewItemTexts] = useState({});

  if (!checklists || checklists.length === 0) return null;

  const handleAddItemSubmit = async (checklistId) => {
    const text = newItemTexts[checklistId];
    if (!text || !text.trim()) return;
    try {
      await onAddChecklistItem(checklistId, text.trim());
      setNewItemTexts((prev) => ({ ...prev, [checklistId]: '' }));
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  };

  return (
    <div className="space-y-6 mb-6">
      {checklists.map((ch) => {
        const items = ch.items || [];
        const completedCount = items.filter((i) => i.is_checked).length;
        const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

        return (
          <div key={ch.id} className="space-y-3 p-4 bg-surface border border-border rounded-xl">
            {/* Checklist Title Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                {ch.title}
              </h4>
              <button
                type="button"
                onClick={() => onDeleteChecklist(ch.id)}
                className="p-1 text-text-muted hover:text-danger rounded-md hover:bg-danger-tint transition-colors cursor-pointer"
                title="Delete Checklist"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-text-secondary w-8 shrink-0">{progressPct}%</span>
              <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden border border-border">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    progressPct === 100 ? 'bg-success' : 'bg-primary'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-text-muted shrink-0">
                {completedCount}/{items.length}
              </span>
            </div>

            {/* Items List */}
            <div className="space-y-1 pl-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 hover:bg-surface-muted rounded-lg group transition-colors"
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <CustomCheckbox
                      checked={item.is_checked}
                      onChange={(checked) => onUpdateChecklistItem(item.id, { is_checked: checked })}
                      size="sm"
                    />

                    <span
                      className={`text-xs select-none truncate transition-colors ${
                        item.is_checked ? 'line-through text-text-muted' : 'text-text-primary'
                      }`}
                    >
                      {item.text}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => onDeleteChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-danger transition-opacity cursor-pointer"
                    title="Delete item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Item Input */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                type="text"
                placeholder="Add an item..."
                value={newItemTexts[ch.id] || ''}
                onChange={(e) => setNewItemTexts({ ...newItemTexts, [ch.id]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItemSubmit(ch.id);
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-surface border border-border rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => handleAddItemSubmit(ch.id)}
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium text-xs rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
