import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import WorkspaceSidebar from '../components/Sidebar/WorkspaceSidebar';
import Board from '../components/Board/Board';
import ConfirmModal from '../components/shared/ConfirmModal';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { getTenantItem, setTenantItem, removeTenantItem } from '../lib/storage';

import { safeLazy } from '../lib/safeLazy';

const CardDetailModal = safeLazy(() => import('../components/Card/CardDetailModal'), 'CardDetailModal');
const TaskCompletionModal = safeLazy(() => import('../components/Card/TaskCompletionModal'), 'TaskCompletionModal');
const CreateBoardModal = safeLazy(() => import('../components/Board/CreateBoardModal'), 'CreateBoardModal');
const CreateWorkspaceModal = safeLazy(() => import('../components/Sidebar/CreateWorkspaceModal'), 'CreateWorkspaceModal');
const ArchivePage = safeLazy(() => import('../components/Archive/ArchivePage'), 'ArchivePage');
const NotificationsPage = safeLazy(() => import('../components/Notifications/NotificationsPage'), 'NotificationsPage');
const BoardShareModal = safeLazy(() => import('../components/Board/BoardShareModal'), 'BoardShareModal');
const InviteModal = safeLazy(() => import('../components/Board/InviteModal'), 'InviteModal');
const WorkspaceHomePage = safeLazy(() => import('../pages/WorkspaceHomePage'), 'WorkspaceHomePage');
const MembersPage = safeLazy(() => import('../pages/MembersPage'), 'MembersPage');
const CompanyMembersPage = safeLazy(() => import('../pages/CompanyMembersPage'), 'CompanyMembersPage');
const ActivityPage = safeLazy(() => import('../pages/ActivityPage'), 'ActivityPage');
const ReportsPage = safeLazy(() => import('../pages/ReportsPage'), 'ReportsPage');
const SettingsPage = safeLazy(() => import('../pages/SettingsPage'), 'SettingsPage');
const AccountPage = safeLazy(() => import('../pages/AccountPage'), 'AccountPage');
const ProfilePage = safeLazy(() => import('../pages/ProfilePage'), 'ProfilePage');
const ListView = safeLazy(() => import('../components/Board/ListView'), 'ListView');
const CalendarView = safeLazy(() => import('../components/Board/CalendarView'), 'CalendarView');
const NotFoundPage = safeLazy(() => import('../pages/NotFoundPage'), 'NotFoundPage');
const DailyTrackerPage = safeLazy(() => import('../pages/DailyTrackerPage'), 'DailyTrackerPage');
import GlobalHeader from '../components/Navigation/GlobalHeader';
import CheckinPopup from '../components/DailyTracker/CheckinPopup';

import { getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, autoArchiveWorkspaceCards } from '../api/workspaces';
import { getBoards, createBoard, getBoard, updateBoard, deleteBoard, addBoardMember, createBoardLabel, deleteBoardLabel } from '../api/boards';
import { createList, updateList, deleteList } from '../api/lists';
import {
  getCard,
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
  deleteAttachment,
  toggleCardAssigner,
  copyCard
} from '../api/cards';
import { getArchive } from '../api/archive';
import { LayoutGrid, Sparkles, FolderKanban, Plus, Archive, Calendar, Layers, CheckSquare } from 'lucide-react';
import { PermissionProvider } from '../context/PermissionContext';
import { useSocket } from '../context/SocketProvider';
import { useToast } from '../components/ui/Toast';
import { recordLocalUpdate } from '../lib/mutationTracker';
import { getFileUrl } from '../api/config';

