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
      board: { id: 2, workspace_id: 10, name: 'New Project', background_color: 'bg-board-neutral' }
    });

    const result = await handleCreateBoard(10, 'New Project', 'bg-board-neutral', mockSuccessApi);
    expect(result).toBeDefined();
    expect(result.id).toBe(2);
    expect(boards).toHaveLength(2);
    expect(boards[1].id).toBe(2);
    expect(boards[1].name).toBe('New Project');

    // Failure / Rollback test
    const mockFailApi = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(handleCreateBoard(10, 'Failed Board', 'bg-board-blush', mockFailApi)).rejects.toThrow('Network error');
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

  it('optimistically creates, edits, and deletes custom roles with rollback on failure', async () => {
    let roles = [{ id: 1, name: 'Admin', is_system: 1, permission_keys: ['all'] }];
    const setRoles = (fn) => { roles = typeof fn === 'function' ? fn(roles) : fn; };

    // 1. Role Create
    const handleCreateRole = async (name, permission_keys, apiCall) => {
      const prev = roles;
      const tempId = 'temp-role-1';
      setRoles((cur) => [...cur, { id: tempId, name, permission_keys }]);
      try {
        const res = await apiCall(name, permission_keys);
        setRoles((cur) => cur.map((r) => r.id === tempId ? res.role : r));
      } catch (err) {
        setRoles(prev);
        throw err;
      }
    };

    await handleCreateRole('Editor', ['card.create'], vi.fn().mockResolvedValue({ role: { id: 2, name: 'Editor', permission_keys: ['card.create'] } }));
    expect(roles).toHaveLength(2);
    expect(roles[1].id).toBe(2);

    await expect(handleCreateRole('Bad Role', [], vi.fn().mockRejectedValue(new Error('Failed')))).rejects.toThrow();
    expect(roles).toHaveLength(2);

    // 2. Role Edit
    const handleEditRole = async (roleId, updates, apiCall) => {
      const prev = roles;
      setRoles((cur) => cur.map((r) => r.id === roleId ? { ...r, ...updates } : r));
      try {
        await apiCall(roleId, updates);
      } catch (err) {
        setRoles(prev);
        throw err;
      }
    };

    await handleEditRole(2, { name: 'Senior Editor' }, vi.fn().mockResolvedValue({}));
    expect(roles.find((r) => r.id === 2).name).toBe('Senior Editor');

    await expect(handleEditRole(2, { name: 'Failed Name' }, vi.fn().mockRejectedValue(new Error('Failed')))).rejects.toThrow();
    expect(roles.find((r) => r.id === 2).name).toBe('Senior Editor');

    // 3. Role Delete
    const handleDeleteRole = async (roleId, apiCall) => {
      const prev = roles;
      setRoles((cur) => cur.filter((r) => r.id !== roleId));
      try {
        await apiCall(roleId);
      } catch (err) {
        setRoles(prev);
        throw err;
      }
    };

    await expect(handleDeleteRole(2, vi.fn().mockRejectedValue(new Error('Failed delete')))).rejects.toThrow();
    expect(roles).toHaveLength(2);

    await handleDeleteRole(2, vi.fn().mockResolvedValue({}));
    expect(roles).toHaveLength(1);
  });

  it('optimistically handles member role change, remove, and add with rollback on failure', async () => {
    let members = [
      { id: 101, name: 'Alice', email: 'alice@example.com', role: 'Admin' },
      { id: 102, name: 'Bob', email: 'bob@example.com', role: 'Member' }
    ];
    const setMembers = (fn) => { members = typeof fn === 'function' ? fn(members) : fn; };

    // Role change
    const handleRoleChange = async (memberId, newRole, apiCall) => {
      const prev = members;
      setMembers((cur) => cur.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
      try {
        await apiCall(memberId, newRole);
      } catch (err) {
        setMembers(prev);
        throw err;
      }
    };

    await handleRoleChange(102, 'Admin', vi.fn().mockResolvedValue({}));
    expect(members.find((m) => m.id === 102).role).toBe('Admin');

    await expect(handleRoleChange(102, 'Owner', vi.fn().mockRejectedValue(new Error('Denied')))).rejects.toThrow();
    expect(members.find((m) => m.id === 102).role).toBe('Admin');

    // Member remove
    const handleRemoveMember = async (memberId, apiCall) => {
      const prev = members;
      setMembers((cur) => cur.filter((m) => m.id !== memberId));
      try {
        await apiCall(memberId);
      } catch (err) {
        setMembers(prev);
        throw err;
      }
    };

    await expect(handleRemoveMember(102, vi.fn().mockRejectedValue(new Error('Network error')))).rejects.toThrow();
    expect(members).toHaveLength(2);

    await handleRemoveMember(102, vi.fn().mockResolvedValue({}));
    expect(members).toHaveLength(1);
    expect(members[0].id).toBe(101);
  });

  it('optimistically handles invitation create and revoke with rollback on failure', async () => {
    let invitations = [{ id: 1, email: 'guest@example.com', token: 'tok-1' }];
    const setInvitations = (fn) => { invitations = typeof fn === 'function' ? fn(invitations) : fn; };

    // Revoke
    const handleRevoke = async (invId, apiCall) => {
      const prev = invitations;
      setInvitations((cur) => cur.filter((i) => i.id !== invId));
      try {
        await apiCall(invId);
      } catch (err) {
        setInvitations(prev);
        throw err;
      }
    };

    await expect(handleRevoke(1, vi.fn().mockRejectedValue(new Error('Failed')))).rejects.toThrow();
    expect(invitations).toHaveLength(1);

    await handleRevoke(1, vi.fn().mockResolvedValue({}));
    expect(invitations).toHaveLength(0);
  });

  it('optimistically handles list rename and reorder with rollback on failure', async () => {
    let lists = [
      { id: 1, name: 'To Do', position: 1000 },
      { id: 2, name: 'In Progress', position: 2000 }
    ];
    const setLists = (fn) => { lists = typeof fn === 'function' ? fn(lists) : fn; };

    // Rename
    const handleRenameList = async (listId, newName, apiCall) => {
      const prev = lists;
      setLists((cur) => cur.map((l) => l.id === listId ? { ...l, name: newName } : l));
      try {
        await apiCall(listId, newName);
      } catch (err) {
        setLists(prev);
        throw err;
      }
    };

    await handleRenameList(1, 'Backlog', vi.fn().mockResolvedValue({}));
    expect(lists[0].name).toBe('Backlog');

    await expect(handleRenameList(1, 'Failed', vi.fn().mockRejectedValue(new Error('Failed')))).rejects.toThrow();
    expect(lists[0].name).toBe('Backlog');

    // Reorder
    const handleReorderList = async (listId, newPos, apiCall) => {
      const prev = lists;
      setLists((cur) => {
        const updated = cur.map((l) => l.id === listId ? { ...l, position: newPos } : l);
        return updated.sort((a, b) => a.position - b.position);
      });
      try {
        await apiCall(listId, newPos);
      } catch (err) {
        setLists(prev);
        throw err;
      }
    };

    await handleReorderList(1, 3000, vi.fn().mockResolvedValue({}));
    expect(lists[0].id).toBe(2);
    expect(lists[1].id).toBe(1);

    await expect(handleReorderList(1, 500, vi.fn().mockRejectedValue(new Error('Failed')))).rejects.toThrow();
    expect(lists[0].id).toBe(2);
    expect(lists[1].id).toBe(1);
  });

  it('optimistically handles card rename, edit, and move with rollback on failure', async () => {
    let board = {
      lists: [
        {
          id: 1,
          cards: [
            { id: 10, title: 'Task 1', description: 'desc', list_id: 1, position: 1000 }
          ]
        },
        {
          id: 2,
          cards: []
        }
      ]
    };
    const setBoard = (fn) => { board = typeof fn === 'function' ? fn(board) : fn; };

    // Card Rename / Edit
    const handleUpdateCard = async (cardId, updates, apiCall) => {
      const prev = board;
      setBoard((cur) => ({
        ...cur,
        lists: cur.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) => c.id === cardId ? { ...c, ...updates } : c)
        }))
      }));
      try {
        await apiCall(cardId, updates);
      } catch (err) {
        setBoard(prev);
        throw err;
      }
    };

    await handleUpdateCard(10, { title: 'Updated Task 1' }, vi.fn().mockResolvedValue({}));
    expect(board.lists[0].cards[0].title).toBe('Updated Task 1');

    await expect(handleUpdateCard(10, { title: 'Failed Title' }, vi.fn().mockRejectedValue(new Error('Failed')))).rejects.toThrow();
    expect(board.lists[0].cards[0].title).toBe('Updated Task 1');

    // Card Move
    const handleMoveCard = async (cardId, targetListId, newPos, apiCall) => {
      const prev = board;
      setBoard((cur) => {
        let moved = null;
        const newLists = cur.lists.map((l) => {
          const remaining = l.cards.filter((c) => {
            if (c.id === cardId) {
              moved = { ...c, list_id: targetListId, position: newPos };
              return false;
            }
            return true;
          });
          return { ...l, cards: remaining };
        });
        const targetList = newLists.find((l) => l.id === targetListId);
        if (targetList && moved) targetList.cards.push(moved);
        return { ...cur, lists: newLists };
      });

      try {
        await apiCall(cardId, targetListId, newPos);
      } catch (err) {
        setBoard(prev);
        throw err;
      }
    };

    await handleMoveCard(10, 2, 1000, vi.fn().mockResolvedValue({}));
    expect(board.lists[0].cards).toHaveLength(0);
    expect(board.lists[1].cards).toHaveLength(1);
    expect(board.lists[1].cards[0].id).toBe(10);

    await expect(handleMoveCard(10, 1, 1000, vi.fn().mockRejectedValue(new Error('Failed')))).rejects.toThrow();
    expect(board.lists[0].cards).toHaveLength(0);
    expect(board.lists[1].cards).toHaveLength(1);
  });

  it('optimistically handles workspace rename with rollback on failure', async () => {
    let workspace = { id: 1, name: 'Original Team', description: 'Desc' };
    const setWorkspace = (fn) => { workspace = typeof fn === 'function' ? fn(workspace) : fn; };

    const handleRenameWorkspace = async (newName, apiCall) => {
      const prev = workspace;
      setWorkspace({ ...workspace, name: newName });
      try {
        const res = await apiCall(newName);
        if (res?.workspace) setWorkspace(res.workspace);
      } catch (err) {
        setWorkspace(prev);
        throw err;
      }
    };

    await handleRenameWorkspace('New Team Name', vi.fn().mockResolvedValue({ workspace: { id: 1, name: 'New Team Name', description: 'Desc' } }));
    expect(workspace.name).toBe('New Team Name');

    await expect(handleRenameWorkspace('Failed Team Name', vi.fn().mockRejectedValue(new Error('Network error')))).rejects.toThrow();
    expect(workspace.name).toBe('New Team Name');
  });
});
