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
import { useAuth } from '../../hooks/useAuth';
import { matchesCardFilter } from '../../lib/filterCards';
import RightContextPanel from './RightContextPanel';

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
  MousePointer2,
  UserPlus,
  PanelRightClose,
  PanelRightOpen,
  Calendar,
  Sparkles
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
  onUpdateCard,
  onDeleteCard,
  onCopyCard,
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
  const { user } = useAuth();
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

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

  // Board Horizontal Mouse Scrolling & Mouse Drag Panning
  const boardScrollRef = useRef(null);
  const isDraggingBoardRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  useEffect(() => {
    const el = boardScrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      // 1. Shift key is standard modifier for horizontal scrolling
      if (e.shiftKey) {
        if (e.deltaY !== 0) {
          e.preventDefault();
          el.scrollLeft += e.deltaY * 1.25;
        }
        return;
      }

      // 2. Direct horizontal trackpad swipe gesture
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return; // Allow native trackpad horizontal scrolling
      }

      // 3. Check if wheel event originates inside a list or vertically scrollable cards container
      const insideList = e.target.closest('.overflow-y-auto, [id^="list-"]');
      if (insideList && insideList !== el) {
        // If cursor is anywhere over a list, vertical scrolling belongs exclusively to the list.
        // Prevent scroll chaining so reaching the top/bottom never jerks the board horizontally.
        return;
      }

      // 4. Cursor is on the open board canvas (between lists or empty space):
      // Convert vertical wheel to smooth horizontal board scroll.
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.25;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleBoardMouseDown = (e) => {
    // Only drag scroll if clicking on board background or empty list area (not on cards, buttons, or inputs)
    if (e.target.closest('button, input, textarea, a, select, [draggable="true"], .cursor-grab, [role="button"], .group')) {
      return;
    }
    isDraggingBoardRef.current = true;
    dragStartXRef.current = e.pageX;
    dragStartScrollLeftRef.current = boardScrollRef.current ? boardScrollRef.current.scrollLeft : 0;
  };

  const handleBoardMouseMove = (e) => {
    if (!isDraggingBoardRef.current || !boardScrollRef.current) return;
    const dx = e.pageX - dragStartXRef.current;
    boardScrollRef.current.scrollLeft = dragStartScrollLeftRef.current - dx;
  };

  const handleBoardMouseUpOrLeave = () => {
    isDraggingBoardRef.current = false;
  };

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

  // Aggregate all cards across lists for context panel
  const allBoardCards = (board.lists || []).flatMap((l) => l.cards || []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app text-text-primary select-none relative">
      {/* Tier 1: Modern Minimal Header on the White Outer Shell (No hard bottom divider) */}
      <header className="relative z-30 h-16 px-4 sm:px-6 lg:px-8 bg-app flex items-center justify-between shrink-0 select-none">
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
                className="text-base sm:text-lg font-bold text-text-primary bg-surface border border-primary rounded-xl px-2.5 py-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="p-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl cursor-pointer transition-colors"
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
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight truncate group-hover:text-primary transition-colors flex items-center gap-2">
                <span>{board.name}</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-tint text-primary">
                  Active Sprint
                </span>
              </h2>
              {canEditBoard && (
                <Pencil className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
              )}
            </div>
          )}
        </div>

        {/* Center: Global Pill Search & Quick Actions (Centered in Navbar) */}
        <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 px-2 min-w-0">
          {/* Pill Search input matching reference */}
          <div className="relative hidden md:block w-56 lg:w-72 xl:w-80">
            <label htmlFor="board-search-input" className="sr-only">
              Search task, project, label
            </label>
            <input
              id="board-search-input"
              type="text"
              placeholder="Search task, project, label ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-surface-muted/60 border border-border/80 rounded-full text-text-primary placeholder:text-text-muted text-xs focus:outline-none focus:border-primary focus:bg-surface focus-visible:ring-2 focus-visible:ring-primary/20 transition-all min-h-[38px]"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>

          {/* Theme Palette Button */}
          {canEditBoard && (
            <button
              ref={paletteButtonRef}
              type="button"
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              className="p-2 bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border rounded-xl transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shadow-2xs"
              title="Change Board Theme"
              aria-label="Change Board Theme"
            >
              <Palette className="w-4 h-4" />
            </button>
          )}

          {/* Notification Bell */}
          <NotificationBell
            onSelectNotificationCard={onSelectNotificationCard}
            onOpenAllNotifications={onOpenAllNotifications}
          />

          {/* Activity Drawer Button */}
          <button
            type="button"
            onClick={() => setIsActivityOpen(!isActivityOpen)}
            aria-label="Activity log"
            title="Activity log"
            className="p-2 bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border rounded-xl transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shadow-2xs"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Board Overflow Menu (Board actions) */}
          {(canEditBoard || canDeleteBoard || canArchiveBoard) && (
            <div className="relative" ref={boardMenuRef}>
              <button
                type="button"
                onClick={() => setIsBoardMenuOpen((prev) => !prev)}
                className="p-2 bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border rounded-xl transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shadow-2xs"
                title="Board actions"
                aria-label="Board actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isBoardMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border/80 rounded-2xl shadow-xl z-50 py-1.5 text-text-primary animate-sassy-dropdown">
                  {canEditBoard && (
                    <button
                      type="button"
                      onClick={handleStartRename}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer text-left"
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
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-warning-text hover:bg-warning-tint transition-colors cursor-pointer text-left"
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
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-danger-text hover:bg-danger-tint transition-colors cursor-pointer text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger" />
                      Delete Board
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Toggle Calendar Sidebar Button (Prominent & easy to find) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            title={isRightPanelOpen ? 'Hide calendar panel' : 'Show calendar panel'}
            aria-label={isRightPanelOpen ? 'Hide calendar panel' : 'Show calendar panel'}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 cursor-pointer min-h-[38px] shadow-2xs text-xs font-bold ${
              isRightPanelOpen
                ? 'bg-primary-tint border-primary/40 text-primary hover:bg-primary-tint/80 shadow-xs'
                : 'bg-surface hover:bg-surface-muted border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <Calendar className={`w-4 h-4 text-primary transition-transform duration-300 ${isRightPanelOpen ? 'scale-110' : 'scale-100'}`} />
            <span className="hidden sm:inline">Calendar</span>
            <span className="inline-flex transition-transform duration-300">
              {isRightPanelOpen ? (
                <PanelRightClose className="w-3.5 h-3.5 opacity-70 animate-in fade-in zoom-in-95 duration-200" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5 opacity-70 animate-in fade-in zoom-in-95 duration-200" />
              )}
            </span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body with Floating Inset Rounded Board & Right Context Area */}
      <div className="flex-1 flex overflow-hidden min-h-0 px-3 pb-3 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 gap-4 lg:gap-6 relative">
        {/* ======================================================== */}
        {/* FLOATING INSET ROUNDED BOARD SURFACE (Matching Reference) */}
        {/* ======================================================== */}
        <section
          aria-label="Sprint Board Workspace"
          className={`flex-1 min-w-0 h-full rounded-[28px] lg:rounded-[36px] ${boardBgClass} p-4 sm:p-5 lg:p-6 flex flex-col overflow-hidden shadow-xs relative`}
        >
          {/* Top of Board Surface: Teammates, Invite Pill, and "Create Task +" CTA (Matching Reference Image) */}
          <div className="flex items-center justify-between gap-3 text-xs shrink-0 select-none pb-4">
            {/* Left: Teammates Avatars Group & "Invite People" Pill */}
            <div className="flex items-center gap-3">
              {(() => {
                const membersList = (board.members && board.members.length > 0)
                  ? board.members
                  : onlineMembers;
                const visibleMembers = membersList.slice(0, 3);
                const extraCount = membersList.length - 3;

                return (
                  membersList.length > 0 && (
                    <div className="flex items-center -space-x-2">
                      {visibleMembers.map((m) => {
                        const isOnline = onlineMembers.some((om) => om.id === m.id);
                        return (
                          <div
                            key={m.id}
                            className="relative rounded-full ring-2 ring-surface shadow-2xs"
                            title={`${m.name}${isOnline ? ' (Online)' : ''}`}
                          >
                            <Avatar name={m.name} size="sm" status={isOnline ? 'online' : undefined} />
                          </div>
                        );
                      })}
                      {extraCount > 0 && (
                        <div
                          className="w-8 h-8 rounded-full bg-surface border border-border/80 text-text-secondary font-bold text-xs flex items-center justify-center shadow-2xs ring-2 ring-surface z-10"
                          title={`${extraCount} more members`}
                        >
                          +{extraCount}
                        </div>
                      )}
                    </div>
                  )
                );
              })()}

              {/* Invite People Button */}
              {canManageBoardMembers && (
                <button
                  type="button"
                  onClick={onInviteClick || (() => setIsAddMemberOpen(true))}
                  className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border/80 text-text-primary text-xs sm:text-sm font-bold rounded-full shadow-2xs transition-all cursor-pointer min-h-[36px]"
                >
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span>Invite People</span>
                </button>
              )}
            </div>

            {/* Right: "Create Task +" Primary CTA */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (board.lists && board.lists.length > 0) {
                    onCreateCard(board.lists[0].id, 'New Task');
                  } else if (canCreateList) {
                    setIsAddingList(true);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs sm:text-sm font-bold rounded-full shadow-sm hover:shadow transition-all cursor-pointer min-h-[38px]"
              >
                <span>Create Task</span>
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Kanban Columns Container with Smooth Horizontal Mouse Scroll */}
          <div
            ref={boardScrollRef}
            onMouseDown={handleBoardMouseDown}
            onMouseMove={handleBoardMouseMove}
            onMouseUp={handleBoardMouseUpOrLeave}
            onMouseLeave={handleBoardMouseUpOrLeave}
            className="flex-1 overflow-x-auto min-h-0 max-md:snap-x max-md:snap-mandatory custom-scrollbar pt-1 pb-3 cursor-default"
          >
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
                      onUpdateCard={onUpdateCard}
                      onDeleteCard={onDeleteCard}
                      onCopyCard={onCopyCard}
                      highlightedCardId={highlightedCardId}
                      remoteDraggedCardIds={remoteDraggedCardIds}
                      isRemoteDragging={remoteDraggedListIds.has(list.id)}
                    />
                  ));
                })()}

                {/* Add New List Button */}
                {canCreateList && (
                  <div className="w-76 shrink-0 max-md:w-full snap-center">
                    {isAddingList ? (
                      <form
                        onSubmit={handleAddListSubmit}
                        className="p-4 bg-surface border border-border/80 rounded-2xl shadow-md space-y-3"
                      >
                        <input
                          type="text"
                          autoFocus
                          required
                          placeholder="Enter list title..."
                          value={newListTitle}
                          onChange={(e) => setNewListTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[40px]"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            className="rounded-xl font-bold"
                          >
                            Add List
                          </Button>
                          <button
                            type="button"
                            onClick={() => setIsAddingList(false)}
                            className="p-1.5 text-text-muted hover:text-text-primary rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingList(true)}
                        className="w-full flex items-center gap-2.5 p-3.5 bg-surface-muted/60 hover:bg-surface border border-dashed border-border/80 hover:border-primary/40 rounded-2xl text-sm font-bold text-text-secondary hover:text-primary transition-all cursor-pointer shadow-2xs min-h-[44px]"
                      >
                        <Plus className="w-4 h-4 text-primary" />
                        <span>Add column</span>
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
      </section>

      {/* Right Context Panel (Calendar & Upcoming Tasks) with Smooth Animated Toggle */}
      <div
        className={`hidden xl:flex flex-col h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isRightPanelOpen
            ? 'w-76 xl:w-84 opacity-100 translate-x-0'
            : 'w-0 opacity-0 translate-x-8 pointer-events-none -mr-4 lg:-mr-6'
        }`}
        aria-hidden={!isRightPanelOpen}
      >
        <div className="w-76 xl:w-84 h-full shrink-0">
          <RightContextPanel
            user={user}
            board={board}
            cards={allBoardCards}
            onCardClick={onCardClick}
            className="w-full h-full"
          />
        </div>
      </div>
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
