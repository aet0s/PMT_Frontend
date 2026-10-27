import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, NavLink, useParams, useNavigate } from 'react-router-dom';
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
import { PALETTES, getBoardBgClass } from '../../lib/palettes';
import { useBoardSocket } from '../../hooks/useBoardSocket';
import { useSocket } from '../../context/SocketProvider';
import { usePermissions } from '../../context/PermissionContext';
import { useAuth } from '../../hooks/useAuth';
import { matchesCardFilter } from '../../lib/filterCards';
import { getTenantItem, setTenantItem, getUserPref, setUserPref } from '../../lib/storage';
import RightContextPanel from './RightContextPanel';
import { getBoardWorkspaceMembers, addBoardMemberById } from '../../api/boards';
import { useToast } from '../ui/Toast';

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
  Calendar,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Filter,
  Tag,
  Users
} from 'lucide-react';

export default function Board({
  board,
  boards = [],
  workspace,
  projectDefaults,
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
  onBoardSocketEvent,
  isActivityOpen: externalActivityOpen,
  onCloseActivity
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  // Right Calendar/Tasks Panel Shutter state (persisted across all boards & workspaces)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(() => {
    return getUserPref('right_panel_open', true);
  });

  const handleToggleRightPanel = () => {
    setIsRightPanelOpen((prev) => {
      const next = !prev;
      setUserPref('right_panel_open', next);
      return next;
    });
  };

  const handleCloseRightPanel = () => {
    setIsRightPanelOpen(false);
    setUserPref('right_panel_open', false);
  };

  const { workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filters state (synchronized with URL query params)
  const searchQuery = searchParams.get('search') || '';
  const filterMemberId = searchParams.get('member') || 'all';
  const filterLabelId = searchParams.get('label') || 'all';
  const filterDueDate = searchParams.get('due') || 'all';
  const filterListId = searchParams.get('list') || 'all';
  const filterAssignerId = searchParams.get('assigner') || 'all';
  const filterStatus = searchParams.get('status') || 'all';

  const [isDetailedFilterOpen, setIsDetailedFilterOpen] = useState(false);
  const [isFocusMyCards, setIsFocusMyCards] = useState(() => {
    return getUserPref('focus_my_cards', false);
  });

  // Keep settings synchronized when user navigates between boards or across browser tabs
  useEffect(() => {
    setIsRightPanelOpen(getUserPref('right_panel_open', true));
    setIsFocusMyCards(getUserPref('focus_my_cards', false));
  }, [board?.id]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'taskflow_pref_right_panel_open') {
        setIsRightPanelOpen(getUserPref('right_panel_open', true));
      }
      if (e.key === 'taskflow_pref_focus_my_cards') {
        setIsFocusMyCards(getUserPref('focus_my_cards', false));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleFocusMyCards = () => {
    setIsFocusMyCards((prev) => {
      const next = !prev;
      setUserPref('focus_my_cards', next);
      setSearchParams((sp) => {
        const n = new URLSearchParams(sp);
        if (next) n.set('focus', 'me');
        else n.delete('focus');
        return n;
      });
      return next;
    });
  };

  const myCardsCount = useMemo(() => {
    if (!user?.id || !board?.lists) return 0;
    const uid = Number(user.id);
    let count = 0;
    board.lists.forEach((list) => {
      (list.cards || []).forEach((c) => {
        const isAssignee = (c.members || []).some((m) => Number(m.id || m.user_id) === uid);
        const isAssigner =
          (c.assigners || []).some((a) => Number(a.id || a.user_id) === uid) ||
          (c.created_by && Number(c.created_by) === uid) ||
          (c.creator_id && Number(c.creator_id) === uid);
        if (isAssignee || isAssigner) count++;
      });
    });
    return count;
  }, [board?.lists, user?.id]);

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
      if (val && val !== 'all') next.set('member', String(val));
      else next.delete('member');
      return next;
    });
  };

  const setFilterLabelId = (val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && val !== 'all') next.set('label', String(val));
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

  const setFilterListId = (val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && val !== 'all') next.set('list', String(val));
      else next.delete('list');
      return next;
    });
  };

  const setFilterAssignerId = (val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && val !== 'all') next.set('assigner', String(val));
      else next.delete('assigner');
      return next;
    });
  };

  const setFilterStatus = (val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && val !== 'all') next.set('status', val);
      else next.delete('status');
      return next;
    });
  };

  const handleClearAllFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('search');
      next.delete('member');
      next.delete('label');
      next.delete('due');
      next.delete('list');
      next.delete('assigner');
      next.delete('status');
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
  const [localActivityOpen, setLocalActivityOpen] = useState(false);
  const isActivityOpen = externalActivityOpen !== undefined ? externalActivityOpen : localActivityOpen;
  const setIsActivityOpen = (val) => {
    if (typeof val === 'function') {
      const next = val(isActivityOpen);
      if (!next && onCloseActivity) onCloseActivity();
      setLocalActivityOpen(next);
    } else {
      if (!val && onCloseActivity) onCloseActivity();
      setLocalActivityOpen(val);
    }
  };
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [memberEmailInput, setMemberEmailInput] = useState('');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const [isBoardSwitcherOpen, setIsBoardSwitcherOpen] = useState(false);
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false);
  const [boardTitleInput, setBoardTitleInput] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [newListWipLimitEnabled, setNewListWipLimitEnabled] = useState(true);
  const [isAddingList, setIsAddingList] = useState(false);

  // Board permissions member dropdown state
  const [isBoardMembersDropdownOpen, setIsBoardMembersDropdownOpen] = useState(false);
  const [boardWorkspaceMembers, setBoardWorkspaceMembers] = useState([]);
  const [memberFilterQuery, setMemberFilterQuery] = useState('');
  const boardMembersDropdownRef = useRef(null);

  // Add Member to Board state (for top level users)
  const [isAddBoardMemberDropdownOpen, setIsAddBoardMemberDropdownOpen] = useState(false);
  const [addMemberFilterQuery, setAddMemberFilterQuery] = useState('');
  const [addingMemberId, setAddingMemberId] = useState(null);
  const addMemberDropdownRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    if (!board?.id) return;
    const fetchPermMembers = async () => {
      try {
        const data = await getBoardWorkspaceMembers(board.id);
        if (!isCancelled && data?.members) {
          setBoardWorkspaceMembers(data.members);
        }
      } catch (err) {
        // Fallback gracefully
      }
    };
    fetchPermMembers();
    return () => { isCancelled = true; };
  }, [board?.id, board?.members]);

  const permittedMembers = useMemo(() => {
    if (boardWorkspaceMembers.length > 0) {
      return boardWorkspaceMembers.filter((m) => m.has_access);
    }
    return (board?.members && board.members.length > 0) ? board.members : [];
  }, [boardWorkspaceMembers, board?.members]);

  const filteredDropdownMembers = useMemo(() => {
    if (!memberFilterQuery.trim()) return permittedMembers;
    const q = memberFilterQuery.trim().toLowerCase();
    return permittedMembers.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q))
    );
  }, [permittedMembers, memberFilterQuery]);

  const unassignedWorkspaceMembers = useMemo(() => {
    return (boardWorkspaceMembers || []).filter((m) => !m.has_access);
  }, [boardWorkspaceMembers]);

  const filteredUnassignedMembers = useMemo(() => {
    if (!addMemberFilterQuery.trim()) return unassignedWorkspaceMembers;
    const q = addMemberFilterQuery.trim().toLowerCase();
    return unassignedWorkspaceMembers.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q))
    );
  }, [unassignedWorkspaceMembers, addMemberFilterQuery]);

  const boardMenuRef = useRef(null);
  const boardSwitcherRef = useRef(null);
  const paletteRef = useRef(null);
  const paletteButtonRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(event.target)) {
        setIsBoardMenuOpen(false);
      }
      if (boardSwitcherRef.current && !boardSwitcherRef.current.contains(event.target)) {
        setIsBoardSwitcherOpen(false);
      }
      if (boardMembersDropdownRef.current && !boardMembersDropdownRef.current.contains(event.target)) {
        setIsBoardMembersDropdownOpen(false);
      }
      if (addMemberDropdownRef.current && !addMemberDropdownRef.current.contains(event.target)) {
        setIsAddBoardMemberDropdownOpen(false);
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

  const toast = useToast();
  const { hasPermission, userRole } = usePermissions();
  const userRank = Number(userRole?.rank || 30);
  const roleName = String(userRole?.name || '').toLowerCase();
  const isTopLevel = userRank >= 50 || ['owner', 'admin', 'project manager', 'team lead'].includes(roleName);
  const canEditBoard = hasPermission('project.edit_settings');
  const canDeleteBoard = hasPermission('project.delete');
  const canArchiveBoard = hasPermission('project.archive') || canEditBoard;
  const canManageBoardMembers = hasPermission('project.manage_members');
  const canAddMember = isTopLevel || canManageBoardMembers;
  const canCreateList = hasPermission('list.create');
  const canViewActivity = hasPermission('activity.view');

  const handleAddMemberToBoard = async (member) => {
    if (!board?.id || !member?.id) return;
    setAddingMemberId(member.id);
    try {
      await addBoardMemberById(board.id, member.id);
      setBoardWorkspaceMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, has_access: true, board_role: 'member' } : m))
      );
      if (typeof onRefreshBoard === 'function') {
        onRefreshBoard();
      }
      toast.show(`${member.name || member.email} added to board!`, 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to add member to board', 'error');
    } finally {
      setAddingMemberId(null);
    }
  };

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
      filterMemberId: filterMemberId === 'all' ? null : filterMemberId,
      filterLabelId: filterLabelId === 'all' ? null : filterLabelId,
      filterDueDate,
      filterListId: filterListId === 'all' ? null : filterListId,
      filterAssignerId: filterAssignerId === 'all' ? null : filterAssignerId,
      filterStatus,
      currentUserId: user?.id
    });

  const effectiveDefaults =
    projectDefaults ||
    workspace?.settings?.workspace_defaults ||
    workspace?.settings?.project_defaults ||
    getTenantItem(`ws_defaults_${workspace?.id}`, 'settings', null) ||
    {};
  const wipLimitEnabled = effectiveDefaults.wipLimitEnabled ?? true;
  const wipLimitMax = Number(effectiveDefaults.wipLimitMax || 5);
  const defaultCardSort = effectiveDefaults.defaultCardSort || 'position';

  const sortCardsFn = useCallback(
    (cards) => {
      if (!cards || cards.length <= 1) return cards || [];
      if (defaultCardSort === 'title') {
        return [...cards].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      }
      if (defaultCardSort === 'due_date') {
        return [...cards].sort((a, b) => {
          if (!a.due_date && !b.due_date) return (a.position || 0) - (b.position || 0);
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
      }
      return [...cards].sort((a, b) => (a.position || 0) - (b.position || 0));
    },
    [defaultCardSort]
  );

  const listsWithFilteredCards = (board.lists || []).map((l) => ({
    ...l,
    cards: sortCardsFn((l.cards || []).filter(filterCard))
  }));

  const visibleLists =
    activeMobileListId === 'all'
      ? listsWithFilteredCards
      : listsWithFilteredCards.filter((l) => String(l.id) === activeMobileListId);

  const listIds = visibleLists.map((l) => `list-${l.id}`);

  // Map each card ID to its sequential 1-based task number on this board
  const taskNumberMap = useMemo(() => {
    const map = new Map();
    if (!board?.lists) return map;

    const allCards = [];
    board.lists.forEach((list) => {
      (list.cards || []).forEach((c) => {
        allCards.push(c);
      });
    });

    // Deterministic order: created_at asc, id asc
    allCards.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    allCards.forEach((c, index) => {
      map.set(c.id, c.task_number ?? (index + 1));
    });

    return map;
  }, [board?.lists]);

  // Unique labels across board and cards
  const boardLabels = useMemo(() => {
    const map = new Map();
    (board?.labels || []).forEach((l) => {
      map.set(Number(l.id), l);
    });
    (board?.lists || []).forEach((l) => {
      (l.cards || []).forEach((c) => {
        (c.labels || []).forEach((l) => {
          const id = Number(l.id || l.label_id);
          if (id && !map.has(id)) {
            map.set(id, l);
          }
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [board?.labels, board?.lists]);

  // Unique assignees across board members and cards
  const boardAssignees = useMemo(() => {
    const map = new Map();
    (board?.members || []).forEach((m) => {
      map.set(Number(m.id), { id: Number(m.id), name: m.name, email: m.email, avatar_url: m.avatar_url || m.avatar });
    });
    (board?.lists || []).forEach((l) => {
      (l.cards || []).forEach((c) => {
        (c.members || []).forEach((m) => {
          const id = Number(m.id || m.user_id);
          if (id && !map.has(id)) {
            map.set(id, { id, name: m.name, email: m.email, avatar_url: m.avatar_url || m.avatar });
          }
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [board?.members, board?.lists]);

  // Unique assigners across cards and board members
  const boardAssigners = useMemo(() => {
    const map = new Map();
    (board?.lists || []).forEach((l) => {
      (l.cards || []).forEach((c) => {
        (c.assigners || []).forEach((a) => {
          const id = Number(a.id || a.user_id);
          if (id && !map.has(id)) {
            map.set(id, { id, name: a.name, email: a.email, avatar_url: a.avatar_url || a.avatar });
          }
        });
        if (c.creator_id && c.creator_name && !map.has(Number(c.creator_id))) {
          map.set(Number(c.creator_id), { id: Number(c.creator_id), name: c.creator_name, email: c.creator_email, avatar_url: c.creator_avatar || c.creator_avatar_url });
        }
      });
    });
    if (map.size === 0) {
      (board?.members || []).forEach((m) => {
        map.set(Number(m.id), { id: Number(m.id), name: m.name, email: m.email, avatar_url: m.avatar_url || m.avatar });
      });
    }
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [board?.lists, board?.members]);

  // Total board cards count & visible filtered cards count
  const totalCardsCount = useMemo(() => {
    return (board?.lists || []).reduce((acc, l) => acc + (l.cards || []).length, 0);
  }, [board?.lists]);

  const visibleCardsCount = useMemo(() => {
    return visibleLists.reduce((acc, l) => acc + (l.cards || []).length, 0);
  }, [visibleLists]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterLabelId && filterLabelId !== 'all') count++;
    if (filterDueDate && filterDueDate !== 'all') count++;
    if (filterListId && filterListId !== 'all') count++;
    if (filterMemberId && filterMemberId !== 'all') count++;
    if (filterAssignerId && filterAssignerId !== 'all') count++;
    if (filterStatus && filterStatus !== 'all') count++;
    return count;
  }, [
    searchQuery,
    filterLabelId,
    filterDueDate,
    filterListId,
    filterMemberId,
    filterAssignerId,
    filterStatus
  ]);

  // Unique labels on this board
  const uniqueLabels = boardLabels;

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
      await onCreateList(board.id, newListTitle.trim(), undefined, newListWipLimitEnabled, wipLimitMax);
      setNewListTitle('');
      setNewListWipLimitEnabled(true);
      setIsAddingList(false);
    } catch (err) {
      console.error('Failed to create list:', err);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberEmailInput.trim()) return;
    try {
      if (onAddBoardMember) {
        await onAddBoardMember(board.id, memberEmailInput.trim());
      }
      setMemberEmailInput('');
      setIsInviteMemberModalOpen(false);
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const boardBgClass = getBoardBgClass(board.background_color);

  // Aggregate all cards across lists for context panel
  const allBoardCards = (board.lists || []).flatMap((l) => l.cards || []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app text-text-primary select-none relative pt-2">
      {/* Main Workspace Body with Floating Inset Rounded Board & Right Context Area */}
      <div className="flex-1 flex overflow-hidden min-h-0 px-3 pb-3 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 gap-4 lg:gap-6 relative">
        {/* ======================================================== */}
        {/* FLOATING INSET ROUNDED BOARD SURFACE (Matching Reference) */}
        {/* ======================================================== */}
        <div className="flex-1 min-w-0 h-full relative">
          <section
            aria-label="Sprint Board Workspace"
            className={`w-full h-full rounded-[28px] lg:rounded-[36px] ${boardBgClass} p-4 sm:p-5 lg:p-6 flex flex-col overflow-hidden shadow-xs relative`}
          >
          {/* Top of Board Surface: Teammates, Invite Pill, and "Create Task +" CTA (Matching Reference Image) */}
          <div className="flex items-center justify-between gap-3 text-xs shrink-0 select-none pb-4">
            {/* Left: Clickable Member Count Button & Board Permissions Dropdown */}
            <div className="flex items-center gap-3">
              <div className="relative" ref={boardMembersDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsBoardMembersDropdownOpen((prev) => !prev)}
                  className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-surface hover:bg-surface-hover border border-border/80 rounded-full shadow-2xs transition-all cursor-pointer min-h-[36px] text-xs sm:text-sm font-bold ${
                    isBoardMembersDropdownOpen ? 'ring-2 ring-primary/20 border-primary/40 bg-surface-muted/60' : ''
                  }`}
                  title="Click to view all users with permission to access this board"
                  aria-label="Click to view all users with permission to access this board"
                  aria-expanded={isBoardMembersDropdownOpen}
                >
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-text-primary">
                    {permittedMembers.length === 1 ? '1 Member' : `${permittedMembers.length} Members`}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${isBoardMembersDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>

                {isBoardMembersDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-80 sm:w-88 bg-surface border border-border/80 rounded-2xl shadow-xl z-50 p-3 space-y-2.5 animate-sassy-dropdown-left text-left">
                    {/* Header */}
                    <div className="pb-2 border-b border-border/60">
                      <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        Board Access
                      </h4>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Users with permission to view this board
                      </p>
                    </div>

                    {/* Filter query if list has more than 4 members */}
                    {permittedMembers.length > 4 && (
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={memberFilterQuery}
                          onChange={(e) => setMemberFilterQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-muted/60 border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary placeholder:text-text-muted"
                        />
                      </div>
                    )}

                    {/* Member List */}
                    <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
                      {filteredDropdownMembers.length === 0 ? (
                        <div className="py-4 text-center text-xs text-text-muted">
                          No matching users found
                        </div>
                      ) : (
                        filteredDropdownMembers.map((m) => {
                          const isOnline = onlineMembers.some((om) => om.id === m.id);
                          const roleLabel = m.is_workspace_admin
                            ? 'Admin'
                            : m.board_role || m.workspace_role || m.role || 'Member';
                          return (
                            <div
                              key={m.id}
                              className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-surface-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <Avatar
                                  name={m.name}
                                  src={m.avatar_url || m.avatar}
                                  user={m}
                                  size="sm"
                                  status={isOnline ? 'online' : undefined}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-text-primary truncate">{m.name}</span>
                                    {isOnline && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" title="Online" />
                                    )}
                                  </div>
                                  <span className="text-[11px] text-text-muted truncate block">{m.email}</span>
                                </div>
                              </div>
                              <div className="shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  m.is_workspace_admin || String(roleLabel).toLowerCase().includes('admin') || String(roleLabel).toLowerCase().includes('owner')
                                    ? 'bg-primary-tint text-primary border-primary/20'
                                    : 'bg-surface-muted text-text-secondary border-border/60'
                                }`}>
                                  {roleLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Member Button: for top level users and managers */}
              {canAddMember && (
                <div className="relative" ref={addMemberDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddBoardMemberDropdownOpen((prev) => !prev);
                      setIsBoardMembersDropdownOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-full shadow-2xs transition-all cursor-pointer min-h-[36px] text-xs sm:text-sm font-bold ${
                      isAddBoardMemberDropdownOpen ? 'ring-2 ring-primary/40 brightness-110' : ''
                    }`}
                    title="Add already invited workspace member to this board"
                    aria-label="Add Member to board"
                    aria-expanded={isAddBoardMemberDropdownOpen}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>

                  {isAddBoardMemberDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-80 sm:w-88 bg-surface border border-border/80 rounded-2xl shadow-xl z-50 p-3 space-y-2.5 animate-sassy-dropdown-left text-left">
                      <div className="pb-2 border-b border-border/60">
                        <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-primary" />
                          Add Member to Board
                        </h4>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          Add an invited workspace member to this board
                        </p>
                      </div>

                      {unassignedWorkspaceMembers.length > 3 && (
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Search members..."
                            value={addMemberFilterQuery}
                            onChange={(e) => setAddMemberFilterQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-muted/60 border border-border/80 rounded-xl focus:outline-none focus:border-primary text-text-primary placeholder:text-text-muted"
                          />
                        </div>
                      )}

                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                        {filteredUnassignedMembers.length === 0 ? (
                          <p className="text-xs text-text-muted italic py-3 text-center">
                            {unassignedWorkspaceMembers.length === 0
                              ? 'All workspace members already have access to this board.'
                              : 'No matching workspace members found.'}
                          </p>
                        ) : (
                          filteredUnassignedMembers.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-muted/70 transition-colors gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar name={m.name} email={m.email} src={m.avatar_url || m.avatar} user={m} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-text-primary truncate">{m.name}</p>
                                  <p className="text-[10px] text-text-muted truncate">{m.workspace_role || m.email}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={addingMemberId === m.id}
                                onClick={() => handleAddMemberToBoard(m)}
                                className="px-2.5 py-1 text-xs font-semibold bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                              >
                                {addingMemberId === m.id ? 'Adding...' : 'Add'}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Board Filter Controls replacing Create Task button */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Quick Label Filter */}
              <div className="w-28 sm:w-32 hidden md:block">
                <Select
                  value={filterLabelId || 'all'}
                  onChange={(val) => setFilterLabelId(val)}
                  size="sm"
                  aria-label="Filter by label"
                  options={[
                    { value: 'all', label: 'All Labels' },
                    { value: 'no-label', label: 'No Label' },
                    ...boardLabels.map((l) => ({ value: String(l.id), label: l.name }))
                  ]}
                  className="w-full text-xs font-semibold"
                />
              </div>

              {/* Quick Due Date Filter */}
              <div className="w-28 sm:w-32 hidden lg:block">
                <Select
                  value={filterDueDate}
                  onChange={(val) => setFilterDueDate(val)}
                  size="sm"
                  aria-label="Filter by date"
                  options={[
                    { value: 'all', label: 'All Dates' },
                    { value: 'today', label: 'Due Today' },
                    { value: 'tomorrow', label: 'Due Tomorrow' },
                    { value: 'this-week', label: 'This Week' },
                    { value: 'overdue', label: 'Overdue' },
                    { value: 'no-date', label: 'No Date' }
                  ]}
                  className="w-full text-xs font-semibold"
                />
              </div>

              {/* Quick Assignee Filter */}
              <div className="w-28 sm:w-32 hidden xl:block">
                <Select
                  value={filterMemberId || 'all'}
                  onChange={(val) => setFilterMemberId(val)}
                  size="sm"
                  aria-label="Filter by assignee"
                  options={[
                    { value: 'all', label: 'All Assignees' },
                    { value: 'unassigned', label: 'Unassigned' },
                    ...boardAssignees.map((m) => ({ value: String(m.id), label: m.name }))
                  ]}
                  className="w-full text-xs font-semibold"
                />
              </div>

              {/* 1-Click "Focus My Cards" Spotlight Toggle Button */}
              <button
                type="button"
                onClick={toggleFocusMyCards}
                aria-pressed={isFocusMyCards}
                aria-label="Toggle Focus My Cards mode"
                title={
                  isFocusMyCards
                    ? 'Focus My Cards is ON: Your cards are spotlighted while other cards are dimmed'
                    : 'Spotlight your cards: Highlights cards assigned to or by you and dims other cards'
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[36px] shadow-2xs border ${
                  isFocusMyCards
                    ? 'bg-primary text-white border-primary shadow-xs ring-2 ring-primary/30'
                    : 'bg-surface hover:bg-surface-hover border-border/80 text-text-primary hover:border-primary/50'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isFocusMyCards ? 'text-primary-foreground' : 'text-primary'}`} />
                <span>Focus My Cards</span>
                {myCardsCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isFocusMyCards ? 'bg-white text-primary' : 'bg-primary-tint text-primary-text'
                    }`}
                  >
                    {myCardsCount}
                  </span>
                )}
              </button>

              {/* Detailed Filters Toggle Button */}
              <button
                type="button"
                onClick={() => setIsDetailedFilterOpen(!isDetailedFilterOpen)}
                aria-expanded={isDetailedFilterOpen}
                aria-label="Toggle detailed filters"
                title="Detailed Filters (Label, Date, List, Assignee, Assigner)"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[36px] shadow-2xs border ${
                  isDetailedFilterOpen || activeFiltersCount > 0
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-hover border-border/80 text-text-primary'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-primary text-[10px] font-black flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isDetailedFilterOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Clear All Filters Button */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger-tint rounded-full transition-colors cursor-pointer border border-danger/30"
                  title="Clear all filters"
                  aria-label="Clear all filters"
                >
                  Reset
                </button>
              )}
              {/* Calendar Toggle Button on < xl (< 1280px) */}
              <button
                type="button"
                onClick={handleToggleRightPanel}
                aria-label="Toggle Calendar & Tasks sidebar"
                title="Calendar & Tasks"
                className={`flex xl:hidden items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[36px] shadow-2xs border ${
                  isRightPanelOpen
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-hover border-border/80 text-text-primary'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Calendar</span>
              </button>
            </div>
          </div>

          {/* Detailed Filter Section (Collapsible Full-Width Panel with Smooth Height & Fade Transition) */}
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${
              isDetailedFilterOpen
                ? 'grid-rows-[1fr] opacity-100 mb-4'
                : 'grid-rows-[0fr] opacity-0 mb-0 pointer-events-none'
            }`}
          >
            <div className="overflow-hidden">
              <div className="bg-surface border border-border/90 rounded-2xl p-4 shadow-sm space-y-3.5">
                {/* Header of Detailed Filters */}
                <div className="flex items-center justify-between pb-2 border-b border-border/70 text-xs">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <span className="font-bold text-text-primary text-sm">
                      Detailed Board Filters
                    </span>
                    <span className="text-text-muted">
                      ({visibleCardsCount} of {totalCardsCount} tasks visible)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="text-xs font-semibold text-danger hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset all</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsDetailedFilterOpen(false)}
                      className="p-1 text-text-muted hover:text-text-primary rounded-lg cursor-pointer"
                      title="Close filter section"
                      aria-label="Close filter section"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 5-Column Grid of Dedicated Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* 1. Filter by Label */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                      Label
                    </label>
                    <Select
                      value={filterLabelId || 'all'}
                      onChange={(val) => setFilterLabelId(val)}
                      size="sm"
                      aria-label="Detailed filter by label"
                      options={[
                        { value: 'all', label: 'All Labels' },
                        { value: 'no-label', label: 'No Label' },
                        ...boardLabels.map((l) => ({ value: String(l.id), label: l.name }))
                      ]}
                      className="w-full text-xs font-medium"
                    />
                  </div>

                  {/* 2. Filter by Due Date */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                      Due Date
                    </label>
                    <Select
                      value={filterDueDate}
                      onChange={(val) => setFilterDueDate(val)}
                      size="sm"
                      aria-label="Detailed filter by date"
                      options={[
                        { value: 'all', label: 'All Dates' },
                        { value: 'today', label: 'Due Today' },
                        { value: 'tomorrow', label: 'Due Tomorrow' },
                        { value: 'this-week', label: 'This Week' },
                        { value: 'overdue', label: 'Overdue' },
                        { value: 'has-date', label: 'Has Due Date' },
                        { value: 'no-date', label: 'No Due Date' }
                      ]}
                      className="w-full text-xs font-medium"
                    />
                  </div>

                  {/* 3. Filter by List */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                      List / Column
                    </label>
                    <Select
                      value={filterListId || 'all'}
                      onChange={(val) => setFilterListId(val)}
                      size="sm"
                      aria-label="Detailed filter by list"
                      options={[
                        { value: 'all', label: 'All Lists' },
                        ...(board?.lists || []).map((l) => ({ value: String(l.id), label: l.name }))
                      ]}
                      className="w-full text-xs font-medium"
                    />
                  </div>

                  {/* 4. Filter by Assignee */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                      Assignee
                    </label>
                    <Select
                      value={filterMemberId || 'all'}
                      onChange={(val) => setFilterMemberId(val)}
                      size="sm"
                      aria-label="Detailed filter by assignee"
                      options={[
                        { value: 'all', label: 'All Assignees' },
                        { value: 'unassigned', label: 'Unassigned' },
                        ...boardAssignees.map((m) => ({ value: String(m.id), label: m.name }))
                      ]}
                      className="w-full text-xs font-medium"
                    />
                  </div>

                  {/* 5. Filter by Assigner */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                      Assigner / Creator
                    </label>
                    <Select
                      value={filterAssignerId || 'all'}
                      onChange={(val) => setFilterAssignerId(val)}
                      size="sm"
                      aria-label="Detailed filter by assigner"
                      options={[
                        { value: 'all', label: 'All Assigners' },
                        ...boardAssigners.map((a) => ({ value: String(a.id), label: a.name }))
                      ]}
                      className="w-full text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Active Filter Chips Bar */}
                {activeFiltersCount > 0 && (
                  <div className="pt-2 border-t border-border/60 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-text-muted mr-1">Active:</span>

                    {filterLabelId && filterLabelId !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-tint text-primary border border-primary/20">
                        <span>Label: {boardLabels.find((l) => String(l.id) === String(filterLabelId))?.name || filterLabelId}</span>
                        <button type="button" onClick={() => setFilterLabelId('all')} className="hover:opacity-75 cursor-pointer" aria-label="Remove label filter">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {filterDueDate && filterDueDate !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-tint text-primary border border-primary/20">
                        <span>Date: {filterDueDate}</span>
                        <button type="button" onClick={() => setFilterDueDate('all')} className="hover:opacity-75 cursor-pointer" aria-label="Remove date filter">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {filterListId && filterListId !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-tint text-primary border border-primary/20">
                        <span>List: {(board?.lists || []).find((l) => String(l.id) === String(filterListId))?.name || filterListId}</span>
                        <button type="button" onClick={() => setFilterListId('all')} className="hover:opacity-75 cursor-pointer" aria-label="Remove list filter">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {filterMemberId && filterMemberId !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-tint text-primary border border-primary/20">
                        <span>Assignee: {boardAssignees.find((m) => String(m.id) === String(filterMemberId))?.name || filterMemberId}</span>
                        <button type="button" onClick={() => setFilterMemberId('all')} className="hover:opacity-75 cursor-pointer" aria-label="Remove assignee filter">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {filterAssignerId && filterAssignerId !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-tint text-primary border border-primary/20">
                        <span>Assigner: {boardAssigners.find((a) => String(a.id) === String(filterAssignerId))?.name || filterAssignerId}</span>
                        <button type="button" onClick={() => setFilterAssignerId('all')} className="hover:opacity-75 cursor-pointer" aria-label="Remove assigner filter">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
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
                      wipLimitEnabled={wipLimitEnabled}
                      wipLimitMax={wipLimitMax}
                      taskNumberMap={taskNumberMap}
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
                      focusMode={isFocusMyCards}
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
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewListTitle(val);
                            if (/^(done|completed|finished|closed|released|shipped|archive)/i.test(val.trim())) {
                              setNewListWipLimitEnabled(false);
                            }
                          }}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[40px]"
                        />

                        {/* List-Level WIP Limit Setting Checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary select-none">
                          <input
                            type="checkbox"
                            checked={newListWipLimitEnabled}
                            onChange={(e) => setNewListWipLimitEnabled(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer accent-primary"
                          />
                          <span>Enable WIP limit on this list</span>
                        </label>

                        <div className="flex items-center gap-2 pt-1">
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
                            onClick={() => {
                              setIsAddingList(false);
                              setNewListWipLimitEnabled(true);
                            }}
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
                  taskNumberMap={taskNumberMap}
                  isOverlay={true}
                />
              )}
              {activeItem?.type === 'card' && (
                <div className="w-72">
                  <Card
                    card={activeItem.card}
                    listName={(board?.lists || visibleLists || []).find((l) => l.id === activeItem.card.list_id)?.name || activeItem.card.list_name}
                    taskNumber={taskNumberMap.get(activeItem.card.id) ?? activeItem.card.task_number}
                    isOverlay={true}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </section>

      {/* Shutter Toggle Circle Button (Positioned over the right edge in both open and closed states) */}
      <button
        type="button"
        onClick={handleToggleRightPanel}
        title={isRightPanelOpen ? 'Close calendar sidebar' : 'Open calendar sidebar'}
        aria-label={isRightPanelOpen ? 'Close calendar sidebar' : 'Open calendar sidebar'}
        className="flex absolute right-0 xl:-right-4.5 top-1/2 -translate-y-1/2 z-40 items-center justify-center w-8 h-8 xl:w-9 xl:h-9 rounded-full bg-surface border border-border shadow-md hover:shadow-lg hover:border-primary/60 hover:bg-surface-muted text-text-secondary hover:text-primary transition-all duration-200 cursor-pointer group hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {isRightPanelOpen ? (
          <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        ) : (
          <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        )}
      </button>
    </div>

      {/* Right Context Panel (Calendar & Upcoming Tasks) */}
      {/* 1. Backdrop on < xl */}
      {isRightPanelOpen && (
        <div
          className="fixed inset-0 bg-text-primary/40 z-50 xl:hidden transition-opacity"
          onClick={handleCloseRightPanel}
          aria-hidden="true"
        />
      )}

      {/* 2. Container: Slide-over drawer on < xl, side-by-side flex panel on >= xl */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 xl:static xl:z-auto flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out ${
          isRightPanelOpen
            ? 'translate-x-0 w-80 sm:w-88 xl:w-84 opacity-100 bg-surface shadow-2xl xl:shadow-none'
            : 'translate-x-full xl:translate-x-0 xl:w-0 xl:opacity-0 pointer-events-none xl:-mr-4 xl:lg:-mr-6'
        }`}
        aria-hidden={!isRightPanelOpen}
      >
        {/* Sliding Inner Panel Container */}
        <div className="w-80 sm:w-88 xl:w-84 h-full shrink-0 overflow-hidden relative">
          {/* Close button for < xl drawer */}
          <button
            type="button"
            onClick={() => setIsRightPanelOpen(false)}
            className="xl:hidden absolute top-3 right-3 p-1.5 rounded-full bg-surface-muted hover:bg-surface-hover text-text-muted hover:text-text-primary z-20 cursor-pointer shadow-xs border border-border"
            aria-label="Close calendar sidebar"
          >
            <X className="w-4 h-4" />
          </button>

          <RightContextPanel
            user={user}
            board={board}
            cards={allBoardCards}
            onCardClick={onCardClick}
            onSelectNotificationCard={onSelectNotificationCard}
            onOpenAllNotifications={onOpenAllNotifications}
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
        isOpen={isInviteMemberModalOpen}
        onClose={() => setIsInviteMemberModalOpen(false)}
        title="Invite to Board"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsInviteMemberModalOpen(false)}>
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
              <List list={remote.list} cards={remote.list.cards || []} taskNumberMap={taskNumberMap} isOverlay={true} />
            ) : remote.card ? (
              <div className="w-72">
                <Card
                  card={remote.card}
                  listName={(board?.lists || visibleLists || []).find((l) => l.id === remote.card.list_id)?.name || remote.card.list_name}
                  taskNumber={taskNumberMap.get(remote.card.id) ?? remote.card.task_number}
                  isOverlay={true}
                />
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
