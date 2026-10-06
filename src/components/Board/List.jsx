import React, { useState, useRef, useEffect } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePermissions } from '../../context/PermissionContext';
import Card from './Card';
import Button from '../ui/Button';
import { Plus, MoreHorizontal, Trash2, Edit3, X } from 'lucide-react';

export default function List({
  list,
  cards = [],
  onCardClick,
  onCreateCard,
  onUpdateList,
  onDeleteList,
  isOverlay = false,
  highlightedCardId = null,
  remoteDraggedCardIds = new Set(),
  isRemoteDragging = false
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `list-${list.id}`,
    data: { type: 'list', list }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isRemoteDragging ? 0.3 : 1
  };

  const { hasPermission } = usePermissions();
  const canEditList = hasPermission('list.edit');
  const canDeleteList = hasPermission('list.delete');
  const canCreateCard = hasPermission('card.create');

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [listName, setListName] = useState(list.name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleAddCardSubmit = async (e) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    try {
      await onCreateCard(list.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    } catch (err) {
      console.error('Failed to add card:', err);
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!listName.trim() || listName === list.name) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await onUpdateList(list.id, { name: listName.trim() });
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to rename list:', err);
    }
  };

  const cardIds = cards.map((c) => `card-${c.id}`);

  return (
    <div
      id={`list-${list.id}`}
      ref={setNodeRef}
      style={style}
      className={`w-72 shrink-0 bg-surface-muted/90 border border-border rounded-xl flex flex-col max-h-full shadow-sm snap-center ${
        isOverlay ? 'border-primary shadow-xl scale-105 rotate-1 z-50 bg-surface' : ''
      }`}
    >
      {/* List Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-border select-none">
        {isEditingTitle && canEditList ? (
          <form onSubmit={handleRenameSubmit} className="flex items-center gap-1.5 flex-1 pr-2">
            <input
              type="text"
              autoFocus
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onBlur={handleRenameSubmit}
              className="w-full px-2 py-1 bg-surface border border-primary rounded-md text-sm text-text-primary font-semibold focus:outline-none"
            />
          </form>
        ) : (
          <div
            {...attributes}
            {...listeners}
            aria-roledescription="draggable list"
            aria-label={`List: ${list.name}. Press Space or Enter to reorder.`}
            className="flex items-center gap-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing"
            title="Drag list"
          >
            <h3
              onClick={(e) => {
                if (canEditList) {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }
              }}
              className={`text-sm font-bold text-text-primary truncate ${canEditList ? 'hover:text-primary cursor-pointer' : 'cursor-default'}`}
            >
              {list.name}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.2 rounded-full bg-surface border border-border text-text-secondary">
              {cards.length}
            </span>
          </div>
        )}

        {(canEditList || canDeleteList) && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="List options"
              title="List options"
              className="p-1 text-text-muted hover:text-text-primary hover:bg-surface rounded-md transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-surface border border-border rounded-xl shadow-lg z-30 py-1">
                {canEditList && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTitle(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-muted transition-colors cursor-pointer text-left"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-text-secondary" />
                    Rename List
                  </button>
                )}
                {canDeleteList && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteList(list.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-danger-text hover:bg-danger-tint transition-colors cursor-pointer text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                    Delete List
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[60px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              isHighlighted={Number(highlightedCardId) === card.id}
              isRemoteDragging={Boolean(remoteDraggedCardIds && remoteDraggedCardIds.has(card.id))}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add Card Footer */}
      {canCreateCard && (
        <div className="p-2.5 border-t border-border bg-surface/50">
          {isAddingCard ? (
            <form onSubmit={handleAddCardSubmit} className="space-y-2">
              <textarea
                autoFocus
                required
                rows={2}
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Enter card title..."
                className="w-full p-2.5 bg-surface border border-border rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 resize-none shadow-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddCardSubmit(e);
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Add Card
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCard(false);
                    setNewCardTitle('');
                  }}
                  className="p-1.5 text-text-muted hover:text-text-primary rounded-md transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingCard(true)}
              className="w-full flex items-center gap-2 p-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-primary" />
              Add a card
            </button>
          )}
        </div>
      )}
    </div>
  );
}