export default function BoardPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { socket } = useSocket();
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

  // Mobile sidebar drawer state & activity drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Task Completion Outcome Modal state (for tasks open > 2 working days)
  const [completionModalState, setCompletionModalState] = useState(null);

  // Keep a ref to activeBoardId to avoid stale closures in event handlers
  const activeBoardIdRef = useRef(urlBoardId);
  useEffect(() => {
    activeBoardIdRef.current = urlBoardId;
  }, [urlBoardId]);

  const boardsRef = useRef(boards);
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

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

      if (!workspaceId || workspaceId === 'none') {
        if (fetchedWorkspaces.length > 0) {
          const targetWs = fetchedWorkspaces[0];
          setTenantItem(user?.tenant_id, 'last_workspace_id', targetWs.id);
          navigate(`/w/${targetWs.id}/home`, { replace: true });
          return;
        }
        setActiveWorkspace(null);
        setIsNotFound(false);
        return;
      }

      const matchedWs = fetchedWorkspaces.find((w) => String(w.id) === String(workspaceId));
      if (matchedWs) {
        setActiveWorkspace(matchedWs);
        setIsNotFound(false);
        setTenantItem(user?.tenant_id, 'last_workspace_id', matchedWs.id);
      } else {
        // Workspace ID not found in active workspaces
        // If the user has other workspaces, redirect to the first available workspace home
        if (fetchedWorkspaces.length > 0) {
          const fallbackWs = fetchedWorkspaces[0];
          setTenantItem(user?.tenant_id, 'last_workspace_id', fallbackWs.id);
          navigate(`/w/${fallbackWs.id}/home`, { replace: true });
          return;
        }
        // If no workspaces exist, show the workspace selection/creation view instead of 404
        setActiveWorkspace(null);
        setIsNotFound(false);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setIsNotFound(false);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [workspaceId, user?.tenant_id, navigate]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Real-time synchronization: reload workspaces when a new workspace is created in the company
  useEffect(() => {
    if (!socket) return;
    const handleWorkspaceUpdate = () => {
      loadWorkspaces();
    };
    socket.on('workspace:created', handleWorkspaceUpdate);
    socket.on('user:workspaces_updated', handleWorkspaceUpdate);
    return () => {
      socket.off('workspace:created', handleWorkspaceUpdate);
      socket.off('user:workspaces_updated', handleWorkspaceUpdate);
    };
  }, [socket, loadWorkspaces]);

  const loadArchive = useCallback(async (params = {}) => {
    setArchiveLoading(true);
    try {
      const data = await getArchive(params);
      setArchiveData(data || {});
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
      // Clear boards immediately when switching workspace to prevent stale workspace boards from leaking
      setBoards([]);
      loadBoards(activeWorkspace.id);
    }
  }, [activeWorkspace?.id, loadBoards]);


  // Reset not found flag on route changes
  useEffect(() => {
    setIsNotFound(false);
  }, [workspaceId, subPath]);

  // Load Active Board Details
  const loadActiveBoard = useCallback(async (id, isSilent = false) => {
    const targetId = id || activeBoardIdRef.current;
    if (!targetId) return;
    activeBoardIdRef.current = Number(targetId);
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const data = await getBoard(targetId);
      // Guard: if user navigated away to another board/page while request was in flight, discard response
      if (activeBoardIdRef.current !== Number(targetId)) {
        return;
      }

      // Guard: if the loaded board belongs to a different workspace than the current URL workspace,
      // redirect cleanly to the board's actual workspace route!
      if (workspaceId && data.board && Number(data.board.workspace_id) !== Number(workspaceId)) {
        console.warn(`Board ${targetId} belongs to workspace ${data.board.workspace_id}, redirecting to correct workspace.`);
        navigate(`/w/${data.board.workspace_id}/p/${data.board.id}/${currentView || 'board'}${cardIdParam ? `?card=${cardIdParam}` : ''}`, { replace: true });
        return;
      }

      setBoardData(data.board);
      setIsNotFound(false);

      // Synchronize currently open selectedCard with fresh board details
      setSelectedCard((prev) => {
        if (!prev) return prev;
        for (const l of data.board?.lists || []) {
          const freshCard = (l.cards || []).find((c) => Number(c.id) === Number(prev.id));
          if (freshCard) {
            return { ...prev, ...freshCard };
          }
        }
        return prev;
      });

      setTenantItem(user?.tenant_id, `last_board_id_${data.board?.workspace_id || workspaceId}`, targetId);
      try {
        localStorage.setItem(`taskflow_last_board_${data.board?.workspace_id || workspaceId}`, String(targetId));
      } catch {}
    } catch (err) {
      // Guard: if user navigated away while request was in flight, ignore the error and do not 404
      if (activeBoardIdRef.current !== Number(targetId)) {
        return;
      }
      console.warn('Board failed to load, cleaning up stale references:', err?.message || err);
      // Clean up stale or invalid remembered board IDs
      try {
        removeTenantItem(user?.tenant_id, `last_board_id_${activeWorkspace?.id}`);
        localStorage.removeItem(`taskflow_last_board_${activeWorkspace?.id}`);
      } catch {}

      // Auto-fallback: if the requested board ID does not exist in this workspace,
      // check if other valid boards exist in this workspace to gracefully auto-recover
      let availableBoards = boardsRef.current || [];
      if (availableBoards.length === 0 && activeWorkspace?.id) {
        try {
          const fetched = await getBoards(activeWorkspace.id);
          availableBoards = fetched.boards || [];
        } catch (_) {}
      }

      if (availableBoards.length > 0) {
        const fallbackBoard = availableBoards.find((b) => b.id !== Number(targetId));
        if (fallbackBoard) {
          console.warn(`Board ${targetId} not found. Gracefully redirecting to board ${fallbackBoard.id}`);
          navigate(`/w/${activeWorkspace?.id}/p/${fallbackBoard.id}/${currentView || 'board'}`, { replace: true });
          return;
        }
      }

      if (activeWorkspace?.id) {
        // Workspace exists but has no valid boards; redirect to roadmap, issues, or home gracefully
        if (currentView === 'calendar' || location.pathname.includes('/calendar')) {
          navigate(`/w/${activeWorkspace.id}/roadmap`, { replace: true });
        } else if (currentView === 'list' || location.pathname.includes('/list')) {
          navigate(`/w/${activeWorkspace.id}/issues`, { replace: true });
        } else {
          navigate(`/w/${activeWorkspace.id}/home`, { replace: true });
        }
        return;
      }
      setIsNotFound(true);
    } finally {
      if (!isSilent && activeBoardIdRef.current === Number(targetId)) {
        setLoading(false);
      }
    }
  }, [user?.tenant_id, activeWorkspace?.id, currentView, navigate, location.pathname]);

  useEffect(() => {
    if (urlBoardId) {
      loadActiveBoard(urlBoardId);
    } else {
      setBoardData(null);
      setLoading(false);
    }
  }, [urlBoardId, loadActiveBoard]);

  // Auto-archive completed tasks if policy is configured (default 7 days)
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    const defaults =
      activeWorkspace?.settings?.workspace_defaults ||
      activeWorkspace?.settings?.project_defaults ||
      getTenantItem(`ws_defaults_${activeWorkspace.id}`, 'settings', null);
    const archiveSetting = defaults?.autoArchiveDays ?? '7';
    if (archiveSetting && archiveSetting !== 'never') {
      const days = Number(archiveSetting);
      autoArchiveWorkspaceCards(activeWorkspace.id, days)
        .then((res) => {
          if (res?.archived_count > 0 && urlBoardId) {
            loadActiveBoard(urlBoardId, true);
          }
        })
        .catch(() => {});
    }
  }, [activeWorkspace?.id, activeWorkspace?.settings?.workspace_defaults, activeWorkspace?.settings?.project_defaults, urlBoardId, loadActiveBoard]);

  // Handle /roadmap and /calendar routes at workspace level:
  // If boards exist, seamlessly navigate to the project's calendar roadmap view.
  // Otherwise, clear loading so the empty roadmap state displays gracefully.
  useEffect(() => {
    if ((subPath === 'roadmap' || subPath === 'calendar') && activeWorkspace?.id) {
      if (boards.length > 0) {
        const rememberedBoardId = getTenantItem(user?.tenant_id, `last_board_id_${activeWorkspace.id}`, null);
        const targetBoard = boards.find((b) => b.id === Number(rememberedBoardId)) || boards[0];
        if (targetBoard) {
          navigate(`/w/${activeWorkspace.id}/p/${targetBoard.id}/calendar`, { replace: true });
        }
      } else if (!loadingWorkspaces) {
        setLoading(false);
      }
    }
  }, [subPath, activeWorkspace?.id, boards, loadingWorkspaces, navigate, user?.tenant_id]);

  // Handle /sprint and /board aliases at workspace level
  useEffect(() => {
    if ((subPath === 'sprint' || subPath === 'board') && activeWorkspace?.id) {
      if (boards.length > 0) {
        const rememberedBoardId = getTenantItem(user?.tenant_id, `last_board_id_${activeWorkspace.id}`, null);
        const targetBoard = boards.find((b) => b.id === Number(rememberedBoardId)) || boards[0];
        navigate(`/w/${activeWorkspace.id}/p/${targetBoard.id}/board`, { replace: true });
      } else if (!loadingWorkspaces) {
        setLoading(false);
      }
    }
  }, [subPath, activeWorkspace?.id, boards, loadingWorkspaces, navigate, user?.tenant_id]);

  // Handle /issues and /list aliases at workspace level
  useEffect(() => {
    if ((subPath === 'issues' || subPath === 'list') && activeWorkspace?.id) {
      if (boards.length > 0) {
        const rememberedBoardId = getTenantItem(user?.tenant_id, `last_board_id_${activeWorkspace.id}`, null);
        const targetBoard = boards.find((b) => b.id === Number(rememberedBoardId)) || boards[0];
        navigate(`/w/${activeWorkspace.id}/p/${targetBoard.id}/list`, { replace: true });
      } else if (!loadingWorkspaces) {
        setLoading(false);
      }
    }
  }, [subPath, activeWorkspace?.id, boards, loadingWorkspaces, navigate, user?.tenant_id]);

  // If viewing project without subview, redirect to /board
  useEffect(() => {
    if (isProjectRoute && pathParts[1] && !pathParts[2]) {
      navigate(`/w/${workspaceId}/p/${pathParts[1]}/board`, { replace: true });
    }
  }, [isProjectRoute, pathParts, workspaceId, navigate]);

  // Root of workspace redirect to home or remembered board
  useEffect(() => {
    if (!subPath && activeWorkspace?.id) {
      const rememberedBoardId = getTenantItem(user?.tenant_id, `last_board_id_${activeWorkspace.id}`, null);
      if (rememberedBoardId && boards.some((b) => b.id === Number(rememberedBoardId))) {
        navigate(`/w/${activeWorkspace.id}/p/${rememberedBoardId}/board`, { replace: true });
      } else if (boards.length > 0) {
        navigate(`/w/${activeWorkspace.id}/p/${boards[0].id}/board`, { replace: true });
      } else {
        navigate(`/w/${activeWorkspace.id}/home`, { replace: true });
      }
    }
  }, [subPath, activeWorkspace?.id, boards, navigate, user?.tenant_id]);

  // Synchronize selectedCard with URL query param ?card=
  const cardIdParam = searchParams.get('card');
  const lastFetchedCardIdRef = useRef(null);
  useEffect(() => {
    if (cardIdParam) {
      if (lastFetchedCardIdRef.current === cardIdParam && selectedCard && String(selectedCard.id) === String(cardIdParam)) {
        return;
      }
      if (boardData) {
        let found = null;
        (boardData.lists || []).forEach((l) => {
          (l.cards || []).forEach((c) => {
            if (String(c.id) === String(cardIdParam)) found = c;
          });
        });
        if (found) {
          setSelectedCard(found);
        }
      }
      lastFetchedCardIdRef.current = cardIdParam;
      // Fetch latest full card details (comments, attachments, checklists) from server
      getCard(cardIdParam)
        .then((data) => {
          if (data?.card) {
            setSelectedCard((current) =>
              current && String(current.id) === String(cardIdParam)
                ? { ...current, ...data.card }
                : data.card
            );
          }
        })
        .catch(() => {});
    } else {
      lastFetchedCardIdRef.current = null;
      setSelectedCard(null);
    }
  }, [cardIdParam]);

  // Synchronize Document Title per route
  useEffect(() => {
    if (subPath === 'home') {
      document.title = `${activeWorkspace?.name || 'Workspace'} - Home | TaskFlow`;
    } else if (subPath === 'roadmap' || subPath === 'calendar') {
      document.title = `${activeWorkspace?.name || 'Workspace'} - Roadmap | TaskFlow`;
    } else if (subPath === 'notifications') {
      document.title = 'Notifications - TaskFlow';
    } else if (subPath === 'archive') {
      document.title = 'Archive - TaskFlow';
    } else if (subPath === 'members') {
      document.title = `${activeWorkspace?.name || 'Workspace'} - Workspace Members | TaskFlow`;
    } else if (subPath === 'company-members') {
      document.title = 'Members Directory | TaskFlow';
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

  // Handle Notification or Card click navigation directly to card modal or board
  const handleSelectNotificationCard = async (param = {}) => {
    const cardId = param.cardId || param.id;
    let boardId = param.boardId || param.board_id;
    let targetWsId = param.workspaceId || param.workspace_id || param.notifWsId;

    if (cardId && (!boardId || !targetWsId)) {
      try {
        const res = await getCard(cardId);
        if (res?.card) {
          boardId = boardId || res.card.board_id;
          targetWsId = targetWsId || res.card.workspace_id;
        }
      } catch (err) {
        console.warn('Could not resolve card details for notification:', err);
      }
    }

    targetWsId = targetWsId || workspaceId || activeWorkspace?.id || (workspaces && workspaces[0]?.id);
    if (!targetWsId) return;

    if (boardId) {
      if (cardId) {
        navigate(`/w/${targetWsId}/p/${boardId}/board?card=${cardId}`);
      } else {
        navigate(`/w/${targetWsId}/p/${boardId}/board`);
      }
    } else if (cardId) {
      navigate(`/w/${targetWsId}/home`);
    } else {
      navigate(`/w/${targetWsId}/home`);
    }
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
                  comments: [...(prevSelected.comments || []), comment]
                };
              }
              return prevSelected;
            });

            const updatedLists = (prevBoard.lists || []).map((l) => ({
              ...l,
              cards: (l.cards || []).map((c) => {
                if (c.id === cardId) {
                  const existingComments = c.comments || [];
                  if (existingComments.some((cm) => cm.id === comment.id)) {
                    return c;
                  }
                  const updatedComments = [...existingComments, comment];
                  return {
                    ...c,
                    comments: updatedComments,
                    comments_count: updatedComments.length
                  };
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

        case 'board:label_created': {
          const newLabel = data.label;
          if (!newLabel) return prevBoard;
          const existing = (prevBoard.labels || []).some((l) => l.id === newLabel.id);
          if (existing) return prevBoard;
          return {
            ...prevBoard,
            labels: [...(prevBoard.labels || []), newLabel]
          };
        }

        case 'board:label_deleted': {
          const labelId = Number(data.labelId);
          if (!labelId) return prevBoard;
          const updatedLabels = (prevBoard.labels || []).filter((l) => l.id !== labelId);
          const updatedLists = (prevBoard.lists || []).map((l) => ({
            ...l,
            cards: (l.cards || []).map((c) => ({
              ...c,
              labels: (c.labels || []).filter((cl) => cl.id !== labelId)
            }))
          }));

          setSelectedCard((prevSelected) => {
            if (prevSelected) {
              return {
                ...prevSelected,
                labels: (prevSelected.labels || []).filter((cl) => cl.id !== labelId)
              };
            }
            return prevSelected;
          });

          return { ...prevBoard, labels: updatedLabels, lists: updatedLists };
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

        case 'board:activity': {
          const act = data.activity;
          if (!act) return prevBoard;
          const existing = (prevBoard.activity || []).some((a) => a.id === act.id);
          if (existing) return prevBoard;
          return {
            ...prevBoard,
            activity: [act, ...(prevBoard.activity || [])]
          };
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
          const wsIdToArchive = activeWorkspace.id;
          await updateWorkspace(wsIdToArchive, { is_archived: true });
          removeTenantItem(user?.tenant_id, 'last_workspace_id');
          removeTenantItem(user?.tenant_id, 'last_board_id');
          localStorage.removeItem('activeWorkspaceId');
          localStorage.removeItem('activeBoardId');
          setActiveWorkspace(null);
          setBoardData(null);

          const data = await getWorkspaces();
          const activeList = (data.workspaces || []).filter((w) => !w.is_archived);
          setWorkspaces(activeList);

          if (subPath === 'archive') {
            await loadArchive();
          }

          if (activeList.length > 0) {
            const nextWs = activeList[0];
            setTenantItem(user?.tenant_id, 'last_workspace_id', nextWs.id);
            navigate(`/w/${nextWs.id}/home`, { replace: true });
          } else {
            navigate('/w/none', { replace: true });
          }

          toast.success('Workspace archived', {
            action: {
              label: 'Undo',
              onClick: async () => {
                try {
                  await updateWorkspace(wsIdToArchive, { is_archived: false });
                  await loadWorkspaces();
                  setTenantItem(user?.tenant_id, 'last_workspace_id', wsIdToArchive);
                  navigate(`/w/${wsIdToArchive}/home`, { replace: true });
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
          const wsIdToDelete = activeWorkspace.id;
          await deleteWorkspace(wsIdToDelete);
          removeTenantItem(user?.tenant_id, 'last_workspace_id');
          removeTenantItem(user?.tenant_id, 'last_board_id');
          localStorage.removeItem('activeWorkspaceId');
          localStorage.removeItem('activeBoardId');
          setActiveWorkspace(null);
          setBoardData(null);

          const data = await getWorkspaces();
          const activeList = (data.workspaces || []).filter((w) => !w.is_archived);
          setWorkspaces(activeList);

          if (subPath === 'archive') {
            await loadArchive();
          }

          if (activeList.length > 0) {
            const nextWs = activeList[0];
            setTenantItem(user?.tenant_id, 'last_workspace_id', nextWs.id);
            navigate(`/w/${nextWs.id}/home`, { replace: true });
          } else {
            navigate('/w/none', { replace: true });
          }
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
      const data = await getWorkspaces();
      const activeList = (data.workspaces || []).filter((w) => !w.is_archived);
      setWorkspaces(activeList);
      const restored = activeList.find((w) => w.id === workspaceId) || activeList[0];
      if (restored) {
        setActiveWorkspace(restored);
        setTenantItem(user?.tenant_id, 'last_workspace_id', restored.id);
      }
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
          const data = await getWorkspaces();
          const activeList = (data.workspaces || []).filter((w) => !w.is_archived);
          setWorkspaces(activeList);
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
      loadActiveBoard(boardId, true);
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
        removeTenantItem(user?.tenant_id, 'last_board_id');
        setBoardData(null);
        try {
          await updateBoard(archivedBoardId, { is_archived: true });
          if (activeWorkspace) {
            await loadBoards(activeWorkspace.id);
            navigate(`/w/${activeWorkspace.id}/home`, { replace: true });
          }
          if (subPath === 'archive') await loadArchive();
          toast.success('Board archived', {
            action: {
              label: 'Undo',
              onClick: async () => {
                try {
                  await updateBoard(archivedBoardId, { is_archived: false });
                  if (activeWorkspace) {
                    await loadBoards(activeWorkspace.id);
                    navigate(`/w/${activeWorkspace.id}/p/${archivedBoardId}/board`, { replace: true });
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
        removeTenantItem(user?.tenant_id, 'last_board_id');
        setBoardData(null);
        try {
          await deleteBoard(targetBoardId);
          if (activeWorkspace) {
            await loadBoards(activeWorkspace.id);
            navigate(`/w/${activeWorkspace.id}/home`, { replace: true });
          }
          if (subPath === 'archive') await loadArchive();
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
  const handleCreateList = async (boardId, name, position, wipLimitEnabled = true, wipLimit = null) => {
    try {
      const data = await createList(boardId, name, position, wipLimitEnabled, wipLimit);
      if (data?.list) {
        setBoardData((prev) => {
          if (!prev || prev.id !== boardId) return prev;
          return { ...prev, lists: [...(prev.lists || []), { ...data.list, cards: [] }] };
        });
      }
      loadActiveBoard(boardId, true);
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
      if (updates.wip_limit_enabled !== undefined) {
        toast.success(updates.wip_limit_enabled ? 'WIP limit enabled for this column' : 'WIP limit disabled for this column');
      } else if (updates.wip_limit !== undefined) {
        toast.success(updates.wip_limit ? `WIP limit set to ${updates.wip_limit} cards` : 'WIP limit reset to board default');
      }
      loadActiveBoard(activeBoardIdRef.current, true);
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
      loadActiveBoard(activeBoardIdRef.current, true);
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
          const totalCards = (prev.lists || []).reduce((acc, l) => acc + (l.cards || []).length, 0);
          const cardWithNumber = {
            ...newCard,
            task_number: newCard.task_number ?? (totalCards + 1)
          };
          const updatedLists = (prev.lists || []).map((l) => {
            if (l.id === listId) {
              return { ...l, cards: [...(l.cards || []), cardWithNumber] };
            }
            return l;
          });
          return { ...prev, lists: updatedLists };
        });
      }
      await loadActiveBoard(activeBoardIdRef.current, true);
    } catch (err) {
      toast.error(err?.message || 'Failed to create card');
    }
  };

  const handleCopyCard = async (sourceCard, target = {}) => {
    try {
      await copyCard(sourceCard.id, {
        listId: target.listId || sourceCard.list_id,
        title: target.title || `(Copy) ${sourceCard.title}`
      });

      if (!target.boardId || target.boardId === activeBoardIdRef.current) {
        await loadActiveBoard(activeBoardIdRef.current, true);
      }
      toast.success('Card copied successfully');
    } catch (err) {
      toast.error(err?.message || 'Failed to copy card');
      throw err;
    }
  };

  const handleRestoreCard = async (cardId) => {
    try {
      await updateCard(cardId, { is_archived: false });
      await loadArchive();
      if (activeBoardIdRef.current) await loadActiveBoard(activeBoardIdRef.current, true);
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
      const isCompletionNoteErr =
        err?.code === 'ONE_LINE_RESULT_REQUIRED' ||
        err?.response?.data?.error?.code === 'ONE_LINE_RESULT_REQUIRED' ||
        err?.message?.includes('at least 20 characters');

      if (isCompletionNoteErr) {
        setBoardData(prevBoardData);
        const cardObj = (prevBoardData?.lists || [])
          .flatMap((l) => l.cards || [])
          .find((c) => c.id === cardId);

        setCompletionModalState({
          card: cardObj || { id: cardId },
          onSubmit: async ({ completion_note, completion_evidence_url }) => {
            try {
              await updateCard(cardId, {
                list_id: targetListId,
                position: newPosition,
                completion_note,
                completion_evidence_url
              });
              loadActiveBoard(activeBoardIdRef.current);
              setCompletionModalState(null);
              toast.success('Task marked as complete');
            } catch (retryErr) {
              setBoardData(prevBoardData);
              toast.error(retryErr?.message || 'Failed to complete card');
            }
          }
        });
        return;
      }
      setBoardData(prevBoardData);
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to move card');
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
                if (subPath === 'archive') await loadArchive();
                toast.success('Card restored');
              } catch (e) {
                toast.error('Failed to undo card archive');
              }
            }
          }
        });
      }
    } catch (err) {
      const isCompletionNoteErr =
        err?.code === 'ONE_LINE_RESULT_REQUIRED' ||
        err?.response?.data?.error?.code === 'ONE_LINE_RESULT_REQUIRED' ||
        err?.message?.includes('at least 20 characters');

      if (isCompletionNoteErr && updates.is_complete) {
        setSelectedCard(prevSelectedCard);
        setBoardData(prevBoardData);

        const cardObj =
          prevSelectedCard?.id === cardId
            ? prevSelectedCard
            : (prevBoardData?.lists || [])
                .flatMap((l) => l.cards || [])
                .find((c) => c.id === cardId);

        setCompletionModalState({
          card: cardObj || { id: cardId },
          onSubmit: async ({ completion_note, completion_evidence_url }) => {
            try {
              await updateCard(cardId, {
                ...updates,
                completion_note,
                completion_evidence_url
              });
              loadActiveBoard(activeBoardIdRef.current);
              setSelectedCard((prev) =>
                prev && prev.id === cardId
                  ? { ...prev, ...updates, completion_note, completion_evidence_url }
                  : prev
              );
              setCompletionModalState(null);
              toast.success('Task marked as completed');
            } catch (retryErr) {
              setSelectedCard(prevSelectedCard);
              setBoardData(prevBoardData);
              toast.error(retryErr?.message || 'Failed to complete card');
            }
          }
        });
        return;
      }

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

  const handleToggleAssigner = async (cardId, userId) => {
    try {
      await toggleCardAssigner(cardId, userId);
      loadActiveBoard(activeBoardIdRef.current);
    } catch (err) {
      toast.error(err?.message || 'Failed to toggle assigner');
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

  const handleAddChecklist = async (cardId, title, items = []) => {
    try {
      const data = await addChecklist(cardId, title, items);
      if (data?.checklist) {
        setSelectedCard((prev) =>
          prev && Number(prev.id) === Number(cardId)
            ? { ...prev, checklists: [...(prev.checklists || []), data.checklist] }
            : prev
        );
      }
      loadActiveBoard(activeBoardIdRef.current, true);
    } catch (err) {
      toast.error(err?.message || 'Failed to add checklist');
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    setSelectedCard((prev) => {
      if (!prev || !prev.checklists) return prev;
      return {
        ...prev,
        checklists: prev.checklists.filter((ch) => Number(ch.id) !== Number(checklistId))
      };
    });
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
              checklists: c.checklists.filter((ch) => Number(ch.id) !== Number(checklistId))
            };
          })
        }))
      };
    });

    try {
      await deleteChecklist(checklistId);
      loadActiveBoard(activeBoardIdRef.current, true);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete checklist');
    }
  };

  const handleAddChecklistItem = async (checklistId, text) => {
    try {
      const data = await addChecklistItem(checklistId, text);
      if (data?.item) {
        setSelectedCard((prev) => {
          if (!prev || !prev.checklists) return prev;
          return {
            ...prev,
            checklists: prev.checklists.map((ch) =>
              Number(ch.id) === Number(checklistId)
                ? { ...ch, items: [...(ch.items || []), data.item] }
                : ch
            )
          };
        });
      }
      loadActiveBoard(activeBoardIdRef.current, true);
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
            Number(item.id) === Number(itemId) ? { ...item, ...updates } : item
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
                  Number(item.id) === Number(itemId) ? { ...item, ...updates } : item
                )
              }))
            };
          })
        }))
      };
    });

    try {
      await updateChecklistItem(itemId, updates);
      loadActiveBoard(activeBoardIdRef.current, true);
    } catch (err) {
      setSelectedCard(prevSelectedCard);
      setBoardData(prevBoardData);
      toast.error(err?.message || 'Failed to update checklist item');
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    const prevSelectedCard = selectedCard;
    const prevBoardData = boardData;

    // Optimistically update selectedCard
    setSelectedCard((prev) => {
      if (!prev || !prev.checklists) return prev;
      return {
        ...prev,
        checklists: prev.checklists.map((ch) => ({
          ...ch,
          items: (ch.items || []).filter((item) => Number(item.id) !== Number(itemId))
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
                items: (ch.items || []).filter((item) => Number(item.id) !== Number(itemId))
              }))
            };
          })
        }))
      };
    });

    try {
      await deleteChecklistItem(itemId);
      loadActiveBoard(activeBoardIdRef.current, true);
    } catch (err) {
      setSelectedCard(prevSelectedCard);
      setBoardData(prevBoardData);
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
    if (!activeBoardIdRef.current) return null;
    try {
      const res = await createBoardLabel(activeBoardIdRef.current, name, color);
      if (res?.label) {
        setBoardData((prev) => {
          if (!prev) return prev;
          return { ...prev, labels: [...(prev.labels || []), res.label] };
        });
      }
      loadActiveBoard(activeBoardIdRef.current);
      return res?.label;
    } catch (err) {
      toast.error(err?.message || 'Failed to create label');
      return null;
    }
  };

  const handleDeleteBoardLabel = async (labelId) => {
    if (!activeBoardIdRef.current) return false;
    const prevBoardData = boardData;
    const prevSelectedCard = selectedCard;

    // Optimistically update board and card state
    setBoardData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labels: (prev.labels || []).filter((l) => l.id !== labelId),
        lists: (prev.lists || []).map((l) => ({
          ...l,
          cards: (l.cards || []).map((c) => ({
            ...c,
            labels: (c.labels || []).filter((cl) => cl.id !== labelId)
          }))
        }))
      };
    });

    setSelectedCard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labels: (prev.labels || []).filter((cl) => cl.id !== labelId)
      };
    });

    try {
      await deleteBoardLabel(activeBoardIdRef.current, labelId);
      toast.success('Label deleted');
      return true;
    } catch (err) {
      setBoardData(prevBoardData);
      setSelectedCard(prevSelectedCard);
      toast.error(err?.message || 'Failed to delete label');
      return false;
    }
  };

  return (
    <PermissionProvider workspaceId={activeWorkspace?.id} role={activeWorkspace?.role_name || activeWorkspace?.role}>
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
          {activeWorkspace && (
            <GlobalHeader
              workspace={activeWorkspace}
              board={boardData}
              boards={boards}
              subPath={subPath}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              onSelectNotificationCard={handleSelectNotificationCard}
              onOpenAllNotifications={() => navigate(`/w/${workspaceId || activeWorkspace?.id}/notifications`)}
              onUpdateBoard={handleUpdateBoard}
              onArchiveBoard={handleArchiveCurrentBoard}
              onDeleteBoard={handleDeleteCurrentBoard}
              isActivityOpen={isActivityOpen}
              onToggleActivity={() => setIsActivityOpen((prev) => !prev)}
            />
          )}

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {loadingWorkspaces ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app space-y-3">
              <Spinner size="lg" />
              <p className="text-xs font-semibold text-text-secondary">Loading Workspace...</p>
            </div>
          ) : isNotFound ? (
            <NotFoundPage />
          ) : !activeWorkspace && subPath !== 'archive' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-app select-none">
              <div className="w-16 h-16 rounded-2xl bg-primary-tint text-primary border border-primary/20 flex items-center justify-center mb-6 shadow-xs">
                <FolderKanban className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                {workspaces.length > 0 ? 'Select a Workspace' : 'No Workspaces Found'}
              </h2>
              <p className="text-text-secondary max-w-md mb-6 text-sm leading-relaxed">
                {workspaces.length > 0
                  ? 'Choose a workspace from your list below to continue working, or create a new one.'
                  : 'You do not have any active workspaces right now. Create a new workspace to start organizing your projects, or view archived workspaces to restore one.'}
              </p>

              {workspaces.length > 0 && (
                <div className="w-full max-w-sm mb-6 space-y-2">
                  <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider text-left mb-1 px-1">
                    Your Workspaces
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 p-1.5 bg-surface border border-border rounded-xl shadow-xs">
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          setActiveWorkspace(ws);
                          setTenantItem(user?.tenant_id, 'last_workspace_id', ws.id);
                          navigate(`/w/${ws.id}/home`);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-muted transition-colors cursor-pointer text-left border border-transparent hover:border-border"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {ws.icon_url || ws.settings?.icon_url ? (
                            <img
                              src={getFileUrl(ws.icon_url || ws.settings?.icon_url)}
                              alt={ws.name}
                              className="w-7 h-7 rounded-lg object-cover shrink-0 ring-1 ring-border/50"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-primary-tint text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {ws.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-text-primary truncate">{ws.name}</span>
                        </div>
                        <span className="text-xs text-primary font-semibold shrink-0">Open &rarr;</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('modal', 'create-workspace');
                      return next;
                    });
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium text-sm rounded-lg shadow-xs transition-all cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  Create New Workspace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/w/none/archive');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-hover active:bg-surface-active text-text-secondary hover:text-text-primary font-medium text-sm rounded-lg border border-border shadow-xs transition-all cursor-pointer min-h-[44px]"
                >
                  <Archive className="w-4 h-4" />
                  View Archived
                </button>
              </div>
            </div>
          ) : subPath === 'home' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <WorkspaceHomePage
                workspace={activeWorkspace}
                boards={boards}
                user={user}
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
                boards={boards}
              />
            </Suspense>
          ) : subPath === 'archive' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <ArchivePage
                archiveData={archiveData}
                isLoading={archiveLoading}
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                boards={boards}
                onBack={() => {
                  if (activeWorkspace?.id) {
                    navigate(`/w/${activeWorkspace.id}/home`);
                  } else if (workspaces.length > 0) {
                    navigate(`/w/${workspaces[0].id}/home`);
                  } else {
                    navigate('/w/none');
                  }
                }}
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
              />
            </Suspense>
          ) : subPath === 'company-members' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <CompanyMembersPage
                workspace={activeWorkspace}
                workspaces={workspaces}
                boards={boards}
              />
            </Suspense>
          ) : subPath === 'daily-tracker' ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <DailyTrackerPage
                workspace={activeWorkspace}
                workspaces={workspaces}
                onCardClick={handleSelectNotificationCard}
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
          ) : subPath === 'profile' || subPath.startsWith('profile/') ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <ProfilePage workspace={activeWorkspace} />
            </Suspense>
          ) : subPath.startsWith('account') ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
              <AccountPage
                tab={pathParts[1]}
                workspace={activeWorkspace}
              />
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
              />
            </Suspense>
          ) : subPath === 'roadmap' || subPath === 'calendar' ? (
            loading || loadingWorkspaces ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app space-y-3">
                <Spinner size="lg" />
                <p className="text-xs font-semibold text-text-secondary">Loading Roadmap...</p>
              </div>
            ) : boards.length > 0 && boardData ? (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
                <CalendarView
                  board={boardData}
                  onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
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
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-app select-none">
                <div className="w-16 h-16 rounded-2xl bg-primary-tint text-primary border border-primary/20 flex items-center justify-center mb-6 shadow-xs">
                  <Calendar className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Roadmap & Timeline</h2>
                <p className="text-text-secondary max-w-sm mb-6 text-sm leading-relaxed">
                  No projects found in this workspace. Create a project to start planning your roadmap and schedule.
                </p>
                <button
                  type="button"
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
                  Create Project
                </button>
              </div>
            )
          ) : (subPath === 'board' || subPath === 'sprint') && boards.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-app select-none">
              <div className="w-16 h-16 rounded-2xl bg-primary-tint text-primary border border-primary/20 flex items-center justify-center mb-6 shadow-xs">
                <Layers className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Active Sprint</h2>
              <p className="text-text-secondary max-w-sm mb-6 text-sm leading-relaxed">
                No projects found in this workspace. Create a project to start planning your sprint.
              </p>
              <button
                type="button"
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
                Create Project
              </button>
            </div>
          ) : (subPath === 'list' || subPath === 'issues') && boards.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-app select-none">
              <div className="w-16 h-16 rounded-2xl bg-primary-tint text-primary border border-primary/20 flex items-center justify-center mb-6 shadow-xs">
                <CheckSquare className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Issues & Tasks</h2>
              <p className="text-text-secondary max-w-sm mb-6 text-sm leading-relaxed">
                No projects found in this workspace. Create a project to track issues.
              </p>
              <button
                type="button"
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
                Create Project
              </button>
            </div>
          ) : isProjectRoute ? (
            loading && !boardData ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app space-y-3">
                <Spinner size="lg" />
                <p className="text-xs font-semibold text-text-secondary">Loading Project...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CheckinPopup workspaceId={activeWorkspace?.id || workspaceId} />
                {currentView === 'list' && boardData ? (
                  <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
                    <ListView
                      board={boardData}
                      boards={boards}
                      workspace={activeWorkspace}
                      onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
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
                      onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
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
                    boards={boards}
                    workspace={activeWorkspace}
                    projectDefaults={
                      activeWorkspace?.settings?.workspace_defaults ||
                      activeWorkspace?.settings?.project_defaults ||
                      getTenantItem(`ws_defaults_${activeWorkspace?.id}`, 'settings', null)
                    }
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
                    onUpdateCard={handleUpdateCard}
                    onDeleteCard={handleDeleteCard}
                    onCopyCard={handleCopyCard}
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
                    onRefreshBoard={() => loadActiveBoard(urlBoardId, true)}
                    onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                    onSelectNotificationCard={handleSelectNotificationCard}
                    onOpenAllNotifications={() => navigate(`/w/${workspaceId}/notifications`)}
                    onBoardSocketEvent={handleLiveBoardSocketEvent}
                    isActivityOpen={isActivityOpen}
                    onCloseActivity={() => setIsActivityOpen(false)}
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
                )}
              </div>
            )
          ) : (
            <NotFoundPage />
          )}
          </div>
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
              workspaces={workspaces}
              currentWorkspaceId={workspaceId || activeWorkspace?.id}
              currentBoardId={activeBoardIdRef.current || boardData?.id}
              boardMembers={boardData?.members || []}
              boardLabels={boardData?.labels || []}
              boardLists={boardData?.lists || []}
              boardActivity={boardData?.activity || []}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onMoveList={handleMoveCardList}
              onToggleLabel={handleToggleLabel}
              onToggleMember={handleToggleMember}
              onToggleAssigner={handleToggleAssigner}
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
              onDeleteBoardLabel={handleDeleteBoardLabel}
              onCopyCard={handleCopyCard}
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

          {/* Task Completion Modal (for cards open > 2 working days) */}
          {completionModalState && (
            <TaskCompletionModal
              isOpen={Boolean(completionModalState)}
              onClose={() => setCompletionModalState(null)}
              card={completionModalState.card}
              onSubmit={completionModalState.onSubmit}
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
