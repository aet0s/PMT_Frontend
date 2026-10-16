import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../api/client';
import {
  Shield, Plus, Edit2, Trash2, CheckSquare, Square, Info, AlertTriangle,
  Copy, LayoutGrid, List, Check, X, Eye, UserCheck, ChevronDown, ChevronUp,
  Search, Lock, Unlock, CheckCircle2, SlidersHorizontal, Layers, Activity,
  Archive, Users, BarChart3, Settings2, FolderKanban, Sparkles, Crown, Briefcase, User
} from 'lucide-react';
import Button from '../ui/Button';
import Switch from '../ui/Switch';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useSocket } from '../../context/SocketProvider';
import {
  groupPermissionsByModule,
  getScopeBadge,
  getDangerousBadge,
  calculateEffectivePermissions,
  SYSTEM_ROLE_METADATA
} from '../../lib/roleEditorHelpers';
const getRoleIcon = (role) => {
  const name = (role?.name || '').toLowerCase();
  if (name.includes('owner')) return <Crown className="w-4 h-4 text-amber-500" />;
  if (name.includes('admin')) return <Shield className="w-4 h-4 text-primary" />;
  if (name.includes('project') || name.includes('manager')) return <Briefcase className="w-4 h-4 text-blue-500" />;
  if (name.includes('lead') || name.includes('team')) return <Users className="w-4 h-4 text-teal-500" />;
  if (name.includes('audit')) return <Eye className="w-4 h-4 text-indigo-500" />;
  return <User className="w-4 h-4 text-text-secondary" />;
};

const getModuleIcon = (moduleKey) => {
  const key = (moduleKey || '').toLowerCase();
  if (key.includes('work') || key.includes('admin') || key.includes('sec')) return <Shield className="w-4 h-4" />;
  if (key.includes('board')) return <Layers className="w-4 h-4" />;
  if (key.includes('task') || key.includes('card')) return <CheckSquare className="w-4 h-4" />;
  if (key.includes('activity')) return <Activity className="w-4 h-4" />;
  if (key.includes('arch')) return <Archive className="w-4 h-4" />;
  if (key.includes('member') || key.includes('user') || key.includes('role')) return <Users className="w-4 h-4" />;
  if (key.includes('rep') || key.includes('analyt')) return <BarChart3 className="w-4 h-4" />;
  if (key.includes('proj')) return <FolderKanban className="w-4 h-4" />;
  return <Settings2 className="w-4 h-4" />;
};

