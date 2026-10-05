import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../context/PermissionContext';
import { Check } from 'lucide-react';

export default function CardTitle({ card, onUpdateTitle, onToggleComplete }) {
  const { hasPermission } = usePermissions();
  const canEditCard = hasPermission('card.edit');

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);

  useEffect(() => {
    setTitle(card.title);
  }, [card.title]);

  const handleSave = () => {
    if (title.trim() && title !== card.title) {
      onUpdateTitle(title.trim());
    } else {
      setTitle(card.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(card.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-start gap-3 mb-4">
      {/* Circle Complete Checkbox */}
      <button
        type="button"
        onClick={() => canEditCard && onToggleComplete(!card.is_complete)}
        disabled={!canEditCard}
        title={canEditCard ? (card.is_complete ? 'Mark incomplete' : 'Mark complete') : undefined}
        className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          canEditCard ? 'cursor-pointer' : 'cursor-default opacity-60'
        } ${
          card.is_complete
            ? 'bg-success border-success text-white shadow-xs'
            : 'border-border-strong hover:border-success bg-surface text-transparent hover:text-success/50'
        }`}
      >
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      </button>

      {/* Inline Editable Title */}
      <div className="flex-1 min-w-0">
        {isEditing && canEditCard ? (
          <input
            type="text"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full text-xl font-bold bg-surface border border-primary rounded-lg px-3 py-1 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        ) : (
          <h2
            onClick={() => canEditCard && setIsEditing(true)}
            className={`text-xl font-bold tracking-tight px-2 py-1 -ml-2 rounded-lg transition-colors ${
              canEditCard ? 'cursor-pointer hover:bg-surface-muted' : 'cursor-default'
            } ${
              card.is_complete ? 'line-through text-text-muted' : 'text-text-primary'
            }`}
          >
            {card.title}
          </h2>
        )}
      </div>
    </div>
  );
}
