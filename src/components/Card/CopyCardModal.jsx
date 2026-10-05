import React, { useEffect, useState } from 'react';
import { Copy, X } from 'lucide-react';
import { getBoards, getBoard } from '../../api/boards';
import Select from '../ui/Select';
import Button from '../ui/Button';

export default function CopyCardModal({
  isOpen,
  onClose,
  card,
  workspaces = [],
  currentWorkspaceId,
  currentBoardId,
  onCopyCard
}) {
  const [workspaceId, setWorkspaceId] = useState('');
  const [boardId, setBoardId] = useState('');
  const [listId, setListId] = useState('');
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const initialWorkspaceId = currentWorkspaceId || workspaces[0]?.id || '';
    setWorkspaceId(initialWorkspaceId ? String(initialWorkspaceId) : '');
    setBoardId('');
    setListId('');
    setError('');
  }, [isOpen, currentWorkspaceId, workspaces]);

  useEffect(() => {
    if (!isOpen || !workspaceId) {
      setBoards([]);
      return;
    }

    let isMounted = true;
    async function loadBoards() {
      setLoadingBoards(true);
      setError('');
      try {
        const data = await getBoards(Number(workspaceId));
        const fetchedBoards = data.boards || [];
        if (!isMounted) return;

        setBoards(fetchedBoards);
        const preferredBoard = fetchedBoards.find((b) => b.id === Number(currentBoardId)) || fetchedBoards[0];
        setBoardId(preferredBoard ? String(preferredBoard.id) : '');
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load boards');
      } finally {
        if (isMounted) setLoadingBoards(false);
      }
    }

    loadBoards();
    return () => {
      isMounted = false;
    };
  }, [isOpen, workspaceId, currentBoardId]);

  useEffect(() => {
    if (!isOpen || !boardId) {
      setLists([]);
      setListId('');
      return;
    }

    let isMounted = true;
    async function loadLists() {
      setLoadingLists(true);
      setError('');
      try {
        const data = await getBoard(Number(boardId));
        const fetchedLists = data.board?.lists || [];
        if (!isMounted) return;

        setLists(fetchedLists);
        const currentListId = card?.list_id;
        const preferredList = fetchedLists.find((l) => l.id === Number(currentListId)) || fetchedLists[0];
        setListId(preferredList ? String(preferredList.id) : '');
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load lists');
      } finally {
        if (isMounted) setLoadingLists(false);
      }
    }

    loadLists();
    return () => {
      isMounted = false;
    };
  }, [isOpen, boardId, card?.list_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!listId || !boardId) return;

    setIsCopying(true);
    setError('');
    try {
      await onCopyCard(card, {
        workspaceId: Number(workspaceId),
        boardId: Number(boardId),
        listId: Number(listId)
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to copy card');
    } finally {
      setIsCopying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-text-primary/40 animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-muted">
          <div className="flex items-center gap-2 min-w-0">
            <Copy className="h-4 w-4 text-primary shrink-0" />
            <h3 className="truncate text-sm font-semibold text-text-primary">Copy Card</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
            <p className="text-[11px] font-medium text-text-muted">New title</p>
            <p className="mt-0.5 break-words text-sm font-semibold text-text-primary">(Copy) {card?.title}</p>
          </div>

          <div>
            <Select
              label="Workspace"
              value={workspaceId}
              onChange={(val) => setWorkspaceId(val)}
              options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
            />
          </div>

          <div>
            <Select
              label="Board"
              value={boardId}
              onChange={(val) => setBoardId(val)}
              disabled={loadingBoards || boards.length === 0}
              placeholder={loadingBoards ? 'Loading boards...' : 'Select board'}
              options={boards.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>

          <div>
            <Select
              label="List"
              value={listId}
              onChange={(val) => setListId(val)}
              disabled={loadingLists || lists.length === 0}
              placeholder={loadingLists ? 'Loading lists...' : 'Select list'}
              options={lists.map((l) => ({ value: l.id, label: l.name }))}
            />
          </div>

          {error && (
            <p className="rounded-md border border-danger/30 bg-danger-tint px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-surface-muted/50 px-5 py-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={!listId || isCopying}
            isLoading={isCopying}
          >
            Copy Card
          </Button>
        </div>
      </form>
    </div>
  );
}