function RoleSelectorDropdown({ roles, selectedRoleId, onSelectRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  const filteredRoles = roles.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.rank !== undefined && String(r.rank).includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  const systemRoles = filteredRoles.filter((r) => r.is_system);
  const customRoles = filteredRoles.filter((r) => !r.is_system);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
        Select Member Role
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 bg-surface border rounded-xl text-left text-xs transition cursor-pointer shadow-2xs focus:outline-none ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-surface'
            : 'border-border hover:border-border-strong bg-surface'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-tint text-primary border border-primary/20 flex items-center justify-center shrink-0">
            {getRoleIcon(selectedRole)}
          </div>
          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-text-primary text-xs truncate">
                {selectedRole ? selectedRole.name : 'Choose role...'}
              </span>
              {selectedRole?.rank !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary-tint text-primary-text border border-primary/20 shrink-0">
                  Rank {selectedRole.rank}
                </span>
              )}
            </div>
            <span className="text-[10px] text-text-muted mt-0.5 truncate">
              {selectedRole?.is_system ? 'Built-in System Role' : 'Custom Workspace Role'}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-full min-w-[280px] bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in py-1">
          {roles.length > 4 && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter roles..."
                  className="w-full bg-surface-muted border border-border rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto divide-y divide-border/40 py-1">
            {systemRoles.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted bg-surface-muted/60 flex items-center justify-between">
                  <span>System Roles</span>
                  <span className="text-[9px] font-normal">{systemRoles.length}</span>
                </div>
                {systemRoles.map((r) => {
                  const isSelected = selectedRole?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onSelectRole(r.id);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-primary-tint text-primary-text font-semibold'
                          : 'hover:bg-surface-muted text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-surface-muted border border-border flex items-center justify-center shrink-0">
                          {getRoleIcon(r)}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{r.name}</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary-tint text-primary-text border border-primary/20 shrink-0">
                              Rank {r.rank || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {customRoles.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted bg-surface-muted/60 flex items-center justify-between">
                  <span>Custom Roles</span>
                  <span className="text-[9px] font-normal">{customRoles.length}</span>
                </div>
                {customRoles.map((r) => {
                  const isSelected = selectedRole?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onSelectRole(r.id);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-primary-tint text-primary-text font-semibold'
                          : 'hover:bg-surface-muted text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-surface-muted border border-border flex items-center justify-center shrink-0">
                          {getRoleIcon(r)}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{r.name}</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-info-tint text-info-text border border-info/20 shrink-0">
                              Rank {r.rank || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {filteredRoles.length === 0 && (
              <div className="p-4 text-center text-text-muted text-xs">
                No matching roles found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoleEditorTab({ workspaceId, onToast }) {
  const { socket, originId } = useSocket();
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showModal, setShowModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Effective Permissions Preview state
  const [allPermissionsList, setAllPermissionsList] = useState([]);
  const [selectedPreviewRoleId, setSelectedPreviewRoleId] = useState(null);
  const [previewBoardMember, setPreviewBoardMember] = useState(true);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewFilter, setPreviewFilter] = useState('all'); // 'all' | 'allowed' | 'restricted' | 'dangerous'
  const [previewScopeFilter, setPreviewScopeFilter] = useState('all'); // 'all' | 'company' | 'project'
  const [collapsedModules, setCollapsedModules] = useState(new Set());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        apiFetch(`/api/workspaces/${workspaceId}/roles`),
        apiFetch('/api/permissions')
      ]);
      const rawRoles = rolesData.roles || [];
      const seen = new Set();
      const uniqueRoles = [];
      for (const r of rawRoles) {
        const normalizedName = (r.name || '').trim().toLowerCase();
        if (r.is_system) {
          if (seen.has(normalizedName)) continue;
          seen.add(normalizedName);
        }
        uniqueRoles.push(r);
      }
      uniqueRoles.sort((a, b) => (b.rank || 0) - (a.rank || 0));
      setRoles(uniqueRoles);
      if (uniqueRoles.length > 0 && !selectedPreviewRoleId) {
        setSelectedPreviewRoleId(uniqueRoles[0].id);
      }

      const rawPerms = permsData.permissions || [];
      const cleanPerms = rawPerms.filter((p) => !p.planned);
      setAllPermissionsList(cleanPerms);

      // Clean module groups via pure helper function
      const cleanCategories = groupPermissionsByModule(rawPerms);
      setCategories(cleanCategories);
    } catch (err) {
      onToast?.(err.message || 'Failed to load roles and permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchData();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!socket || !workspaceId) return;
    socket.emit('join_workspace', { workspaceId });

    const onRoleCreated = ({ role, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      setRoles((prev) => {
        if (prev.some((r) => r.id === role.id)) return prev;
        return [...prev.filter((r) => !String(r.id).startsWith('temp-')), role];
      });
    };

    const onRoleUpdated = ({ role, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      setRoles((prev) => prev.map((r) => (r.id === role.id ? role : r)));
    };

    const onRoleDeleted = ({ roleId, originId: senderOrigin }) => {
      if (senderOrigin && senderOrigin === originId) return;
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    };

    socket.on('workspace:role_created', onRoleCreated);
    socket.on('workspace:role_updated', onRoleUpdated);
    socket.on('workspace:role_deleted', onRoleDeleted);

    return () => {
      socket.off('workspace:role_created', onRoleCreated);
      socket.off('workspace:role_updated', onRoleUpdated);
      socket.off('workspace:role_deleted', onRoleDeleted);
      socket.emit('leave_workspace', { workspaceId });
    };
  }, [socket, workspaceId, originId]);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setShowModal(true);
  };

  const handleCloneRole = (role) => {
    setEditingRole(null);
    setRoleName(`Copy of ${role.name}`);
    setSelectedPermissions(role.permission_keys || []);
    setShowModal(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permission_keys || []);
    setShowModal(true);
  };

  const handleTogglePermission = (key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleToggleCategory = (categoryPerms) => {
    const catKeys = categoryPerms.map((p) => p.key);
    const allSelected = catKeys.every((k) => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((k) => !catKeys.includes(k)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...catKeys])));
    }
  };

  const handlePreSave = (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      onToast?.('Role name is required', 'error');
      return;
    }

    if (editingRole && editingRole.is_editable) {
      const origKeys = editingRole.permission_keys || [];
      const added = selectedPermissions.filter((k) => !origKeys.includes(k));
      const removed = origKeys.filter((k) => !selectedPermissions.includes(k));

      if (added.length > 0 || removed.length > 0) {
        setShowDiffModal(true);
        return;
      }
    }

    executeSave();
  };

  const executeSave = async () => {
    const prevRoles = roles;
    const isEdit = !!editingRole;
    const tempId = isEdit ? editingRole.id : `temp-${Date.now()}`;
    const optimisticRole = {
      id: tempId,
      name: roleName.trim(),
      is_system: 0,
      is_editable: 1,
      permission_keys: selectedPermissions,
      member_count: isEdit ? (editingRole.member_count || 0) : 0
    };

    // Apply optimistic update immediately
    setRoles((prev) => {
      if (isEdit) {
        return prev.map((r) => (r.id === editingRole.id ? { ...r, ...optimisticRole } : r));
      }
      return [...prev, optimisticRole];
    });

    setShowDiffModal(false);
    setShowModal(false);

    try {
      setSaving(true);
      let res;
      if (isEdit) {
        res = await apiFetch(`/api/roles/${editingRole.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: roleName.trim(),
            permission_keys: selectedPermissions,
            workspace_id: workspaceId
          })
        });
        onToast?.('Custom role updated successfully', 'success');
      } else {
        res = await apiFetch(`/api/workspaces/${workspaceId}/roles`, {
          method: 'POST',
          body: JSON.stringify({
            name: roleName.trim(),
            permission_keys: selectedPermissions
          })
        });
        onToast?.('Custom role created successfully', 'success');
      }

      if (res?.role) {
        setRoles((prev) => prev.map((r) => (r.id === tempId ? res.role : r)));
      }
    } catch (err) {
      // Rollback on failure
      setRoles(prevRoles);
      onToast?.(err.message || 'Failed to save role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = (role) => {
    setRoleToDelete(role);
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-text-muted gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading workspace roles catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Roles & Permissions Matrix
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Enterprise RBAC system: 8 system roles with fine-grained capability evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-surface-muted border border-border rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-surface text-text-primary shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Matrix Grid
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'cards'
                  ? 'bg-surface text-text-primary shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Role Cards
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'preview'
                  ? 'bg-surface text-text-primary shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Effective Preview
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Role
          </Button>
        </div>
      </div>

      {/* MATRIX GRID VIEW */}
      {viewMode === 'grid' && (() => {
        const roleCount = Math.max(roles.length, 1);
        const roleColPercent = Number((70 / roleCount).toFixed(2));
        const permColPercent = Number((100 - roleColPercent * roles.length).toFixed(2));

        return (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs w-full">
            <div className="max-h-[680px] overflow-y-auto w-full">
              <table className="w-full table-fixed text-left border-collapse">
                <colgroup>
                  <col style={{ width: `${permColPercent}%` }} />
                  {roles.map((r) => (
                    <col key={r.id} style={{ width: `${roleColPercent}%` }} />
                  ))}
                </colgroup>
              <thead className="sticky top-0 z-20 bg-surface-muted border-b border-border text-xs">
                <tr>
                  <th className="p-3 px-4 text-text-secondary font-semibold uppercase tracking-wider text-[11px] border-r border-border">
                    Permission / Scope
                  </th>
                  {roles.map((role) => (
                    <th key={role.id} className="p-3 px-2 text-center font-semibold text-text-primary border-l border-border">
                      <div className="flex flex-col items-center gap-1 min-w-0">
                        <span className="text-text-primary text-xs font-bold truncate max-w-full">{role.name}</span>
                        <div className="flex items-center gap-1">
                          {role.is_system ? (
                            <span className="px-1.5 py-0.5 bg-primary-tint text-primary-text border border-primary/20 rounded text-[9px] uppercase font-semibold">
                              System
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-info-tint text-info-text border border-info/20 rounded text-[9px] uppercase font-semibold">
                              Custom
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCloneRole(role)}
                            title="Clone this role into a new custom role"
                            aria-label="Clone this role into a new custom role"
                            className="p-1 text-text-muted hover:text-primary rounded transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {role.is_editable && !role.is_system && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(role)}
                              title="Edit role"
                              aria-label="Edit role"
                              className="p-1 text-text-muted hover:text-primary rounded transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border text-xs">
                {categories.map((category) => (
                  <React.Fragment key={category.name}>
                    <tr className="bg-surface-muted">
                      <td
                        colSpan={roles.length + 1}
                        className="p-2.5 px-4 font-semibold text-primary-text uppercase tracking-wider text-[10px]"
                      >
                        {category.name} Module ({category.permissions.length} capabilities)
                      </td>
                    </tr>

                    {category.permissions.map((perm) => {
                      const isDangerous = perm.dangerous || perm.key.includes('delete') || perm.key.includes('reset');

                      return (
                        <tr key={perm.key} className="hover:bg-surface-muted/50 transition">
                          <td className="p-2.5 px-4 border-r border-border min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-text-primary text-xs truncate">{perm.key}</span>
                              {perm.scope && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0 ${
                                  perm.scope === 'company'
                                    ? 'bg-primary-tint text-primary-text border border-primary/20'
                                    : 'bg-surface-muted text-text-secondary border border-border'
                                }`}>
                                  {perm.scope}
                                </span>
                              )}
                              {isDangerous && (
                                <span className="px-1.5 py-0.2 bg-danger-tint text-danger-text border border-danger/20 rounded text-[9px] font-medium flex items-center gap-0.5 shrink-0">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Dangerous
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-secondary mt-0.5 font-sans truncate" title={perm.description}>{perm.description}</p>
                          </td>

                          {roles.map((role) => {
                            const isOwnerRole = role.name === 'Owner' || role.name === 'Super Admin';
                            const hasPerm = isOwnerRole || (role.permission_keys && role.permission_keys.includes(perm.key));

                            return (
                              <td key={role.id} className="p-2.5 px-2 text-center border-l border-border">
                                {hasPerm ? (
                                  <div className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-success-tint text-success-text border border-success/30">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-surface-muted text-text-muted">
                                    <X className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* ROLE CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const isSystem = role.is_system;
            const isEditable = role.is_editable;
            const isOwner = role.name === 'Owner' || role.name === 'Super Admin';

            return (
              <div
                key={role.id}
                className="bg-surface border border-border hover:border-border-strong rounded-2xl p-5 flex flex-col justify-between transition group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSystem
                            ? 'bg-primary-tint text-primary border border-primary/20'
                            : 'bg-info-tint text-info border border-info/20'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text-primary">{role.name}</span>
                          {isSystem ? (
                            <span className="px-2 py-0.5 bg-primary-tint border border-primary/30 text-primary text-[10px] font-semibold rounded-full uppercase tracking-wider">
                              Built-in
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-info-tint border border-info/30 text-info text-[10px] font-semibold rounded-full uppercase tracking-wider">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {role.member_count || 0} Member(s) assigned
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCloneRole(role)}
                        className="p-2 text-text-muted hover:text-primary hover:bg-surface-muted rounded-md transition cursor-pointer"
                        title="Clone role"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {isEditable && (
                        <button
                          onClick={() => handleOpenEdit(role)}
                          className="p-2 text-text-muted hover:text-primary hover:bg-surface-muted rounded-md transition cursor-pointer"
                          title="Edit role permissions"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {!isSystem && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          disabled={deletingId === role.id}
                          className="p-2 text-text-muted hover:text-danger hover:bg-danger-tint rounded-md transition disabled:opacity-50 cursor-pointer"
                          title="Delete custom role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {isOwner
                        ? 'Full administrative control over all company data, members, and billing. Immutable.'
                        : `${role.permission_keys?.length || 0} permissions assigned across company and project modules.`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-text-muted border-t border-border">
                  <span>Scope: Organization-wide</span>
                  <span>{isEditable ? 'Configurable' : 'Locked'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EFFECTIVE PERMISSIONS PREVIEW VIEW */}
      {viewMode === 'preview' && (() => {
        const selectedRole = roles.find((r) => r.id === selectedPreviewRoleId) || roles[0];
        if (!selectedRole) {
          return (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center shadow-xs">
              <Shield className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-xs text-text-muted font-medium">No roles available for preview.</p>
            </div>
          );
        }

        const effective = calculateEffectivePermissions({
          workspaceRole: selectedRole,
          isBoardMember: previewBoardMember,
          allCatalogPermissions: allPermissionsList
        });

        const roleMeta = SYSTEM_ROLE_METADATA[selectedRole.name] || {
          name: selectedRole.name,
          rank: selectedRole.rank || 30,
          description: selectedRole.description || 'Custom organization role configured for workspace members.'
        };

        const totalActive = allPermissionsList.length;
        const grantedCount = effective.effectiveKeys.size;
        const restrictedCount = Math.max(0, totalActive - grantedCount);
        const percentGranted = totalActive > 0 ? Math.round((grantedCount / totalActive) * 100) : 0;
        const dangerousCount = allPermissionsList.filter((p) => p.dangerous).length;

        const handleCopyKey = (key) => {
          if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(key);
            onToast?.(`Copied "${key}" to clipboard`, 'success');
          }
        };

        const toggleModule = (moduleKey) => {
          setCollapsedModules((prev) => {
            const next = new Set(prev);
            if (next.has(moduleKey)) {
              next.delete(moduleKey);
            } else {
              next.add(moduleKey);
            }
            return next;
          });
        };

        const allCollapsed = categories.length > 0 && categories.every((cat) => collapsedModules.has(cat.module || cat.name));

        const toggleAllModules = () => {
          if (allCollapsed) {
            setCollapsedModules(new Set());
          } else {
            setCollapsedModules(new Set(categories.map((c) => c.module || c.name)));
          }
        };

        // Filter categories & permissions
        const searchLower = previewSearch.toLowerCase().trim();
        let totalVisiblePerms = 0;

        const filteredCategories = categories.map((cat) => {
          const filteredPerms = cat.permissions.filter((p) => {
            // Text search
            if (searchLower) {
              const matchesSearch =
                p.key.toLowerCase().includes(searchLower) ||
                (p.label && p.label.toLowerCase().includes(searchLower)) ||
                (p.description && p.description.toLowerCase().includes(searchLower));
              if (!matchesSearch) return false;
            }

            // Scope filter
            if (previewScopeFilter !== 'all') {
              if (p.scope !== previewScopeFilter) return false;
            }

            // Status filter
            const isAllowed = effective.effectiveKeys.has(p.key);
            if (previewFilter === 'allowed' && !isAllowed) return false;
            if (previewFilter === 'restricted' && isAllowed) return false;
            if (previewFilter === 'dangerous' && !p.dangerous) return false;

            return true;
          });

          totalVisiblePerms += filteredPerms.length;

          return {
            ...cat,
            permissions: filteredPerms,
            totalAllowedInCat: cat.permissions.filter((p) => effective.effectiveKeys.has(p.key)).length
          };
        }).filter((cat) => cat.permissions.length > 0);

        return (
          <div className="space-y-6">
            {/* Top Control Bar: Custom Dropdown + Board Context Switch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Custom Role Selector Dropdown */}
              <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                <RoleSelectorDropdown
                  roles={roles}
                  selectedRoleId={selectedPreviewRoleId || selectedRole.id}
                  onSelectRole={(id) => setSelectedPreviewRoleId(id)}
                />
              </div>

              {/* Modern Target Board Context Switch Card */}
              <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    Target Board Context
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                      previewBoardMember
                        ? 'bg-success-tint text-success-text border-success/30'
                        : 'bg-surface-muted text-text-muted border-border'
                    }`}
                  >
                    {previewBoardMember ? 'Member Active' : 'Non-Member'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 mt-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        previewBoardMember
                          ? 'bg-success-tint text-success-text border border-success/30'
                          : 'bg-surface-muted text-text-muted border border-border'
                      }`}
                    >
                      {previewBoardMember ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary">
                        {previewBoardMember ? 'Evaluating as Assigned Board Member' : 'Evaluating as Non-Member'}
                      </p>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                        {previewBoardMember
                          ? 'Project-scoped permissions are unlocked via board membership.'
                          : 'Project-scoped permissions restricted; testing workspace-level access only.'}
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={previewBoardMember}
                    onChange={setPreviewBoardMember}
                    aria-label="Toggle target board membership"
                  />
                </div>
              </div>
            </div>

            {/* Executive Role Overview Banner */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-primary-tint text-primary border border-primary/25 flex items-center justify-center shrink-0 shadow-2xs">
                  {getRoleIcon(selectedRole)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-text-primary tracking-tight">{selectedRole.name}</h3>
                    <span className="px-2.5 py-0.5 bg-primary-tint border border-primary/25 text-primary-text rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Rank {selectedRole.rank || 0}
                    </span>
                    {selectedRole.is_system ? (
                      <span className="px-2.5 py-0.5 bg-surface-muted text-text-secondary border border-border rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Built-in System
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-info-tint text-info-text border border-info/25 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Custom Role
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface text-text-secondary border border-border">
                      Workspace Scope
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed max-w-2xl">
                    {roleMeta.description}
                  </p>
                </div>
              </div>

              {/* Executive Progress & Metrics Card */}
              <div className="w-full lg:w-72 bg-surface-muted/70 border border-border rounded-xl p-4 shrink-0 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Capability Coverage</span>
                  <span className="text-sm font-bold text-text-primary">{percentGranted}%</span>
                </div>

                {/* Themed Progress Bar */}
                <div className="w-full h-2.5 bg-surface border border-border rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 shadow-2xs"
                    style={{ width: `${percentGranted}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-0.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-success font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {grantedCount} Active
                  </span>
                  <span className="text-text-muted">/</span>
                  <span className="inline-flex items-center gap-1 text-text-secondary font-medium">
                    <Lock className="w-3.5 h-3.5 text-text-muted" />
                    {restrictedCount} Restricted
                  </span>
                  <span className="text-text-muted">/</span>
                  <span className="text-text-muted font-medium">{totalActive} Total</span>
                </div>
              </div>
            </div>

            {/* Filter Toolbar: Status tabs, Scope selector, Search & Expand All */}
            <div className="bg-surface border border-border rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Left: Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    previewFilter === 'all'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-surface-muted text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      previewFilter === 'all'
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-surface text-text-muted border border-border'
                    }`}
                  >
                    {totalActive}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFilter('allowed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    previewFilter === 'allowed'
                      ? 'bg-success text-white shadow-2xs'
                      : 'bg-surface-muted text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>Allowed</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      previewFilter === 'allowed' ? 'bg-white/20 text-white' : 'bg-success-tint text-success-text'
                    }`}
                  >
                    {grantedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFilter('restricted')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    previewFilter === 'restricted'
                      ? 'bg-surface-active text-text-primary font-bold shadow-2xs'
                      : 'bg-surface-muted text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Restricted</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      previewFilter === 'restricted'
                        ? 'bg-surface text-text-primary'
                        : 'bg-surface text-text-muted border border-border'
                    }`}
                  >
                    {restrictedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFilter('dangerous')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    previewFilter === 'dangerous'
                      ? 'bg-danger text-white shadow-2xs'
                      : 'bg-surface-muted text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Dangerous</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      previewFilter === 'dangerous' ? 'bg-white/20 text-white' : 'bg-danger-tint text-danger-text'
                    }`}
                  >
                    {dangerousCount}
                  </span>
                </button>

                {/* Scope selector */}
                <div className="h-4 w-px bg-border mx-1 shrink-0" />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewScopeFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
                      previewScopeFilter === 'all'
                        ? 'bg-primary-tint text-primary-text font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    All Scopes
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewScopeFilter('company')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
                      previewScopeFilter === 'company'
                        ? 'bg-primary-tint text-primary-text font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Company
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewScopeFilter('project')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
                      previewScopeFilter === 'project'
                        ? 'bg-info-tint text-info-text font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Project
                  </button>
                </div>
              </div>

              {/* Right: Search Input + Expand/Collapse All */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-60">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Filter by key or capability..."
                    className="w-full bg-surface border border-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                  {previewSearch && (
                    <button
                      type="button"
                      onClick={() => setPreviewSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={toggleAllModules}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary text-xs font-medium transition cursor-pointer shrink-0 flex items-center gap-1"
                  title={allCollapsed ? 'Expand all modules' : 'Collapse all modules'}
                >
                  {allCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
                </button>
              </div>
            </div>

            {/* Modules & Permission Cards */}
            {filteredCategories.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center shadow-xs animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-border text-text-muted flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-text-primary">No matching capabilities found</h4>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                  No capabilities match the selected search, status, or scope filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewSearch('');
                    setPreviewFilter('all');
                    setPreviewScopeFilter('all');
                  }}
                  className="mt-4 px-3.5 py-1.5 bg-primary-tint text-primary-text border border-primary/25 rounded-lg text-xs font-semibold hover:bg-primary-tint/80 transition cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCategories.map((cat) => {
                  const moduleKey = cat.module || cat.name;
                  const isCollapsed = collapsedModules.has(moduleKey);
                  const catGranted = cat.totalAllowedInCat;
                  const catTotal = cat.permissions.length;
                  const isFull = catGranted === catTotal;

                  return (
                    <div
                      key={moduleKey}
                      className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4 transition-all"
                    >
                      {/* Module Header with Accordion Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleModule(moduleKey)}
                        className="w-full flex items-center justify-between pb-3 border-b border-border/80 text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-primary group-hover:bg-primary-tint transition-colors shrink-0">
                            {getModuleIcon(moduleKey)}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-wider text-text-primary group-hover:text-primary transition-colors">
                              {cat.label || cat.name} Module
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isFull
                                  ? 'bg-success-tint text-success-text border-success/30'
                                  : catGranted > 0
                                  ? 'bg-primary-tint text-primary-text border-primary/20'
                                  : 'bg-surface-muted text-text-muted border-border'
                              }`}
                            >
                              {catGranted} / {catTotal} Allowed
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-text-muted group-hover:text-text-primary transition-colors">
                          <span className="text-[11px] hidden sm:inline">
                            {isCollapsed ? 'Show' : 'Hide'}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isCollapsed ? '' : 'rotate-180'
                            }`}
                          />
                        </div>
                      </button>

                      {/* Permission Cards Grid */}
                      {!isCollapsed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 animate-fade-in">
                          {cat.permissions.map((perm) => {
                            const isAllowed = effective.effectiveKeys.has(perm.key);
                            const scopeBadge = getScopeBadge(perm.scope);
                            const dangerousBadge = getDangerousBadge(perm);

                            return (
                              <div
                                key={perm.key}
                                className={`rounded-xl p-3.5 border flex flex-col justify-between transition-all duration-150 ${
                                  isAllowed
                                    ? 'bg-surface border-border hover:border-border-strong hover:shadow-2xs'
                                    : 'bg-surface-muted/30 border-border/60 hover:border-border opacity-70 hover:opacity-100'
                                }`}
                              >
                                <div>
                                  {/* Top Row: Icon + Monospace Key */}
                                  <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5 shrink-0">
                                      {isAllowed ? (
                                        <div className="w-6 h-6 rounded-lg bg-success-tint text-success-text border border-success/30 flex items-center justify-center">
                                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </div>
                                      ) : (
                                        <div className="w-6 h-6 rounded-lg bg-surface text-text-muted border border-border flex items-center justify-center">
                                          <Lock className="w-3.5 h-3.5" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1.5">
                                        <span
                                          className={`font-mono text-xs font-bold truncate block ${
                                            isAllowed
                                              ? 'text-text-primary'
                                              : 'text-text-secondary line-through decoration-text-muted/40'
                                          }`}
                                          title={perm.key}
                                        >
                                          {perm.key}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyKey(perm.key)}
                                          className="text-text-muted hover:text-primary transition p-0.5 shrink-0 cursor-pointer"
                                          title="Copy permission key"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>

                                      {/* Scope & Dangerous Badges */}
                                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border ${scopeBadge.className}`}
                                          title={scopeBadge.description}
                                        >
                                          {scopeBadge.label}
                                        </span>

                                        {dangerousBadge && (
                                          <span
                                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border flex items-center gap-0.5 ${dangerousBadge.className}`}
                                            title={dangerousBadge.tooltip}
                                          >
                                            <AlertTriangle className="w-2.5 h-2.5" />
                                            Dangerous
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  <p className="text-[11px] text-text-secondary mt-2.5 leading-relaxed line-clamp-2" title={perm.description || perm.label}>
                                    {perm.description || perm.label}
                                  </p>
                                </div>

                                {/* Bottom Micro Footer Status */}
                                <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[10px]">
                                  {isAllowed ? (
                                    <span className="text-success-text font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-success" />
                                      {perm.scope === 'company'
                                        ? 'Workspace Granted'
                                        : previewBoardMember
                                        ? 'Board Context Active'
                                        : 'Granted'}
                                    </span>
                                  ) : (
                                    <span className="text-text-muted font-medium flex items-center gap-1">
                                      <Lock className="w-3 h-3" />
                                      {perm.scope === 'project' && !previewBoardMember
                                        ? 'Requires Board Member'
                                        : 'Role Rank Too Low'}
                                    </span>
                                  )}
                                  <span className="text-text-muted uppercase text-[9px] font-bold">
                                    {isAllowed ? 'Allowed' : 'Restricted'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Role Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-text-primary/40 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-muted">
              <div>
                <h4 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {editingRole
                    ? editingRole.is_editable
                      ? `Edit Role: ${editingRole.name}`
                      : `View Role: ${editingRole.name}`
                    : 'Create Custom Role'}
                </h4>
                {editingRole && !editingRole.is_editable && (
                  <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Built-in roles cannot be modified.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-surface transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handlePreSave} className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Role Name</label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  disabled={editingRole && !editingRole.is_editable}
                  placeholder="e.g. QA Tester, Content Editor"
                  className="w-full bg-surface border border-border rounded-md px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-3">
                  Permissions Checklist ({selectedPermissions.length} selected)
                </label>

                <div className="space-y-6">
                  {categories.map((category) => {
                    const catKeys = category.permissions.map((p) => p.key);
                    const isAllCatSelected = catKeys.length > 0 && catKeys.every((k) => selectedPermissions.includes(k));
                    const isReadOnly = editingRole && !editingRole.is_editable;

                    return (
                      <div key={category.name} className="bg-surface-muted/50 border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {category.name}
                          </span>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleToggleCategory(category.permissions)}
                              className="text-[11px] font-medium text-text-secondary hover:text-text-primary flex items-center gap-1 transition cursor-pointer"
                            >
                              {isAllCatSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-text-muted" />}
                              Select All in {category.name}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {category.permissions.map((p) => {
                            const isChecked = selectedPermissions.includes(p.key) || editingRole?.name === 'Owner' || editingRole?.name === 'Super Admin';
                            const isDangerous = p.dangerous || p.key.includes('delete') || p.key.includes('reset');

                            return (
                              <label
                                key={p.key}
                                onClick={() => !isReadOnly && handleTogglePermission(p.key)}
                                className={`flex items-start gap-2.5 p-2.5 rounded-md border transition ${
                                  isChecked
                                    ? 'bg-primary-tint border-primary/40 text-text-primary'
                                    : 'bg-surface border-border text-text-secondary hover:border-border-strong'
                                } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-primary" />
                                  ) : (
                                    <Square className="w-4 h-4 text-text-muted" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-medium text-text-primary">{p.key}</p>
                                    {isDangerous && (
                                      <span className="px-1 py-0.1 bg-danger-tint text-danger text-[9px] rounded font-medium">
                                        !
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-text-secondary leading-tight mt-0.5">{p.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3 bg-surface-muted/50 -mx-6 -mb-6 p-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  {editingRole && !editingRole.is_editable ? 'Close' : 'Cancel'}
                </Button>
                {(!editingRole || editingRole.is_editable) && (
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={saving}
                    isLoading={saving}
                  >
                    {editingRole ? 'Review & Save' : 'Create Role'}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIFF CONFIRMATION MODAL */}
      {showDiffModal && editingRole && (
        <div className="fixed inset-0 z-50 bg-text-primary/40 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg p-6 shadow-xl space-y-5 animate-fade-in">
            <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Confirm Permission Changes for "{roleName}"
            </h4>

            <p className="text-xs text-text-secondary">
              Review the differences below before updating this role:
            </p>

            {selectedPermissions.filter((k) => !(editingRole.permission_keys || []).includes(k)).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-success">
                  + Permissions Added (
                  {selectedPermissions.filter((k) => !(editingRole.permission_keys || []).includes(k)).length}
                  )
                </span>
                <div className="bg-success-tint border border-success/30 rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                  {selectedPermissions
                    .filter((k) => !(editingRole.permission_keys || []).includes(k))
                    .map((k) => (
                      <p key={k} className="text-xs font-mono text-success">
                        + {k}
                      </p>
                    ))}
                </div>
              </div>
            )}

            {(editingRole.permission_keys || []).filter((k) => !selectedPermissions.includes(k)).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-danger">
                  - Permissions Revoked (
                  {(editingRole.permission_keys || []).filter((k) => !selectedPermissions.includes(k)).length}
                  )
                </span>
                <div className="bg-danger-tint border border-danger/30 rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                  {(editingRole.permission_keys || [])
                    .filter((k) => !selectedPermissions.includes(k))
                    .map((k) => (
                      <p key={k} className="text-xs font-mono text-danger">
                        - {k}
                      </p>
                    ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDiffModal(false)}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={executeSave}
                disabled={saving}
                isLoading={saving}
              >
                Confirm & Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!roleToDelete}
        title="Delete Custom Role"
        message={`Are you sure you want to delete custom role "${roleToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Role"
        variant="danger"
        isLoading={!!deletingId}
        onConfirm={async () => {
          if (!roleToDelete) return;
          const targetId = roleToDelete.id;
          const prevRoles = roles;
          // Optimistically remove role immediately
          setRoles((prev) => prev.filter((r) => r.id !== targetId));
          setRoleToDelete(null);

          try {
            setDeletingId(targetId);
            await apiFetch(`/api/roles/${targetId}`, {
              method: 'DELETE',
              body: JSON.stringify({ workspace_id: workspaceId })
            });
            onToast?.('Custom role deleted successfully', 'success');
          } catch (err) {
            // Rollback on failure
            setRoles(prevRoles);
            onToast?.(err.message || 'Failed to delete role', 'error');
          } finally {
            setDeletingId(null);
          }
        }}
        onCancel={() => setRoleToDelete(null)}
      />
    </div>
  );
}
