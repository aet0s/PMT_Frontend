import React, { useState, useRef, useEffect } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePermissions } from '../../context/PermissionContext';
import Card from './Card';
import Button from '../ui/Button';
import { Plus, MoreHorizontal, Trash2, Edit3, X, AlertTriangle, SlidersHorizontal } from 'lucide-react';

export default function List({
  list,
  cards = [],
  wipLimitEnabled = true,
  wipLimitMax = 5,
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
  isRemoteDragging = false,
  taskNumberMap
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
  const canCreateCard = hasPermission('task.create');

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [listName, setListName] = useState(list.name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [customWipInput, setCustomWipInput] = useState(list.wip_limit ? String(list.wip_limit) : '');
  const menuRef = useRef(null);

  useEffect(() => {
    setCustomWipInput(list.wip_limit ? String(list.wip_limit) : '');
  }, [list.wip_limit]);

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

  // List-level WIP Limit calculation
  const isListWipEnabled = wipLimitEnabled && (
    list.wip_limit_enabled !== undefined && list.wip_limit_enabled !== null
      ? (list.wip_limit_enabled === 1 || list.wip_limit_enabled === true)
      : !/^(done|completed|finished|closed|released|shipped|archive)/i.test(list.name.trim())
  );
  const effectiveWipMax = list.wip_limit ? Number(list.wip_limit) : wipLimitMax;
  const isWipExceeded = isListWipEnabled && effectiveWipMax > 0 && cards.length > effectiveWipMax;

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
            <span
              onClick={() => {
                if (canEditList) setIsMenuOpen((prev) => !prev);
              }}
              className={`text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full border shadow-2xs transition-colors ${
                canEditList ? 'cursor-pointer hover:ring-2 hover:ring-primary/20' : ''
              } ${
                isWipExceeded
                  ? 'bg-danger text-white border-danger font-black animate-pulse'
                  : 'bg-surface-muted text-text-secondary border-border-strong/50'
              }`}
              title={
                canEditList
                  ? (isListWipEnabled
                      ? `WIP Limit: ${cards.length}/${effectiveWipMax} cards (Click to configure)`
                      : `${cards.length} cards (WIP limit is OFF - click to configure)`)
                  : (isWipExceeded
                      ? `WIP Limit Exceeded: ${cards.length} cards (Limit: ${effectiveWipMax})`
                      : undefined)
              }
            >
              {isListWipEnabled && effectiveWipMax > 0 ? `${cards.length}/${effectiveWipMax}` : cards.length}
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
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-surface border border-border/80 rounded-2xl shadow-xl z-30 py-2 animate-sassy-dropdown">
                  {canEditList && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTitle(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer text-left"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-text-secondary" />
                      Rename Column
                    </button>
                  )}

                  {canEditList && (
                    <div className="border-t border-border/40 my-1 pt-1">
                      {/* WIP Limit Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateList(list.id, { wip_limit_enabled: !isListWipEnabled });
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer text-left"
                        title={isListWipEnabled ? 'Turn OFF WIP limit for this column' : 'Turn ON WIP limit for this column'}
                      >
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-text-secondary" />
                          <span>WIP Limit</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                            isListWipEnabled
                              ? 'bg-primary text-white shadow-2xs'
                              : 'bg-surface-muted text-text-muted border border-border/80'
                          }`}
                        >
                          {isListWipEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      {/* Custom Limit Input when WIP is ON */}
                      {isListWipEnabled && (
                        <div className="px-3.5 py-2 mx-1.5 rounded-xl bg-surface-muted/60 border border-border/60 mt-1">
                          <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium text-text-secondary">
                            <span>Max cards:</span>
                            <span className="text-[10px] text-text-muted">
                              {list.wip_limit ? 'Custom' : `Default (${wipLimitMax})`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max="999"
                              placeholder={String(wipLimitMax)}
                              value={customWipInput}
                              onChange={(e) => setCustomWipInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = customWipInput.trim() === '' ? null : Number(customWipInput);
                                  if (val === null || (Number.isInteger(val) && val > 0)) {
                                    onUpdateList(list.id, { wip_limit: val });
                                  }
                                }
                              }}
                              className="w-16 px-2 py-1 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = customWipInput.trim() === '' ? null : Number(customWipInput);
                                if (val === null || (Number.isInteger(val) && val > 0)) {
                                  onUpdateList(list.id, { wip_limit: val });
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors cursor-pointer shadow-2xs"
                            >
                              Save
                            </button>
                            {list.wip_limit && (
                              <button
                                type="button"
                                title="Reset to default"
                                onClick={() => {
                                  setCustomWipInput('');
                                  onUpdateList(list.id, { wip_limit: null });
                                }}
                                className="px-1.5 py-1 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {canDeleteList && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteList(list.id);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-danger-text hover:bg-danger-tint transition-colors cursor-pointer text-left border-t border-border/40 mt-1 pt-1.5"
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

      {/* WIP Limit Alert Banner */}
      {isWipExceeded && (
        <div
          role="alert"
          aria-live="assertive"
          className="mx-1 mb-2.5 px-3 py-2 rounded-xl bg-danger-tint text-danger-text border border-danger/40 text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in slide-in-from-top-1"
        >
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 animate-bounce" />
          <span className="truncate">WIP limit exceeded ({cards.length} &gt; {effectiveWipMax} max)</span>
        </div>
      )}

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
              taskNumber={taskNumberMap?.get(card.id) ?? card.task_number}
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
