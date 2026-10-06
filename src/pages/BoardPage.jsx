import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import WorkspaceSidebar from '../components/Sidebar/WorkspaceSidebar';
import Board from '../components/Board/Board';
import ConfirmModal from '../components/shared/ConfirmModal';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { getTenantItem, setTenantItem } from '../lib/storage';

const CardDetailModal = React.lazy(() => import('../components/Card/CardDetailModal'));
const CreateBoardModal = React.lazy(() => import('../components/Board/CreateBoardModal'));
const CreateWorkspaceModal = React.lazy(() => import('../components/Sidebar/CreateWorkspaceModal'));
const ArchivePage = React.lazy(() => import('../components/Archive/ArchivePage'));
const NotificationsPage = React.lazy(() => import('../components/Notifications/NotificationsPage'));
const BoardShareModal = React.lazy(() => import('../components/Board/BoardShareModal'));
const InviteModal = React.lazy(() => import('../components/Board/InviteModal'));
const WorkspaceHomePage = React.lazy(() => import('../pages/WorkspaceHomePage'));
const MembersPage = React.lazy(() => import('../pages/MembersPage'));
const ActivityPage = React.lazy(() => import('../pages/ActivityPage'));
const ReportsPage = React.lazy(() => import('../pages/ReportsPage'));
const SettingsPage = React.lazy(() => import('../pages/SettingsPage'));
const ListView = React.lazy(() => import('../components/Board/ListView'));
const CalendarView = React.lazy(() => import('../components/Board/CalendarView'));
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage'));

import { getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace } from '../api/workspaces';
import { getBoards, createBoard, getBoard, updateBoard, deleteBoard, addBoardMember, createBoardLabel } from '../api/boards';
import { createList, updateList, deleteList } from '../api/lists';
import {
  createCard,
  updateCard,
  deleteCard,
  toggleCardLabel,
  toggleCardMember,
  addComment,
  deleteComment,
  addChecklist,
  deleteChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  uploadAttachment,
  addLinkAttachment,
  deleteAttachment
} from '../api/cards';
import { getArchive } from '../api/archive';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { PermissionProvider } from '../context/PermissionContext';
import { useSocket } from '../context/SocketProvider';
import { useToast } from '../components/ui/Toast';
import { recordLocalUpdate } from '../lib/mutationTracker';

