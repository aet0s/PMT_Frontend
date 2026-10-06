import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, NavLink, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import List from './List';
import Card from './Card';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import BoardActivityDrawer from './BoardActivityDrawer';
import NotificationBell from '../Notifications/NotificationBell';
import { PALETTES, getBoardBgClass } from '../../lib/palettes';
import { useBoardSocket } from '../../hooks/useBoardSocket';
import { useSocket } from '../../context/SocketProvider';
import { usePermissions } from '../../context/PermissionContext';
import { matchesCardFilter } from '../../lib/filterCards';

import {
  Plus,
  Search,
  ShieldCheck,
  Activity,
  X,
  Palette,
  MoreHorizontal,
  Archive,
  Trash2,
  Pencil,
  Check,
  Menu,
  MousePointer2
} from 'lucide-react';

export default function Board({
  board,
  onUpdateBoard,
  onArchiveBoard,
  onDeleteBoard,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onCardClick,
  onCreateCard,
  onUpdateCardPosition,
  onUpdateListPosition,
  onAddBoardMember,
  onInviteClick,
  onRefreshBoard,
  onOpenMobileSidebar,
  onSelectNotificationCard,
  onOpenAllNotifications,
  onBoardSocketEvent
}) {
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  const { workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filters state (synchronized with URL query params)
  const searchQuery = searchParams.get('search') || '';
  const filterMemberId = searchParams.get('member') ? Number(searchParams.get('member')) : null;
  const filterLabelId = searchParams.get('label') ? Number(searchParams.get('label')) : null;
  const filterDueDate = searchParams.get('due') || 'all';

  const setSearchQuery = (val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('search', val);
      else next.delete('search');
      return next;
    });
  };

  const setFilterMemberId = (val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('member', String(val));
      else next.delete('member');
      return next;
    });
  };

  const setFilterLabelId = (val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('label', String(val));
      else next.delete('label');
      return next;
    });
  };

  const setFilterDueDate = (val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && val !== 'all') next.set('due', val);
      else next.delete('due');
      return next;
    });
  };

  // Mobile list view switcher state ('all' | listId)
  const [activeMobileListId, setActiveMobileListId] = useState('all');

  // Socket & Live Multiplayer Drag Cursors State
  const { socket } = useSocket();
  const [remoteDragCursors, setRemoteDragCursors] = useState({});

  // Remote teammate drag cursor updates
  useEffect(() => {
    if (!socket) return;

    const handleRemoteDragging = (data) => {
      if (!data || !data.socketId) return;
      setRemoteDragCursors((prev) => ({
        ...prev,
        [data.socketId]: {
          ...data,
          lastUpdate: Date.now()
        }
      }));
    };

    const handleRemoteDragEnded = (data) => {
      if (!data || !data.socketId) return;
      setRemoteDragCursors((prev) => {
        const next = { ...prev };
        delete next[data.socketId];
        return next;
      });
    };

    socket.on('card:dragging', handleRemoteDragging);
    socket.on('card:drag_ended', handleRemoteDragEnded);
    socket.on('list:dragging', handleRemoteDragging);
    socket.on('list:drag_ended', handleRemoteDragEnded);

    return () => {
      socket.off('card:dragging', handleRemoteDragging);
      socket.off('card:drag_ended', handleRemoteDragEnded);
      socket.off('list:dragging', handleRemoteDragging);
      socket.off('list:drag_ended', handleRemoteDragEnded);
    };
  }, [socket]);

  // Local card drag pointer tracking & streaming
  useEffect(() => {
    if (!activeId || activeItem?.type !== 'card' || !socket || !board?.id) return;

    let lastEmit = 0;
    const handlePointerMove = (e) => {
      const now = Date.now();
      if (now - lastEmit < 30) return; // ~30fps smooth streaming
      lastEmit = now;

      socket.emit('card_drag_move', {
        boardId: board.id,
        cardId: activeItem.card.id,
        cardTitle: activeItem.card.title,
        card: activeItem.card,
        x: e.clientX,
        y: e.clientY
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      socket.emit('card_drag_end', { boardId: board.id, cardId: activeItem.card.id });
    };
  }, [activeId, activeItem, socket, board?.id]);

  // Local list drag pointer tracking & streaming
  useEffect(() => {
    if (!activeId || activeItem?.type !== 'list' || !socket || !board?.id) return;

    let lastEmit = 0;
    const handlePointerMove = (e) => {
      const now = Date.now();
      if (now - lastEmit < 30) return; // ~30fps smooth streaming
      lastEmit = now;

      socket.emit('list_drag_move', {
        boardId: board.id,
        listId: activeItem.list.id,
        list: activeItem.list,
        x: e.clientX,
        y: e.clientY
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      socket.emit('list_drag_end', { boardId: board.id, listId: activeItem.list.id });
    };
  }, [activeId, activeItem, socket, board?.id]);

  // Real-time socket & presence
  const { onlineMembers, highlightedCardId } = useBoardSocket(
    board?.id,
    (eventName, data) => {
      if (onBoardSocketEvent) onBoardSocketEvent(eventName, data);
      else if (onRefreshBoard) onRefreshBoard();
    },
    onRefreshBoard
  );

  // UI Drawers & Modals
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberEmailInput, setMemberEmailInput] = useState('');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false);
  const [boardTitleInput, setBoardTitleInput] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);

  const boardMenuRef = useRef(null);
  const paletteRef = useRef(null);
  const paletteButtonRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(event.target)) {
        setIsBoardMenuOpen(false);
      }
      if (
        paletteRef.current &&
        !paletteRef.current.contains(event.target) &&
        paletteButtonRef.current &&
        !paletteButtonRef.current.contains(event.target)
      ) {
        setIsPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const { hasPermission } = usePermissions();
  const canEditBoard = hasPermission('board.edit_settings') || hasPermission('project.edit_settings');
  const canDeleteBoard = hasPermission('board.delete') || hasPermission('project.delete');
  const canArchiveBoard = hasPermission('board.archive') || hasPermission('project.archive') || canEditBoard;
  const canManageBoardMembers = hasPermission('board.manage_members') || hasPermission('project.manage_members');
  const canCreateList = hasPermission('list.create');

  const handleStartRename = () => {
    if (!canEditBoard) return;
    setBoardTitleInput(board?.name || '');
    setIsEditingBoardTitle(true);
    setIsBoardMenuOpen(false);
  };

  const handleSaveRename = () => {
    if (boardTitleInput.trim() && boardTitleInput.trim() !== board.name) {
      onUpdateBoard(board.id, { name: boardTitleInput.trim() });
    }
    setIsEditingBoardTitle(false);
  };

  // Sensors configuration with Pointer, Touch, and Keyboard sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  if (!board) return null;

  // Filter cards logic using shared filter helper
  const filterCard = (card) =>
    matchesCardFilter(card, {
      searchQuery,
      filterMemberId,
      filterLabelId,
      filterDueDate
    });

  const listsWithFilteredCards = (board.lists || []).map((l) => ({
    ...l,
    cards: (l.cards || []).filter(filterCard)
  }));

  const visibleLists =
    activeMobileListId === 'all'
      ? listsWithFilteredCards
      : listsWithFilteredCards.filter((l) => String(l.id) === activeMobileListId);

  const listIds = visibleLists.map((l) => `list-${l.id}`);

  // Unique labels on this board
  const uniqueLabels = (board.labels || []).filter(
    (label, index, self) => index === self.findIndex((l) => l.id === label.id)
  );

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    setActiveItem(active.data.current);
  };

  const announcements = {
    onDragStart({ active }) {
      if (active.data.current?.type === 'card') {
        const card = active.data.current.card;
        return `Picked up card "${card?.title || 'Card'}". Use arrow keys to navigate, Space or Enter to drop, Escape to cancel.`;
      }
      if (active.data.current?.type === 'list') {
        const list = active.data.current.list;
        return `Picked up list "${list?.name || 'List'}". Use arrow keys to navigate, Space or Enter to drop, Escape to cancel.`;
      }
      return `Picked up item.`;
    },
    onDragOver({ active, over }) {
      if (!over) return '';
      if (active.data.current?.type === 'card') {
        const card = active.data.current.card;
        if (over.data.current?.type === 'list') {
          return `Card "${card?.title}" moved over list "${over.data.current.list?.name}".`;
        }
        if (over.data.current?.type === 'card') {
          return `Card "${card?.title}" moved over card "${over.data.current.card?.title}".`;
        }
      }
      return '';
    },
    onDragEnd({ active, over }) {
      if (!over) {
        return 'Movement cancelled. Item dropped in original position.';
      }
      if (active.data.current?.type === 'card') {
        const card = active.data.current.card;
        const activeCardId = Number(String(active.id).replace('card-', ''));
        let targetList = null;
        let targetIndex = 1;
        let totalCards = 1;

        if (String(over.id).startsWith('list-')) {
          const targetListId = Number(String(over.id).replace('list-', ''));
          targetList = (board.lists || []).find((l) => l.id === targetListId);
          const remaining = (targetList?.cards || []).filter((c) => c.id !== activeCardId);
          totalCards = remaining.length + 1;
          targetIndex = totalCards;
        } else if (String(over.id).startsWith('card-')) {
          const overCardId = Number(String(over.id).replace('card-', ''));
          for (const l of board.lists || []) {
            const idx = (l.cards || []).findIndex((c) => c.id === overCardId);
            if (idx !== -1) {
              targetList = l;
              const remaining = (l.cards || []).filter((c) => c.id !== activeCardId);
              targetIndex = idx + 1;
              totalCards = remaining.length + 1;
              break;
            }
          }
        }
        const listTitle = targetList?.name || 'list';
        return `Moved ${card?.title || 'card'} to ${listTitle}, position ${targetIndex} of ${totalCards}`;
      }
      if (active.data.current?.type === 'list') {
        const list = active.data.current.list;
        const overListId = Number(String(over.id).replace('list-', ''));
        const newIndex = (board.lists || []).findIndex((l) => l.id === overListId);
        const totalLists = (board.lists || []).length;
        return `Moved list ${list?.name || ''} to position ${newIndex + 1} of ${totalLists}`;
      }
      return 'Item dropped.';
    },
    onDragCancel() {
      return 'Movement cancelled.';
    }
  };

  const screenReaderInstructions = {
    draggable: 'To pick up a draggable item, press Space or Enter. While dragging, use arrow keys to change position. Press Space or Enter to drop, or Escape to cancel.'
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    // List reordering
    if (active.data.current?.type === 'list') {
      const activeListId = Number(String(active.id).replace('list-', ''));
      const overListId = Number(String(over.id).replace('list-', ''));

      if (activeListId !== overListId) {
        const oldIndex = (board.lists || []).findIndex((l) => l.id === activeListId);
        const newIndex = (board.lists || []).findIndex((l) => l.id === overListId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedLists = [...board.lists];
          const [movedList] = reorderedLists.splice(oldIndex, 1);
          reorderedLists.splice(newIndex, 0, movedList);

          let newPos = 1000;
          if (newIndex === 0) {
            newPos = (reorderedLists[1]?.position || 1000) / 2;
          } else if (newIndex === reorderedLists.length - 1) {
            newPos = (reorderedLists[reorderedLists.length - 2]?.position || 1000) + 1000;
          } else {
            const prev = reorderedLists[newIndex - 1]?.position || 0;
            const next = reorderedLists[newIndex + 1]?.position || 0;
            newPos = (prev + next) / 2;
          }

          if (onUpdateListPosition) {
            await onUpdateListPosition(activeListId, newPos);
          }
        }
      }
      return;
    }

    // Card moving / reordering
    if (active.data.current?.type === 'card') {
      const activeCardId = Number(String(active.id).replace('card-', ''));
      let targetListId = null;
      let targetIndex = 0;

      if (String(over.id).startsWith('list-')) {
        targetListId = Number(String(over.id).replace('list-', ''));
        const targetList = (board.lists || []).find((l) => l.id === targetListId);
        targetIndex = (targetList?.cards || []).length;
      } else if (String(over.id).startsWith('card-')) {
        const overCardId = Number(String(over.id).replace('card-', ''));
        for (const l of board.lists || []) {
          const idx = (l.cards || []).findIndex((c) => c.id === overCardId);
          if (idx !== -1) {
            targetListId = l.id;
            targetIndex = idx;
            break;
          }
        }
      }

      if (!targetListId) return;

      const targetList = (board.lists || []).find((l) => l.id === targetListId);
      const targetCards = (targetList?.cards || []).filter((c) => c.id !== activeCardId);

      let newPos = 1000;
      if (targetCards.length === 0) {
        newPos = 1000;
      } else if (targetIndex === 0) {
        newPos = (targetCards[0]?.position || 1000) / 2;
      } else if (targetIndex >= targetCards.length) {
        newPos = (targetCards[targetCards.length - 1]?.position || 1000) + 1000;
      } else {
        const prev = targetCards[targetIndex - 1]?.position || 0;
        const next = targetCards[targetIndex]?.position || 0;
        newPos = (prev + next) / 2;
      }

      if (onUpdateCardPosition) {
        await onUpdateCardPosition(activeCardId, targetListId, newPos);
      }
    }
  };

  const handleAddListSubmit = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      await onCreateList(board.id, newListTitle.trim());
      setNewListTitle('');
      setIsAddingList(false);
    } catch (err) {
      console.error('Failed to create list:', err);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberEmailInput.trim()) return;
    try {
      await onAddBoardMember(board.id, memberEmailInput.trim());
      setMemberEmailInput('');
      setIsAddMemberOpen(false);
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const boardBgClass = getBoardBgClass(board.background_color);

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${boardBgClass}`}>
      {/* Board Header */}
      <header className="relative z-30 h-16 px-4 sm:px-6 border-b border-border bg-surface flex items-center justify-between shrink-0 select-none shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Sidebar Hamburger Toggle */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="p-2 text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-muted border border-border rounded-xl lg:hidden transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Open Menu"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {isEditingBoardTitle && canEditBoard ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={boardTitleInput}
                onChange={(e) => setBoardTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsEditingBoardTitle(false);
                }}
                className="text-base sm:text-lg font-bold text-text-primary bg-surface border border-primary rounded-lg px-2.5 py-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="p-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg cursor-pointer transition-colors"
                title="Save board name"
                aria-label="Save board name"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 group min-w-0 ${canEditBoard ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={canEditBoard ? handleStartRename : undefined}
              title={canEditBoard ? 'Click to rename board' : undefined}
            >
              <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight truncate group-hover:text-primary transition-colors">
                {board.name}
              </h2>
              {canEditBoard && (
                <Pencil className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
              )}
            </div>
          )}

          {/* Project View Switcher (Board | List | Calendar) */}
          <div className="hidden md:flex items-center gap-1 ml-3 bg-surface-muted/60 p-0.5 rounded-lg border border-border text-xs">
            <NavLink
              to={`/w/${workspaceId}/p/${board.id}/board`}
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              Board
            </NavLink>
            <NavLink
              to={`/w/${workspaceId}/p/${board.id}/list`}
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              List
            </NavLink>
            <NavLink
              to={`/w/${workspaceId}/p/${board.id}/calendar`}
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'bg-surface text-primary shadow-xs font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              Calendar
            </NavLink>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Online Presence Avatars */}
          {onlineMembers.length > 0 && (
            <div className="hidden sm:flex items-center -space-x-2 mr-1">
              {onlineMembers.map((m) => (
                <div key={m.id} className="relative" title={`${m.name} (Online live)`}>
                  <Avatar name={m.name} size="sm" status="online" className="ring-2 ring-surface" />
                </div>
              ))}
            </div>
          )}

          {/* Notification Bell */}
          <NotificationBell
            onSelectNotificationCard={onSelectNotificationCard}
            onOpenAllNotifications={onOpenAllNotifications}
          />

          {/* Share Board & Permissions Button */}
          {canManageBoardMembers && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onInviteClick || (() => setIsAddMemberOpen(true))}
              leftIcon={<ShieldCheck className="w-4 h-4 text-primary" />}
              title="Share board & manage member permissions"
              aria-label="Share board & manage member permissions"
            >
              <span className="hidden sm:inline">Share & Permissions</span>
            </Button>
          )}

          {/* Theme Palette Button */}
          {canEditBoard && (
            <button
              ref={paletteButtonRef}
              type="button"
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              className="p-2 bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border rounded-xl transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Change Board Theme"
              aria-label="Change Board Theme"
            >
              <Palette className="w-4 h-4" />
            </button>
          )}

          {(canEditBoard || canDeleteBoard || canArchiveBoard) && (
            <div className="relative" ref={boardMenuRef}>
              <button
                type="button"
                onClick={() => setIsBoardMenuOpen((prev) => !prev)}
                className="p-2 bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border rounded-xl transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Board actions"
                aria-label="Board actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isBoardMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-lg z-50 py-1 text-text-primary">
                  {canEditBoard && (
                    <button
                      type="button"
                      onClick={handleStartRename}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-text-primary hover:bg-surface-muted transition-colors cursor-pointer text-left"
                    >
                      <Pencil className="w-3.5 h-3.5 text-text-secondary" />
                      Rename Board
                    </button>
                  )}
                  {canArchiveBoard && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsBoardMenuOpen(false);
                        if (onArchiveBoard) onArchiveBoard();
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-warning-text hover:bg-warning-tint transition-colors cursor-pointer text-left"
                    >
                      <Archive className="w-3.5 h-3.5 text-warning" />
                      Archive Board
                    </button>
                  )}
                  {canDeleteBoard && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsBoardMenuOpen(false);
                        if (onDeleteBoard) onDeleteBoard();
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-danger-text hover:bg-danger-tint transition-colors cursor-pointer text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger" />
                      Delete Board
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsActivityOpen(!isActivityOpen)}
            aria-label="Activity log"
            title="Activity log"
            leftIcon={<Activity className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">Activity</span>
          </Button>
        </div>
      </header>

      {/* Filter / Search Bar */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-border bg-surface-muted/80 flex flex-wrap items-center gap-2.5 text-xs shrink-0 select-none">
        <div className="relative min-w-[180px] flex-1 sm:flex-initial">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 text-xs min-h-[40px]"
          />
        </div>

        <div className="min-w-[130px] flex-1 sm:flex-initial">
          <Select
            value={filterMemberId !== null && filterMemberId !== undefined ? String(filterMemberId) : ''}
            onChange={(val) => setFilterMemberId(val ? Number(val) : null)}
            placeholder="All Members"
            size="sm"
            options={[
              { value: '', label: 'All Members' },
              ...(board.members || []).map((m) => ({ value: String(m.id), label: m.name }))
            ]}
          />
        </div>

        <div className="min-w-[130px] flex-1 sm:flex-initial">
          <Select
            value={filterLabelId !== null && filterLabelId !== undefined ? String(filterLabelId) : ''}
            onChange={(val) => setFilterLabelId(val ? Number(val) : null)}
            placeholder="All Labels"
            size="sm"
            options={[
              { value: '', label: 'All Labels' },
              ...uniqueLabels.map((l) => ({ value: String(l.id), label: l.name }))
            ]}
          />
        </div>

        <div className="min-w-[120px] flex-1 sm:flex-initial">
          <Select
            value={filterDueDate || 'all'}
            onChange={(val) => setFilterDueDate(val || 'all')}
            size="sm"
            options={[
              { value: 'all', label: 'All Dates' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'soon', label: 'Due in 24h' }
            ]}
          />
        </div>
      </div>

      {/* Mobile List Switcher Tabs */}
      <div className="md:hidden px-4 py-2 bg-surface border-b border-border flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        <button
          type="button"
          onClick={() => setActiveMobileListId('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 transition-colors ${
            activeMobileListId === 'all'
              ? 'bg-primary-tint text-primary-text border border-primary/20'
              : 'bg-surface text-text-secondary hover:text-text-primary'
          }`}
        >
          All Lists ({listsWithFilteredCards.length})
        </button>
        {listsWithFilteredCards.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setActiveMobileListId(String(l.id))}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 truncate max-w-[120px] transition-colors ${
              activeMobileListId === String(l.id)
                ? 'bg-primary-tint text-primary-text border border-primary/20'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            {l.name} ({l.cards.length})
          </button>
        ))}
      </div>

      {/* Main Board Lists Container (With snap scroll on mobile) */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6 snap-x snap-mandatory">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions
          }}
        >
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            <div className="flex items-start gap-5 h-full min-h-0 max-md:w-full">
              {(() => {
                const remoteDraggedCardIds = new Set(
                  Object.values(remoteDragCursors)
                    .map((r) => Number(r.cardId))
                    .filter(Boolean)
                );
                const remoteDraggedListIds = new Set(
                  Object.values(remoteDragCursors)
                    .map((r) => Number(r.listId))
                    .filter(Boolean)
                );
                return visibleLists.map((list) => (
                  <List
                    key={list.id}
                    list={list}
                    cards={list.cards}
                    onUpdateList={onUpdateList}
                    onDeleteList={onDeleteList}
                    onCardClick={onCardClick}
                    onCreateCard={onCreateCard}
                    highlightedCardId={highlightedCardId}
                    remoteDraggedCardIds={remoteDraggedCardIds}
                    isRemoteDragging={remoteDraggedListIds.has(list.id)}
                  />
                ));
              })()}

              {/* Add New List Button */}
              {canCreateList && (
                <div className="w-72 shrink-0 max-md:w-full snap-center">
                  {isAddingList ? (
                    <form
                      onSubmit={handleAddListSubmit}
                      className="p-4 bg-surface border border-border rounded-xl shadow-md space-y-3"
                    >
                      <input
                        type="text"
                        autoFocus
                        required
                        placeholder="Enter list title..."
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[40px]"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                        >
                          Add List
                        </Button>
                        <button
                          type="button"
                          onClick={() => setIsAddingList(false)}
                          className="p-1.5 text-text-muted hover:text-text-primary rounded-md transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingList(true)}
                      className="w-full flex items-center gap-2.5 p-3.5 bg-surface/80 hover:bg-surface border border-border hover:border-border-strong rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-xs min-h-[44px]"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                      Add another list
                    </button>
                  )}
                </div>
              )}
            </div>
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeItem?.type === 'list' && (
              <List
                list={activeItem.list}
                cards={listsWithFilteredCards.find((l) => l.id === activeItem.list.id)?.cards || activeItem.list.cards || []}
                isOverlay={true}
              />
            )}
            {activeItem?.type === 'card' && (
              <div className="w-72">
                <Card card={activeItem.card} isOverlay={true} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Board Theme Palette Picker */}
      {isPaletteOpen && (
        <div ref={paletteRef} className="absolute right-4 sm:right-20 top-18 bg-surface border border-border rounded-xl shadow-lg p-4 z-40 w-80 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Board Background
            </span>
            <button
              type="button"
              onClick={() => setIsPaletteOpen(false)}
              className="text-text-muted hover:text-text-primary cursor-pointer p-1 rounded"
              aria-label="Close palette picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {PALETTES.map((p) => (
              <div
                key={p.name}
                onClick={() => {
                  onUpdateBoard(board.id, { background_color: p.bg });
                  setIsPaletteOpen(false);
                }}
                className={`h-14 rounded-lg ${p.bg} cursor-pointer border-2 transition-all p-2 flex flex-col justify-end ${
                  board.background_color === p.bg
                    ? 'border-primary shadow-sm scale-102'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <span className="text-[11px] font-semibold text-text-primary truncate">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Invite to Board"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddMemberSubmit}>
              Send Invite
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddMemberSubmit} className="space-y-4">
          <Input
            label="User Email Address"
            type="email"
            required
            autoFocus
            placeholder="colleague@company.com"
            value={memberEmailInput}
            onChange={(e) => setMemberEmailInput(e.target.value)}
          />
        </form>
      </Modal>

      {/* Board Activity Sidebar Drawer */}
      <BoardActivityDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        activity={board.activity || []}
        onRefresh={onRefreshBoard}
      />

      {/* Real-time Multiplayer Live Dragging Cursors & Cards Overlay */}
      {Object.values(remoteDragCursors).map((remote) => (
        <div
          key={remote.socketId}
          style={{
            position: 'fixed',
            left: `${remote.x}px`,
            top: `${remote.y}px`,
            pointerEvents: 'none',
            zIndex: 10000,
            transition: 'left 60ms linear, top 60ms linear'
          }}
          className="flex flex-col items-start select-none"
        >
          <div className="flex items-center gap-1.5 -ml-1 -mt-1.5 z-10">
            <MousePointer2 className="w-5 h-5 text-primary fill-primary" />
            <span className="px-2 py-0.5 rounded-full bg-primary text-white font-bold text-[10px] shadow-sm border border-primary/50 truncate max-w-[150px]">
              {remote.userName || 'Teammate'}
            </span>
          </div>

          <div className="mt-1 ml-2 pointer-events-none transform rotate-1 scale-102 shadow-md">
            {remote.list ? (
              <List list={remote.list} cards={remote.list.cards || []} isOverlay={true} />
            ) : remote.card ? (
              <div className="w-72">
                <Card card={remote.card} isOverlay={true} />
              </div>
            ) : (
              <div className="w-72 bg-surface border border-border text-text-primary rounded-xl p-3 shadow-md flex items-center justify-between">
                <span className="text-xs font-semibold truncate">{remote.cardTitle || 'Dragging...'}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-tint text-primary-text">
                  Live Drag
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
