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
  onUpdateCard,
  onDeleteCard,
  onCopyCard,
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
    opacity: isDragging || isRemoteDragging ? 0.35 : 1
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
      className={`w-72 lg:w-76 shrink-0 flex flex-col max-h-full snap-center transition-all ${
        isOverlay ? 'shadow-2xl scale-105 rotate-1 z-50 bg-surface rounded-2xl p-2 border border-primary' : ''
      }`}
    >
      {/* Column Header (White rounded box matching reference Image 1) */}
      <div className="bg-surface border border-border-strong/70 rounded-2xl px-4 py-3 flex items-center justify-between select-none shadow-xs mb-3">
        {isEditingTitle && canEditList ? (
          <form onSubmit={handleRenameSubmit} className="flex items-center gap-1.5 flex-1 pr-2">
            <input
              type="text"
              autoFocus
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onBlur={handleRenameSubmit}
              className="w-full px-2.5 py-1 bg-surface border border-primary rounded-xl text-base text-text-primary font-bold focus:outline-none"
            />
          </form>
        ) : (
          <div
            {...attributes}
            {...listeners}
            aria-roledescription="draggable list"
            aria-label={`List: ${list.name}. Press Space or Enter to reorder.`}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-grab active:cursor-grabbing"
            title="Drag list"
          >
            <h3
              onClick={(e) => {
                if (canEditList) {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }
              }}
              className={`text-base sm:text-[17px] font-extrabold text-text-primary truncate ${canEditList ? 'hover:text-primary cursor-pointer' : 'cursor-default'}`}
            >
              {list.name}
            </h3>
            <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full bg-surface-muted text-text-secondary border border-border-strong/50 shadow-2xs">
              {cards.length}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {/* Quick Add Button in soft circle matching reference image */}
          {canCreateCard && (
            <button
              type="button"
              onClick={() => setIsAddingCard(true)}
              aria-label={`Add card to ${list.name}`}
              title={`Add card to ${list.name}`}
              className="w-7.5 h-7.5 rounded-full bg-primary-tint text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
            </button>
          )}

          {/* List Options Menu */}
          {(canEditList || canDeleteList) && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="List options"
                title="List options"
                className="w-7.5 h-7.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted flex items-center justify-center transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-4.5 h-4.5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-surface border border-border/80 rounded-2xl shadow-xl z-30 py-1.5 animate-sassy-dropdown">
                  {canEditList && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTitle(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer text-left"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-text-secondary" />
                      Rename Column
                    </button>
                  )}
                  {canDeleteList && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteList(list.id);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-danger-text hover:bg-danger-tint transition-colors cursor-pointer text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger" />
                      Delete Column
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cards List Container */}
      <div
        className="flex-1 overflow-y-auto overscroll-y-contain px-1 py-1 space-y-3 no-scrollbar"
        style={{ overscrollBehavior: 'contain' }}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onUpdateCard={onUpdateCard}
              onDeleteCard={onDeleteCard}
              onCopyCard={onCopyCard}
              isHighlighted={highlightedCardId === card.id}
              isRemoteDragging={remoteDraggedCardIds.has(card.id)}
            />
          ))}
        </SortableContext>

        {/* Inline Card Composer */}
        {isAddingCard && (
          <form onSubmit={handleAddCardSubmit} className="p-3 bg-surface border border-primary/50 rounded-2xl shadow-sm space-y-2.5 animate-in fade-in duration-150">
            <input
              type="text"
              autoFocus
              placeholder="Enter card title..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              className="w-full px-3 py-2 bg-surface-muted/50 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" size="xs" className="rounded-xl px-3 py-1.5 font-bold">
                Add Card
              </Button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Quick Add Card Button right below cards (No extra border line, clearly visible outline) */}
        {!isAddingCard && canCreateCard && (
          <button
            type="button"
            onClick={() => setIsAddingCard(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold text-text-secondary hover:text-primary bg-surface hover:bg-surface-hover border border-border-strong hover:border-primary shadow-xs transition-all cursor-pointer mt-1"
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>Add card</span>
          </button>
        )}
      </div>
    </div>
  );
}
