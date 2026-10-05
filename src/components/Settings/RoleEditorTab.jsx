import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { Shield, Plus, Edit2, Trash2, CheckSquare, Square, Info, AlertTriangle, Copy, LayoutGrid, List, Check, X } from 'lucide-react';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function RoleEditorTab({ workspaceId, onToast }) {
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        apiFetch(`/api/workspaces/${workspaceId}/roles`),
        apiFetch('/api/permissions')
      ]);
      setRoles(rolesData.roles || []);
      setCategories(permsData.categories || []);
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
    try {
      setSaving(true);
      if (editingRole) {
        await apiFetch(`/api/roles/${editingRole.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: roleName.trim(),
            permission_keys: selectedPermissions
          })
        });
        onToast?.('Custom role updated successfully', 'success');
      } else {
        await apiFetch(`/api/workspaces/${workspaceId}/roles`, {
          method: 'POST',
          body: JSON.stringify({
            name: roleName.trim(),
            permission_keys: selectedPermissions
          })
        });
        onToast?.('Custom role created successfully', 'success');
      }

      setShowDiffModal(false);
      setShowModal(false);
      fetchData();
    } catch (err) {
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
            Enterprise RBAC system: 6 system roles with fine-grained capability evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-surface-muted border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-surface text-text-primary shadow-xs font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Matrix Grid
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition ${
                viewMode === 'cards'
                  ? 'bg-surface text-text-primary shadow-xs font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Role Cards
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
      {viewMode === 'grid' && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-surface-muted border-b border-border text-xs">
                <tr>
                  <th className="p-3.5 min-w-[260px] text-text-secondary font-semibold uppercase tracking-wider text-[11px] sticky left-0 z-30 bg-surface-muted border-r border-border">
                    Permission / Scope
                  </th>
                  {roles.map((role) => (
                    <th key={role.id} className="p-3.5 min-w-[140px] text-center font-semibold text-text-primary">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-text-primary text-xs">{role.name}</span>
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
                          <td className="p-3 sticky left-0 z-10 bg-surface border-r border-border">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-text-primary text-xs">{perm.key}</span>
                              {isDangerous && (
                                <span className="px-1.5 py-0.2 bg-danger-tint text-danger-text border border-danger/20 rounded text-[9px] font-medium flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Dangerous
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-secondary mt-0.5 font-sans">{perm.description}</p>
                          </td>

                          {roles.map((role) => {
                            const isOwnerRole = role.name === 'Owner' || role.name === 'Super Admin';
                            const hasPerm = isOwnerRole || (role.permission_keys && role.permission_keys.includes(perm.key));

                            return (
                              <td key={role.id} className="p-3 text-center border-l border-border">
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
      )}

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
                className="bg-surface border border-border hover:border-border-strong rounded-xl p-5 flex flex-col justify-between transition group shadow-xs"
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
          try {
            setDeletingId(roleToDelete.id);
            await apiFetch(`/api/roles/${roleToDelete.id}`, { method: 'DELETE' });
            onToast?.('Custom role deleted successfully', 'success');
            setRoleToDelete(null);
            fetchData();
          } catch (err) {
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