export default function BoardPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { workspaceId, '*': subPath = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [boardData, setBoardData] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [archiveData, setArchiveData] = useState({ workspaces: [], boards: [], cards: [] });
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Parse path segments for project views: e.g. "p/:boardId/board|list|calendar"
  const pathParts = subPath ? subPath.split('/') : [];
  const isProjectRoute = pathParts[0] === 'p';
  const urlBoardId = isProjectRoute && pathParts[1] ? Number(pathParts[1]) : null;
  const currentView = isProjectRoute ? pathParts[2] || 'board' : 'board';

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Keep a ref to activeBoardId to avoid stale closures in event handlers
  const activeBoardIdRef = useRef(urlBoardId);
  useEffect(() => {
    activeBoardIdRef.current = urlBoardId;
  }, [urlBoardId]);

  // Sidebar Collapse State (tenant namespaced)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return getTenantItem(user?.tenant_id, 'sidebar_collapsed', false);
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      setTenantItem(user?.tenant_id, 'sidebar_collapsed', next);
      return next;
    });
  };

  // Custom Confirm Modal state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: () => {}
  });

  const openConfirmModal = ({ title, message, confirmText = 'Confirm', variant = 'danger', onConfirm }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      variant,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await onConfirm();
      }
    });
  };

  // Load Workspaces on mount and validate workspaceId from URL
  const loadWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const data = await getWorkspaces();
      const fetchedWorkspaces = data.workspaces || [];
      setWorkspaces(fetchedWorkspaces);

      if (!workspaceId) {
        setIsNotFound(true);
        return;
      }

      const matchedWs = fetchedWorkspaces.find((w) => String(w.id) === String(workspaceId));
      if (matchedWs) {
        setActiveWorkspace(matchedWs);
        setIsNotFound(false);
        setTenantItem(user?.tenant_id, 'last_workspace_id', matchedWs.id);
      } else {
        // Workspace ID not found or unauthorized
        setIsNotFound(true);
        setActiveWorkspace(null);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setIsNotFound(true);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [workspaceId, user?.tenant_id]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const data = await getArchive();
      setArchiveData({
        workspaces: data.workspaces || [],
        boards: data.boards || [],
        cards: data.cards || []
      });
    } catch (err) {
      console.error('Failed to load archive:', err);
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subPath === 'archive') {
      loadArchive();
    }
  }, [subPath, loadArchive]);

  // Load Boards when Active Workspace changes
  const loadBoards = useCallback(async (wsId) => {
    if (!wsId) return;
    try {
      const data = await getBoards(wsId);
      const fetchedBoards = data.boards || [];
      setBoards(fetchedBoards);
    } catch (err) {
      console.error('Failed to load boards:', err);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace?.id) {
      loadBoards(activeWorkspace.id);
    }
  }, [activeWorkspace?.id, loadBoards]);

  // Load Active Board Details
  const loadActiveBoard = useCallback(async (id) => {
    const targetId = id || activeBoardIdRef.current;
    if (!targetId) return;
    setLoading(true);
    try {
      const data = await getBoard(targetId);
      setBoardData(data.board);
      setTenantItem(user?.tenant_id, 'last_board_id', targetId);
    } catch (err) {
      console.error('Failed to load board details:', err);
      setIsNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    if (urlBoardId) {
      loadActiveBoard(urlBoardId);
    } else {
      setBoardData(null);
      setLoading(false);
    }
  }, [urlBoardId, loadActiveBoard]);

  // If viewing project without subview, redirect to /board
  useEffect(() => {
    if (isProjectRoute && pathParts[1] && !pathParts[2]) {
      navigate(`/w/${workspaceId}/p/${pathParts[1]}/board`, { replace: true });
    }
  }, [isProjectRoute, pathParts, workspaceId, navigate]);

  // Root of workspace redirect to home or remembered board
  useEffect(() => {
    if (!subPath && activeWorkspace?.id) {
      const rememberedBoardId = getTenantItem(user?.tenant_id, 'last_board_id', null);
      if (rememberedBoardId && boards.some((b) => b.id === Number(rememberedBoardId))) {
        navigate(`/w/${activeWorkspace.id}/p/${rememberedBoardId}/board`, { replace: true });
      } else if (boards.length > 0) {
        navigate(`/w/${activeWorkspace.id}/p/${boards[0].id}/board`, { replace: true });
      } else {
        navigate(`/w/${activeWorkspace.id}/home`, { replace: true });
      }
    }
  }, [subPath, activeWorkspace?.id, boards, navigate, user?.tenant_id]);

  // Synchronize selectedCard with URL query param ?card= or ?modal=
  const cardIdParam = searchParams.get('card') || searchParams.get('modal');
  useEffect(() => {
    if (cardIdParam && boardData) {
      let found = null;
      (boardData.lists || []).forEach((l) => {
        (l.cards || []).forEach((c) => {
          if (String(c.id) === String(cardIdParam)) found = c;
        });
      });
      if (found) {
        setSelectedCard(found);
      }
    } else if (!cardIdParam) {
      setSelectedCard(null);
    }
  }, [cardIdParam, boardData]);

  // Synchronize Document Title per route
  useEffect(() => {
    if (subPath === 'home') {
      document.title = `${activeWorkspace?.name || 'Workspace'} - Home | TaskFlow`;
    } else if (subPath === 'notifications') {
      document.title = 'Notifications - TaskFlow';
    } else if (subPath === 'archive') {
      document.title = 'Archive - TaskFlow';
    } else if (subPath === 'members') {
      document.title = `${activeWorkspace?.name || 'Workspace'} - Members | TaskFlow`;
    } else if (subPath === 'activity') {
      document.title = `${activeWorkspace?.name || 'Workspace'} - Activity | TaskFlow`;
    } else if (subPath === 'reports') {
      document.title = `${activeWorkspace?.name || 'Workspace'} - Reports | TaskFlow`;
    } else if (boardData) {
      if (currentView === 'list') {
        document.title = `${boardData.name} (List) - TaskFlow`;
      } else if (currentView === 'calendar') {
        document.title = `${boardData.name} (Calendar) - TaskFlow`;
      } else {
        document.title = `${boardData.name} - TaskFlow`;
      }
    }
  }, [subPath, activeWorkspace, boardData, currentView]);

  // Handle Notification click navigation directly to card modal
  const handleSelectNotificationCard = ({ cardId, boardId }) => {
    navigate(`/w/${workspaceId}/p/${boardId}/board?card=${cardId}`);
  };

  // Handle Real-Time WebSocket Board & Card Events directly in React state
  const handleLiveBoardSocketEvent = useCallback((eventName, data) => {
    if (!data) return;

    setBoardData((prevBoard) => {
      if (!prevBoard) return prevBoard;

      switch (eventName) {
        case 'card:created': {
          const newCard = data.card;
          if (!newCard) return prevBoard;
          const targetListId = Number(newCard.list_id);
          const updatedLists = (prevBoard.lists || []).map((l) => {
            if (l.id === targetListId) {
              const existing = (l.cards || []).some((c) => c.id === newCard.id);
              if (existing) return l;
              const newCards = [...(l.cards || []), newCard];
              newCards.sort((a, b) => a.position - b.position);
              return { ...l, cards: newCards };
            }
            return l;
          });
          return { ...prevBoard, lists: updatedLists };
        }

        case 'card:moved': {
          const cardId = Number(data.cardId || data.card?.id);
          const targetListId = Number(data.toListId || data.targetListId || data.card?.list_id);
          const position = Number(data.newPosition ?? data.position ?? data.card?.position);

          let movedCard = data.card;
          const updatedLists = (prevBoard.lists || []).map((l) => {
            const filteredCards = (l.cards || []).filter((c) => {
              if (c.id === cardId) {
                if (!movedCard) movedCard = { ...c, list_id: targetListId, position };
                else movedCard = { ...movedCard, list_id: targetListId, position };
                return false;
              }
              return true;
            });
            return { ...l, cards: filteredCards };
          });

          if (movedCard) {
            const targetIdx = updatedLists.findIndex((l) => Number(l.id) === targetListId);
            if (targetIdx !== -1) {
              updatedLists[targetIdx].cards.push(movedCard);
              updatedLists[targetIdx].cards.sort((a, b) => a.position - b.position);
            }
          }

          setSelectedCard((prevSelected) => {
            if (prevSelected && prevSelected.id === cardId) {
              return { ...prevSelected, list_id: targetListId, position };
            }
            return prevSelected;
          });

          return { ...prevBoard, lists: updatedLists };
        }

        case 'card:updated': {
          const cardId = Number(data.cardId || data.card?.id);
          const { updates, card: fullCard } = data;
          const updatedLists = (prevBoard.lists || []).map((l) => ({
            ...l,
            cards: (l.cards || []).map((c) => {
              if (c.id === cardId) {
                return fullCard ? { ...c, ...fullCard } : { ...c, ...updates };
              }
              return c;
            })
          }));

          setSelectedCard((prevSelected) => {
            if (prevSelected && prevSelected.id === cardId) {
              return fullCard ? { ...prevSelected, ...fullCard } : { ...prevSelected, ...updates };
            }
            return prevSelected;
          });

          return { ...prevBoard, lists: updatedLists };
        }

        case 'card:deleted': {
          const cardId = Number(data.cardId || data.card?.id);
          const updatedLists = (prevBoard.lists || []).map((l) => ({
            ...l,
            cards: (l.cards || []).filter((c) => c.id !== cardId)
          }));

          setSelectedCard((prevSelected) => {
            if (prevSelected && prevSelected.id === cardId) {
              return null;
            }
            return prevSelected;
          });

          return { ...prevBoard, lists: updatedLists };
        }

        case 'comment:added': {
          const cardId = Number(data.cardId || data.comment?.card_id);
          const comment = data.comment;
          if (comment) {
            setSelectedCard((prevSelected) => {
              if (prevSelected && prevSelected.id === cardId) {
                const existing = (prevSelected.comments || []).some((cm) => cm.id === comment.id);
                if (existing) return prevSelected;
                return {
                  ...prevSelected,
                  comments: [comment, ...(prevSelected.comments || [])]
                };
              }
              return prevSelected;
            });

            const updatedLists = (prevBoard.lists || []).map((l) => ({
              ...l,
              cards: (l.cards || []).map((c) => {
                if (c.id === cardId) {
                  return { ...c, comments_count: (Number(c.comments_count) || 0) + 1 };
                }
                return c;
              })
            }));
            return { ...prevBoard, lists: updatedLists };
          }
          return prevBoard;
        }

        case 'member:added': {
          const cardId = Number(data.cardId);
          const member = data.member;
          if (member) {
            setSelectedCard((prevSelected) => {
              if (prevSelected && prevSelected.id === cardId) {
                const existing = (prevSelected.members || []).some((m) => m.id === member.id);
                if (existing) return prevSelected;
                return { ...prevSelected, members: [...(prevSelected.members || []), member] };
              }
              return prevSelected;
            });

            const updatedLists = (prevBoard.lists || []).map((l) => ({
              ...l,
              cards: (l.cards || []).map((c) => {
                if (c.id === cardId) {
                  const existing = (c.members || []).some((m) => m.id === member.id);
                  if (existing) return c;
                  return { ...c, members: [...(c.members || []), member] };
                }
                return c;
              })
            }));
            return { ...prevBoard, lists: updatedLists };
          }
          return prevBoard;
        }

        case 'member:removed': {
          const cardId = Number(data.cardId);
          const userId = Number(data.userId);
          setSelectedCard((prevSelected) => {
            if (prevSelected && prevSelected.id === cardId) {
              return {
                ...prevSelected,
                members: (prevSelected.members || []).filter((m) => m.id !== userId)
              };
            }
            return prevSelected;
          });

          const updatedLists = (prevBoard.lists || []).map((l) => ({
            ...l,
            cards: (l.cards || []).map((c) => {
              if (c.id === cardId) {
                return { ...c, members: (c.members || []).filter((m) => m.id !== userId) };
              }
              return c;
            })
          }));
          return { ...prevBoard, lists: updatedLists };
        }

        case 'checklist_item:toggled': {
          const cardId = Number(data.cardId);
          const itemId = Number(data.itemId);
          const isChecked = Boolean(data.is_checked);
          setSelectedCard((prevSelected) => {
            if (prevSelected && prevSelected.id === cardId) {
              const updatedChecklists = (prevSelected.checklists || []).map((chk) => ({
                ...chk,
                items: (chk.items || []).map((it) => (it.id === itemId ? { ...it, is_checked: isChecked } : it))
              }));
              return { ...prevSelected, checklists: updatedChecklists };
            }
            return prevSelected;
          });
          return prevBoard;
        }

        case 'list:created': {
          const newList = data.list;
          if (!newList) return prevBoard;
          const existing = (prevBoard.lists || []).some((l) => l.id === newList.id);
          if (existing) return prevBoard;
          const newLists = [...(prevBoard.lists || []), newList];
          newLists.sort((a, b) => a.position - b.position);
          return { ...prevBoard, lists: newLists };
        }

        case 'list:updated': {
          const listId = Number(data.listId || data.list?.id);
          const { updates, list: fullList } = data;
          const updatedLists = (prevBoard.lists || []).map((l) => {
            if (l.id === listId) {
              return fullList ? { ...l, ...fullList } : { ...l, ...updates };
            }
            return l;
          });
          return { ...prevBoard, lists: updatedLists };
        }

        case 'list:reordered': {
          const listId = Number(data.listId || data.list?.id);
          const position = Number(data.position ?? data.list?.position);
          const updatedLists = (prevBoard.lists || []).map((l) =>
            l.id === listId ? { ...l, position } : l
          );
          updatedLists.sort((a, b) => a.position - b.position);
          return { ...prevBoard, lists: updatedLists };
        }

        case 'list:deleted': {
          const listId = Number(data.listId || data.list?.id);
          const updatedLists = (prevBoard.lists || []).filter((l) => l.id !== listId);
          return { ...prevBoard, lists: updatedLists };
        }

        default:
          return prevBoard;
      }
    });
  }, []);

  // Handler: Rename Workspace
  const handleRenameWorkspace = async (newName) => {
    if (!activeWorkspace || !newName.trim()) return;
    try {
      const data = await updateWorkspace(activeWorkspace.id, { name: newName.trim() });
      if (data?.workspace) {
        setActiveWorkspace((prev) => (prev ? { ...prev, name: data.workspace.name } : null));
        await loadWorkspaces();
        toast.success('Workspace renamed');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to rename workspace');
    }
  };

  // Handler: Create Workspace
  const handleCreateWorkspace = async (name) => {
    try {
      const data = await createWorkspace(name);
      if (data?.workspace) {
        localStorage.setItem('activeWorkspaceId', data.workspace.id);
        setWorkspaces((prev) => [...prev, data.workspace]);
        setActiveWorkspace(data.workspace);
        loadWorkspaces();
        loadBoards(data.workspace.id);
        toast.success('Workspace created');
        return data.workspace;
      }
      return null;
    } catch (err) {
      toast.error(err?.message || 'Failed to create workspace');
      return null;
    }
  };

  const handleArchiveCurrentWorkspace = () => {
    if (!activeWorkspace) return;
    openConfirmModal({
      title: 'Archive Workspace',
      message: `Archive workspace "${activeWorkspace.name}"? You can restore it anytime from View Archived.`,
      confirmText: 'Archive Workspace',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await updateWorkspace(activeWorkspace.id, { is_archived: true });
          localStorage.removeItem('activeWorkspaceId');
          localStorage.removeItem('activeBoardId');
          setActiveWorkspace(null);
          setBoardData(null);
          await loadWorkspaces();
          if (isArchiveOpen) await loadArchive();
          toast.success('Workspace archived', {
            action: {
              label: 'Undo',
              onClick: async () => {
                try {
                  await updateWorkspace(activeWorkspace.id, { is_archived: false });
                  await loadWorkspaces();
                  toast.success('Workspace restored');
                } catch (e) { toast.error('Failed to undo'); }
              }
            }
          });
        } catch (err) {
          toast.error(err?.message || 'Failed to archive workspace');
        }
      }
    });
  };

  const handleDeleteCurrentWorkspace = () => {
    if (!activeWorkspace) return;
    openConfirmModal({
      title: 'Delete Workspace',
      message: `Delete workspace "${activeWorkspace.name}" and everything inside it? This action cannot be undone.`,
      confirmText: 'Delete Workspace',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteWorkspace(activeWorkspace.id);
          localStorage.removeItem('activeWorkspaceId');
          localStorage.removeItem('activeBoardId');
          setActiveWorkspace(null);
          setBoardData(null);
          await loadWorkspaces();
          if (isArchiveOpen) await loadArchive();
          toast.success('Workspace deleted');
        } catch (err) {
          toast.error(err?.message || 'Failed to delete workspace');
        }
      }
    });
  };

  const handleRestoreWorkspace = async (workspaceId) => {
    try {
      await updateWorkspace(workspaceId, { is_archived: false });
      await loadArchive();
      await loadWorkspaces();
      toast.success('Workspace restored');
    } catch (err) {
      toast.error(err?.message || 'Failed to restore workspace');
    }
  };

  const handleDeleteWorkspace = (workspaceId) => {
    openConfirmModal({
      title: 'Delete Workspace',
      message: 'Delete this workspace and everything inside it? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteWorkspace(workspaceId);
          await loadArchive();
          await loadWorkspaces();
          toast.success('Workspace deleted');
        } catch (err) {
          toast.error(err?.message || 'Failed to delete workspace');
        }
      }
    });
  };

  // Handler: Create Board
  const handleCreateBoard = async (wsIdOrName, nameOrColor, color) => {
    const wsId = color !== undefined ? Number(wsIdOrName) : activeWorkspace?.id;
    const name = color !== undefined ? nameOrColor : wsIdOrName;
    const bgColor = color !== undefined ? color : nameOrColor;
    if (!wsId || !name) return null;

    const tempId = 'temp-' + Date.now();
    const optimisticBoard = {
      id: tempId,
      workspace_id: wsId,
      name,
      background_color: bgColor || 'bg-board-neutral',
      lists: []
    };

    if (wsId === activeWorkspace?.id) {
      setBoards((prev) => [...prev, optimisticBoard]);
    }

    try {
      const data = await createBoard(wsId, name, bgColor);
      if (data?.board) {
        if (wsId === activeWorkspace?.id) {
          setBoards((prev) => prev.map((b) => (b.id === tempId ? data.board : b)));
        }
        localStorage.setItem('activeBoardId', data.board.id);
        loadBoards(wsId);
        loadActiveBoard(data.board.id);
        toast.success('Board created');
        navigate(`/w/${wsId}/p/${data.board.id}/board`);
        return data.board;
      }
      return null;
    } catch (err) {
      if (wsId === activeWorkspace?.id) {
        setBoards((prev) => prev.filter((b) => b.id !== tempId));
      }
      toast.error(err?.message || 'Failed to create board');
      return null;
    }
  };

  // Handler: Update Board
  const handleUpdateBoard = async (boardId, updates) => {
    const prevBoards = boards;
    const prevBoardData = boardData;
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, ...updates } : b))
    );
    setBoardData((prev) => (prev && prev.id === boardId ? { ...prev, ...updates } : prev));
    try {
      await updateBoard(boardId, updates);
      loadActiveBoard(boardId);
    } catch (err) {
      setBoards(prevBoards);
      setBoardData(prevBoardData);
      toast.error(err?.message || 'Failed to update board');
    }
  };

  const handleArchiveCurrentBoard = () => {
    const targetBoardId = urlBoardId || boardData?.id;
    if (!targetBoardId || !boardData) return;
    openConfirmModal({
      title: 'Archive Board',
      message: `Archive board "${boardData.name}"? You can restore it anytime from View Archived.`,
      confirmText: 'Archive Board',
      variant: 'warning',
      onConfirm: async () => {
        const archivedBoardId = targetBoardId;
        const prevBoards = boards;
        setBoards((prev) => prev.filter((b) => b.id !== archivedBoardId));
        localStorage.removeItem('activeBoardId');
        setBoardData(null);
        try {
          await updateBoard(archivedBoardId, { is_archived: true });
          if (activeWorkspace) {
            await loadBoards(activeWorkspace.id);
            navigate(`/w/${activeWorkspace.id}/home`);
          }
          if (isArchiveOpen) await loadArchive();
          toast.success('Board archived', {
            action: {
              label: 'Undo',
              onClick: async () => {
                try {
                  await updateBoard(archivedBoardId, { is_archived: false });
                  if (activeWorkspace) {
                    await loadBoards(activeWorkspace.id);
                    navigate(`/w/${activeWorkspace.id}/p/${archivedBoardId}/board`);
                  }
                  toast.success('Board restored');
                } catch (e) { toast.error('Failed to undo'); }
              }
            }
          });
        } catch (err) {
          setBoards(prevBoards);
          toast.error(err?.message || 'Failed to archive board');
        }
      }
    });
  };

  const handleDeleteCurrentBoard = () => {
    const targetBoardId = urlBoardId || boardData?.id;
    if (!targetBoardId || !boardData) return;
    openConfirmModal({
      title: 'Delete Board',
      message: `Delete board "${boardData.name}" and all its cards? This action cannot be undone.`,
      confirmText: 'Delete Board',
      variant: 'danger',
      onConfirm: async () => {
        const prevBoards = boards;
        setBoards((prev) => prev.filter((b) => b.id !== targetBoardId));
        localStorage.removeItem('activeBoardId');
        setBoardData(null);
        try {
          await deleteBoard(targetBoardId);
          if (activeWorkspace) {
            await loadBoards(activeWorkspace.id);
            navigate(`/w/${activeWorkspace.id}/home`);
          }
          if (isArchiveOpen) await loadArchive();
          toast.success('Board deleted successfully');
        } catch (err) {
          setBoards(prevBoards);
          const readableMsg = err?.data?.error?.message || err?.message || 'Failed to delete board';
          toast.error(readableMsg, { requestId: err?.requestId });
        }
      }
    });
  };

  const handleRestoreBoard = async (boardId) => {
    try {
      await updateBoard(boardId, { is_archived: false });
      await loadArchive();
      if (activeWorkspace) await loadBoards(activeWorkspace.id);
      toast.success('Board restored');
    } catch (err) {
      toast.error(err?.message || 'Failed to restore board', { requestId: err?.requestId });
    }
  };

  const handleDeleteBoard = (boardId) => {
    openConfirmModal({
      title: 'Delete Board',
      message: 'Delete this board and all its cards? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        const prevBoards = boards;
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
        try {
          await deleteBoard(boardId);
          await loadArchive();
          if (activeWorkspace) await loadBoards(activeWorkspace.id);
          toast.success('Board deleted successfully');
        } catch (err) {
          setBoards(prevBoards);
          const readableMsg = err?.data?.error?.message || err?.message || 'Failed to delete board';
          toast.error(readableMsg, { requestId: err?.requestId });
        }
      }
    });
  };

  // Handler: Create List
  const handleCreateList = async (boardId, name) => {
    try {
      const data = await createList(boardId, name);
      if (data?.list) {
        setBoardData((prev) => {
          if (!prev || prev.id !== boardId) return prev;
          return { ...prev, lists: [...(prev.lists || []), { ...data.list, cards: [] }] };
        });
      }
      loadActiveBoard(boardId);
    } catch (err) {
      toast.error(err?.message || 'Failed to create list');
    }
  };

  // Handler: Update List (optimistic with rollback)
  const handleUpdateList = async (listId, updates) => {
    const prevBoardData = boardData;
    setBoardData((prev) => {
      if (!prev) return prev;
      const updatedLists = prev.lists.map((l) =>
        l.id === listId ? { ...l, ...updates } : l
      );
      return { ...prev, lists: updatedLists };
    });
    try {
      await updateList(listId, updates);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      setBoardData(prevBoardData);
      toast.error(err?.message || 'Failed to update list');
    }
  };

  // Handler: Update List Position (Reordering)
  const handleUpdateListPosition = async (listId, newPosition) => {
    const prevBoardData = boardData;
    setBoardData((prev) => {
      if (!prev) return prev;
      const updatedLists = prev.lists.map((l) => (l.id === listId ? { ...l, position: newPosition } : l));
      updatedLists.sort((a, b) => a.position - b.position);
      return { ...prev, lists: updatedLists };
    });
    try {
      await updateList(listId, { position: newPosition });
    } catch (err) {
      setBoardData(prevBoardData);
      toast.error(err?.message || 'Failed to reorder list');
    }
  };

  // Handler: Delete List
  const handleDeleteList = async (listId) => {
    const prevBoardData = boardData;
    setBoardData((prev) => {
      if (!prev) return prev;
      return { ...prev, lists: (prev.lists || []).filter((l) => l.id !== listId) };
    });
    try {
      await deleteList(listId);
      loadActiveBoard(activeBoardIdRef.current);
      toast.success('List deleted');
    } catch (err) {
      setBoardData(prevBoardData);
      toast.error(err?.message || 'Failed to delete list');
    }
  };

  // Handler: Create Card
  const handleCreateCard = async (listId, title) => {
    try {
      const data = await createCard(listId, title);
      const newCard = data?.card;
      if (newCard) {
        setBoardData((prev) => {
          if (!prev) return prev;
          const updatedLists = (prev.lists || []).map((l) => {
            if (l.id === listId) {
              return { ...l, cards: [...(l.cards || []), newCard] };
            }
            return l;
          });
          return { ...prev, lists: updatedLists };
        });
      }
      await loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to create card');
    }
  };

  const handleCopyCard = async (sourceCard, target) => {
    try {
      const data = await createCard(
        target.listId,
        `(Copy) ${sourceCard.title}`,
        sourceCard.description || '',
        undefined,
        sourceCard.due_date || null
      );

      const copiedCard = data?.card;
      if (copiedCard && (sourceCard.start_date || sourceCard.is_complete)) {
        const updates = {};
        if (sourceCard.start_date) updates.start_date = sourceCard.start_date;
        if (sourceCard.is_complete) updates.is_complete = sourceCard.is_complete;
        await updateCard(copiedCard.id, updates);
      }

      if (target.boardId === activeBoardIdRef.current) {
        await loadActiveBoard(activeBoardIdRef.current);
      }
      toast.success('Card copied');
    } catch (err) {
      toast.error(err?.message || 'Failed to copy card');
    }
  };

  const handleRestoreCard = async (cardId) => {
    try {
      await updateCard(cardId, { is_archived: false });
      await loadArchive();
      if (activeBoardIdRef.current) await loadActiveBoard(activeBoardIdRef.current);
      toast.success('Card restored');
    } catch (err) {
      toast.error(err?.message || 'Failed to restore card');
    }
  };

  const handleDeleteArchivedCard = (cardId) => {
    openConfirmModal({
      title: 'Delete Card',
      message: 'Delete this card permanently? This action cannot be undone.',
      confirmText: 'Delete Card',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteCard(cardId);
          await loadArchive();
          if (activeBoardIdRef.current) await loadActiveBoard(activeBoardIdRef.current);
          toast.success('Card deleted');
        } catch (err) {
          toast.error(err?.message || 'Failed to delete card');
        }
      }
    });
  };

  // Handler: Update Card Position / List (Move Card)
  const handleUpdateCardPosition = async (cardId, targetListId, newPosition) => {
    const prevBoardData = boardData;
    setBoardData((prev) => {
      if (!prev) return prev;

      let movedCard = null;
      const newLists = prev.lists.map((l) => {
        const filteredCards = (l.cards || []).filter((c) => {
          if (c.id === cardId) {
            movedCard = { ...c, list_id: targetListId, position: newPosition };
            return false;
          }
          return true;
        });
        return { ...l, cards: filteredCards };
      });

      if (movedCard) {
        const targetListIdx = newLists.findIndex((l) => l.id === targetListId);
        if (targetListIdx !== -1) {
          newLists[targetListIdx].cards.push(movedCard);
          newLists[targetListIdx].cards.sort((a, b) => a.position - b.position);
        }
      }

      return { ...prev, lists: newLists };
    });

    try {
      await updateCard(cardId, { list_id: targetListId, position: newPosition });
    } catch (err) {
      setBoardData(prevBoardData);
      toast.error(err?.message || 'Failed to move card');
    }
  };

  // Handler: Move Card via List Selector Dropdown
  const handleMoveCardList = async (cardId, targetListId) => {
    const targetList = (boardData?.lists || []).find((l) => l.id === targetListId);
    const targetCards = targetList?.cards || [];
    const maxPos = targetCards.length > 0 ? targetCards[targetCards.length - 1].position : 0;
    const newPosition = maxPos + 1000.0;

    setSelectedCard((prev) =>
      prev && prev.id === cardId ? { ...prev, list_id: targetListId } : prev
    );

    await handleUpdateCardPosition(cardId, targetListId, newPosition);
  };

  // Handler: Update Card
  const handleUpdateCard = async (cardId, updates) => {
    recordLocalUpdate('card', cardId);
    const prevSelectedCard = selectedCard;
    const prevBoardData = boardData;
    setSelectedCard((prev) => (prev && prev.id === cardId ? { ...prev, ...updates } : prev));
    setBoardData((prev) => {
      if (!prev) return prev;
      const updatedLists = prev.lists.map((l) => ({
        ...l,
        cards: (l.cards || []).map((c) => (c.id === cardId ? { ...c, ...updates } : c))
      }));
      return { ...prev, lists: updatedLists };
    });

    try {
      await updateCard(cardId, updates);
      loadActiveBoard(activeBoardIdRef.current);
      if (updates.is_archived === true) {
        toast.success('Card archived', {
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await updateCard(cardId, { is_archived: false });
                loadActiveBoard(activeBoardIdRef.current);
                if (isArchiveOpen) await loadArchive();
                toast.success('Card restored');
              } catch (e) {
                toast.error('Failed to undo card archive');
              }
            }
          }
        });
      }
    } catch (err) {
      setSelectedCard(prevSelectedCard);
      setBoardData(prevBoardData);
      toast.error(err?.message || 'Failed to update card');
    }
  };

  // Handler: Delete Card
  const handleDeleteCard = async (cardId) => {
    try {
      await deleteCard(cardId);
      setSelectedCard(null);
      loadActiveBoard(activeBoardIdRef.current);
      toast.success('Card deleted');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete card');
    }
  };

  // Card Extra Handlers
  const handleToggleLabel = async (cardId, labelId) => {
    try {
      await toggleCardLabel(cardId, labelId);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to toggle label');
    }
  };

  const handleToggleMember = async (cardId, userId) => {
    try {
      await toggleCardMember(cardId, userId);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to toggle member');
    }
  };

  const handleAddComment = async (cardId, body) => {
    try {
      await addComment(cardId, body);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete comment');
    }
  };

  const handleAddChecklist = async (cardId, title) => {
    try {
      await addChecklist(cardId, title);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to add checklist');
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    try {
      await deleteChecklist(checklistId);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete checklist');
    }
  };

  const handleAddChecklistItem = async (checklistId, text) => {
    try {
      await addChecklistItem(checklistId, text);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to add checklist item');
    }
  };

  const handleUpdateChecklistItem = async (itemId, updates) => {
    recordLocalUpdate('checklist_item', itemId);
    const prevSelectedCard = selectedCard;
    const prevBoardData = boardData;

    // Optimistically update selectedCard
    setSelectedCard((prev) => {
      if (!prev || !prev.checklists) return prev;
      return {
        ...prev,
        checklists: prev.checklists.map((ch) => ({
          ...ch,
          items: (ch.items || []).map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        }))
      };
    });

    // Optimistically update boardData
    setBoardData((prev) => {
      if (!prev || !prev.lists) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l) => ({
          ...l,
          cards: (l.cards || []).map((c) => {
            if (!c.checklists) return c;
            return {
              ...c,
              checklists: c.checklists.map((ch) => ({
                ...ch,
                items: (ch.items || []).map((item) =>
                  item.id === itemId ? { ...item, ...updates } : item
                )
              }))
            };
          })
        }))
      };
    });

    try {
      await updateChecklistItem(itemId, updates);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      setSelectedCard(prevSelectedCard);
      setBoardData(prevBoardData);
      toast.error(err?.message || 'Failed to update checklist item');
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    try {
      await deleteChecklistItem(itemId);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete checklist item');
    }
  };

  // Attachment Handlers
  const handleUploadAttachment = async (cardId, file) => {
    try {
      const data = await uploadAttachment(cardId, file);
      if (data?.attachment) {
        setSelectedCard((prev) =>
          prev && prev.id === cardId
            ? { ...prev, attachments: [data.attachment, ...(prev.attachments || [])] }
            : prev
        );
      }
      loadActiveBoard(activeBoardIdRef.current);
      toast.success('Attachment uploaded');
    } catch (err) {
      toast.error(err?.message || 'Failed to upload attachment');
    }
  };

  const handleAddLinkAttachment = async (cardId, linkUrl, displayName) => {
    try {
      const data = await addLinkAttachment(cardId, linkUrl, displayName);
      if (data?.attachment) {
        setSelectedCard((prev) =>
          prev && prev.id === cardId
            ? { ...prev, attachments: [data.attachment, ...(prev.attachments || [])] }
            : prev
        );
      }
      loadActiveBoard(activeBoardIdRef.current);
      toast.success('Link attached');
    } catch (err) {
      toast.error(err?.message || 'Failed to attach link');
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    const prevSelectedCard = selectedCard;
    setSelectedCard((prev) =>
      prev
        ? { ...prev, attachments: (prev.attachments || []).filter((a) => a.id !== attachmentId) }
        : prev
    );
    try {
      await deleteAttachment(attachmentId);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      setSelectedCard(prevSelectedCard);
      toast.error(err?.message || 'Failed to delete attachment');
    }
  };

  const handleAddBoardMember = async (boardId, email) => {
    try {
      await addBoardMember(boardId, email);
      loadActiveBoard(boardId);
      toast.success('Member added');
    } catch (err) {
      toast.error(err?.message || 'Failed to add member');
    }
  };

  const handleCreateBoardLabel = async (name, color) => {
    if (!activeBoardIdRef.current) return;
    try {
      const res = await createBoardLabel(activeBoardIdRef.current, name, color);
      if (res?.label) {
        setBoardData((prev) => {
          if (!prev) return prev;
          return { ...prev, labels: [...(prev.labels || []), res.label] };
        });
      }
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to create label');
    }
  };

  return (
    <PermissionProvider workspaceId={activeWorkspace?.id}>
      <div className="flex h-screen w-screen overflow-hidden bg-app text-text-primary select-none relative">
        {/* Workspace Sidebar */}
        <WorkspaceSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={(ws) => {
            if (ws?.id) {
              navigate(`/w/${ws.id}/home`);
            }
          }}
          boards={boards}
          activeBoardId={urlBoardId}
          onSelectBoard={(id) => {
            if (activeWorkspace?.id && id) {
              navigate(`/w/${activeWorkspace.id}/p/${id}/board`);
            }
          }}
          onCreateWorkspaceClick={() => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('modal', 'create-workspace');
              return next;
            });
          }}
          onCreateBoardClick={() => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('modal', 'create-project');
              return next;
            });
          }}
          onViewArchive={() => {
            navigate(`/w/${workspaceId}/archive`);
          }}
          onOpenNotifications={() => {
            navigate(`/w/${workspaceId}/notifications`);
          }}
          onArchiveWorkspace={handleArchiveCurrentWorkspace}
          onDeleteWorkspace={handleDeleteCurrentWorkspace}
          onRenameWorkspace={handleRenameWorkspace}
        />

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
          {loadingWorkspaces ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app space-y-3">
              <Spinner size="lg" />
              <p className="text-xs font-semibold text-text-secondary">Loading Workspace...</p>
            </div>
          ) : isNotFound ? (
            <NotFoundPage />
          ) : subPath === 'home' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <WorkspaceHomePage
                workspace={activeWorkspace}
                boards={boards}
                onCreateBoard={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('modal', 'create-project');
                    return next;
                  });
                }}
              />
            </Suspense>
          ) : subPath === 'notifications' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <NotificationsPage
                onBack={() => navigate(`/w/${workspaceId}/home`)}
                onSelectNotificationCard={handleSelectNotificationCard}
                activeWorkspace={activeWorkspace}
                workspaces={workspaces}
              />
            </Suspense>
          ) : subPath === 'archive' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <ArchivePage
                archiveData={archiveData}
                isLoading={archiveLoading}
                onBack={() => navigate(`/w/${workspaceId}/home`)}
                onRefresh={loadArchive}
                onRestoreWorkspace={handleRestoreWorkspace}
                onDeleteWorkspace={handleDeleteWorkspace}
                onRestoreBoard={handleRestoreBoard}
                onDeleteBoard={handleDeleteBoard}
                onRestoreCard={handleRestoreCard}
                onDeleteCard={handleDeleteArchivedCard}
              />
            </Suspense>
          ) : subPath === 'members' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <MembersPage
                workspace={activeWorkspace}
                onOpenInvite={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('modal', 'invite');
                    return next;
                  });
                }}
              />
            </Suspense>
          ) : subPath === 'activity' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <ActivityPage workspace={activeWorkspace} />
            </Suspense>
          ) : subPath === 'reports' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <ReportsPage workspace={activeWorkspace} />
            </Suspense>
          ) : subPath.startsWith('settings') ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <SettingsPage
                tab={pathParts[1] || 'general'}
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                onWorkspaceUpdated={loadWorkspaces}
                onArchiveWorkspace={handleArchiveCurrentWorkspace}
                onDeleteWorkspace={handleDeleteCurrentWorkspace}
                onOpenInvite={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('modal', 'invite');
                    return next;
                  });
                }}
              />
            </Suspense>
          ) : isProjectRoute ? (
            loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app space-y-3">
                <Spinner size="lg" />
                <p className="text-xs font-semibold text-text-secondary">Loading Project...</p>
              </div>
            ) : currentView === 'list' && boardData ? (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
                <ListView
                  board={boardData}
                  onCardClick={(c) => {
                    setSelectedCard(c);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('card', String(c.id));
                      return next;
                    });
                  }}
                />
              </Suspense>
            ) : currentView === 'calendar' && boardData ? (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
                <CalendarView
                  board={boardData}
                  onCardClick={(c) => {
                    setSelectedCard(c);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('card', String(c.id));
                      return next;
                    });
                  }}
                />
              </Suspense>
            ) : boardData ? (
              <Board
                board={boardData}
                onUpdateBoard={handleUpdateBoard}
                onArchiveBoard={handleArchiveCurrentBoard}
                onDeleteBoard={handleDeleteCurrentBoard}
                onCreateList={handleCreateList}
                onUpdateList={handleUpdateList}
                onDeleteList={handleDeleteList}
                onCardClick={(c) => {
                  setSelectedCard(c);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('card', String(c.id));
                    return next;
                  });
                }}
                onCreateCard={handleCreateCard}
                onUpdateCardPosition={handleUpdateCardPosition}
                onUpdateListPosition={handleUpdateListPosition}
                onAddBoardMember={handleAddBoardMember}
                onInviteClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('modal', 'invite');
                    return next;
                  });
                }}
                onRefreshBoard={() => loadActiveBoard(urlBoardId)}
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                onSelectNotificationCard={handleSelectNotificationCard}
                onOpenAllNotifications={() => navigate(`/w/${workspaceId}/notifications`)}
                onBoardSocketEvent={handleLiveBoardSocketEvent}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-app">
                <div className="w-16 h-16 rounded-2xl bg-primary-tint text-primary border border-primary/20 flex items-center justify-center mb-6 shadow-xs">
                  <LayoutGrid className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">No Board Selected</h2>
                <p className="text-text-secondary max-w-sm mb-6 text-sm">
                  Select a board from the sidebar or create a new board to get started.
                </p>
                <button
                  onClick={() => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('modal', 'create-project');
                      return next;
                    });
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium text-sm rounded-lg shadow-xs transition-all cursor-pointer min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4" />
                  Create New Board
                </button>
              </div>
            )
          ) : (
            <NotFoundPage />
          )}
        </main>

        <Suspense fallback={null}>
          {/* Card Detail Modal - driven by ?card= */}
          {selectedCard && (
            <CardDetailModal
              isOpen={Boolean(selectedCard)}
              onClose={() => {
                setSelectedCard(null);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('card');
                  next.delete('modal');
                  return next;
                });
              }}
              card={selectedCard}
              boardMembers={boardData?.members || []}
              boardLabels={boardData?.labels || []}
              boardLists={boardData?.lists || []}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onToggleLabel={handleToggleLabel}
              onToggleMember={handleToggleMember}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onAddChecklist={handleAddChecklist}
              onDeleteChecklist={handleDeleteChecklist}
              onAddChecklistItem={handleAddChecklistItem}
              onUpdateChecklistItem={handleUpdateChecklistItem}
              onDeleteChecklistItem={handleDeleteChecklistItem}
              onUploadAttachment={handleUploadAttachment}
              onAddLinkAttachment={handleAddLinkAttachment}
              onDeleteAttachment={handleDeleteAttachment}
              onCreateBoardLabel={handleCreateBoardLabel}
            />
          )}

          {/* Create Board Modal - driven by ?modal=create-project */}
          {searchParams.get('modal') === 'create-project' && (
            <CreateBoardModal
              isOpen={true}
              onClose={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('modal');
                  return next;
                });
              }}
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
              onCreateBoard={async (nameOrWsId, colorOrName, maybeColor) => {
                const wsId = maybeColor !== undefined ? nameOrWsId : activeWorkspace?.id;
                const name = maybeColor !== undefined ? colorOrName : nameOrWsId;
                const color = maybeColor !== undefined ? maybeColor : colorOrName;
                const newBoard = await handleCreateBoard(wsId, name, color);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('modal');
                  return next;
                });
                if (newBoard?.id) {
                  navigate(`/w/${wsId}/p/${newBoard.id}/board`);
                }
              }}
            />
          )}

          {/* Create Workspace Modal - driven by ?modal=create-workspace */}
          {searchParams.get('modal') === 'create-workspace' && (
            <CreateWorkspaceModal
              isOpen={true}
              onClose={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('modal');
                  return next;
                });
              }}
              onCreateWorkspace={async (name) => {
                const newWs = await handleCreateWorkspace(name);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('modal');
                  return next;
                });
                if (newWs?.id) {
                  navigate(`/w/${newWs.id}/home`);
                }
              }}
            />
          )}

          {/* Workspace Member Invite Modal - driven by ?modal=invite */}
          {searchParams.get('modal') === 'invite' && (
            <InviteModal
              isOpen={true}
              onClose={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('modal');
                  return next;
                });
              }}
              workspaces={workspaces}
              currentWorkspace={activeWorkspace}
              currentBoard={boardData}
              onSuccess={() => {
                if (activeWorkspace) loadBoards(activeWorkspace.id);
                if (activeBoardIdRef.current) loadActiveBoard(activeBoardIdRef.current);
              }}
            />
          )}

          {/* Board Share & Permissions Modal - driven by ?modal=share */}
          {searchParams.get('modal') === 'share' && (
            <BoardShareModal
              isOpen={true}
              onClose={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('modal');
                  return next;
                });
              }}
              board={boardData}
              workspaces={workspaces}
              currentWorkspace={activeWorkspace}
              onSuccess={() => {
                if (activeWorkspace) loadBoards(activeWorkspace.id);
                if (activeBoardIdRef.current) loadActiveBoard(activeBoardIdRef.current);
              }}
            />
          )}
        </Suspense>

        {/* Confirmation Modal */}
        <ConfirmModal
          {...confirmDialog}
          onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </PermissionProvider>
  );
}
