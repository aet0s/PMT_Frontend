import { describe, it, expect, vi } from 'vitest';

describe('Board and Entity Immediate State Updates with Rollback', () => {
  it('creates board and updates boards list immediately with rollback on failure', async () => {
    let boards = [{ id: 1, name: 'First Board' }];
    const setBoards = (updater) => {
      boards = typeof updater === 'function' ? updater(boards) : updater;
    };

    // Simulated handleCreateBoard logic
    const handleCreateBoard = async (wsId, name, color, apiCreate) => {
      const tempId = 'temp-' + Date.now();
      const optimisticBoard = { id: tempId, workspace_id: wsId, name, background_color: color };
      
      // Immediate optimistic update
      setBoards((prev) => [...prev, optimisticBoard]);
      expect(boards.some((b) => b.name === name)).toBe(true);

      try {
        const res = await apiCreate(wsId, name, color);
        setBoards((prev) => prev.map((b) => (b.id === tempId ? res.board : b)));
        return res.board;
      } catch (err) {
        // Rollback
        setBoards((prev) => prev.filter((b) => b.id !== tempId));
        throw err;
      }
    };

    // Happy path test
    const mockSuccessApi = vi.fn().mockResolvedValue({
      board: { id: 2, workspace_id: 10, name: 'New Project', background_color: '#0d9488' }
    });

    const result = await handleCreateBoard(10, 'New Project', '#0d9488', mockSuccessApi);
    expect(result).toBeDefined();
    expect(result.id).toBe(2);
    expect(boards).toHaveLength(2);
    expect(boards[1].id).toBe(2);
    expect(boards[1].name).toBe('New Project');

    // Failure / Rollback test
    const mockFailApi = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(handleCreateBoard(10, 'Failed Board', '#ef4444', mockFailApi)).rejects.toThrow('Network error');
    expect(boards).toHaveLength(2);
    expect(boards.some((b) => b.name === 'Failed Board')).toBe(false);
  });

  it('deletes board and removes it from list immediately with rollback', async () => {
    let boards = [
      { id: 1, name: 'Board 1' },
      { id: 2, name: 'Board 2' }
    ];
    const setBoards = (updater) => {
      boards = typeof updater === 'function' ? updater(boards) : updater;
    };

    const handleDeleteBoard = async (boardId, apiDelete) => {
      const prev = boards;
      setBoards((cur) => cur.filter((b) => b.id !== boardId));
      expect(boards.some((b) => b.id === boardId)).toBe(false);

      try {
        await apiDelete(boardId);
      } catch (err) {
        setBoards(prev);
        throw err;
      }
    };

    // Success
    await handleDeleteBoard(1, vi.fn().mockResolvedValue({ success: true }));
    expect(boards).toHaveLength(1);
    expect(boards[0].id).toBe(2);

    // Rollback on error
    await expect(handleDeleteBoard(2, vi.fn().mockRejectedValue(new Error('Delete failed')))).rejects.toThrow();
    expect(boards).toHaveLength(1);
    expect(boards[0].id).toBe(2);
  });
});
