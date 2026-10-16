// client/src/lib/roleEditorHelpers.js
// Pure functions for Role Editor UI: grouping, badges, planned key filtering, and effective permission calculation.

/**
 * Standard system role definitions and display metadata.
 */
export const SYSTEM_ROLE_METADATA = {
  Owner: {
    name: 'Owner',
    rank: 100,
    badgeColor: 'purple',
    description: 'Full administrative control over the company workspace and all projects.'
  },
  Admin: {
    name: 'Admin',
    rank: 80,
    badgeColor: 'indigo',
    description: 'Company-wide management excluding workspace deletion.'
  },
  'Project Manager': {
    name: 'Project Manager',
    rank: 60,
    badgeColor: 'blue',
    description: 'Manage boards, lists, cards, and invite guests.'
  },
  'Team Lead': {
    name: 'Team Lead',
    rank: 50,
    badgeColor: 'teal',
    description: 'Lead teams with card creation, assignment, and board moderation.'
  },
  'Team Member': {
    name: 'Team Member',
    rank: 40,
    badgeColor: 'green',
    description: 'Collaborate on assigned boards, manage own tasks and comments.'
  },
  Viewer: {
    name: 'Viewer',
    rank: 20,
    badgeColor: 'gray',
    description: 'Read-only access to boards and tasks.'
  },
  Auditor: {
    name: 'Auditor',
    rank: 15,
    badgeColor: 'amber',
    description: 'Read-only access to boards, tasks, activity, and audit logs.'
  },
  Guest: {
    name: 'Guest',
    rank: 10,
    badgeColor: 'slate',
    description: 'Restricted guest access strictly limited to invited boards.'
  }
};

/**
 * Filters out planned permissions and groups active permissions by module.
 * 
 * @param {Array<Object>} permissions - List of permission objects from catalog.
 * @param {Object} [options]
 * @param {boolean} [options.includePlanned=false] - Whether to include planned keys.
 * @returns {Array<{ module: string, label: string, permissions: Array<Object> }>}
 */
export function groupPermissionsByModule(permissions = [], options = {}) {
  const { includePlanned = false } = options;
  const groups = new Map();

  for (const perm of permissions) {
    if (!includePlanned && (perm.planned === 1 || perm.planned === true)) {
      continue;
    }

    const moduleKey = perm.module || perm.category || 'general';
    if (!groups.has(moduleKey)) {
      const moduleLabel = moduleKey
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      groups.set(moduleKey, {
        module: moduleKey,
        label: moduleLabel,
        permissions: []
      });
    }

    groups.get(moduleKey).permissions.push({
      ...perm,
      dangerous: Boolean(perm.dangerous),
      planned: Boolean(perm.planned),
      scope: perm.scope || 'project'
    });
  }

  // Sort groups alphabetically by label, and permissions by key
  return Array.from(groups.values())
    .map((g) => ({
      ...g,
      permissions: g.permissions.sort((a, b) => (a.label || a.key).localeCompare(b.label || b.key))
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Returns scope badge metadata (label, color token, tooltip) for a given scope.
 * 
 * @param {string} scope - 'company' | 'project'
 * @returns {{ label: string, color: string, className: string, description: string }}
 */
export function getScopeBadge(scope) {
  const normalized = (scope || '').toLowerCase().trim();
  if (normalized === 'company') {
    return {
      label: 'Company',
      color: 'purple',
      className: 'bg-primary-tint text-primary-text border border-primary/25',
      description: 'Applies workspace-wide across all boards and company resources.'
    };
  }
  return {
    label: 'Project',
    color: 'blue',
    className: 'bg-info-tint text-info-text border border-info/25',
    description: 'Scoped strictly to boards and projects where the user is an active member.'
  };
}

/**
 * Returns dangerous badge metadata if the permission is flagged dangerous.
 * 
 * @param {Object} perm - Permission object
 * @returns {{ isDangerous: boolean, label?: string, color?: string, className?: string, tooltip?: string } | null}
 */
export function getDangerousBadge(perm) {
  if (!perm || !perm.dangerous) return null;
  return {
    isDangerous: true,
    label: 'Dangerous',
    color: 'red',
    className: 'bg-danger-tint text-danger-text border border-danger/25 font-medium',
    tooltip: 'High-risk action with potential data loss or security impact.'
  };
}

/**
 * Calculates the effective permission set for a selected member in a workspace/board context.
 * 
 * @param {Object} params
 * @param {Object} params.workspaceRole - { rank: number, permissions: string[], is_system?: boolean }
 * @param {Object} [params.boardRole] - { rank?: number, permissions?: string[] }
 * @param {boolean} [params.isBoardMember=false] - Whether the user is an explicit board member.
 * @param {Array<Object>} [params.allCatalogPermissions=[]] - All available non-planned catalog permissions.
 * @returns {{ effectiveKeys: Set<string>, permissionsList: string[], isOwner: boolean }}
 */
export function calculateEffectivePermissions({
  workspaceRole,
  boardRole = null,
  isBoardMember = false,
  allCatalogPermissions = []
}) {
  const effectiveKeys = new Set();
  const wsRank = workspaceRole?.rank || 0;
  const isOwner = Boolean(workspaceRole?.is_system && wsRank >= 100);

  if (isOwner) {
    // Owner receives all active catalog permissions
    for (const p of allCatalogPermissions) {
      if (!p.planned) {
        effectiveKeys.add(p.key);
      }
    }
    return {
      effectiveKeys,
      permissionsList: Array.from(effectiveKeys).sort(),
      isOwner: true
    };
  }

  // Add workspace-level permissions
  const wsPerms = workspaceRole?.permissions || [];
  for (const k of wsPerms) {
    effectiveKeys.add(k);
  }

  // If user is a board member, layer on board-role permissions (capped or explicit)
  if (isBoardMember && boardRole?.permissions) {
    for (const k of boardRole.permissions) {
      effectiveKeys.add(k);
    }
  }

  return {
    effectiveKeys,
    permissionsList: Array.from(effectiveKeys).sort(),
    isOwner: false
  };
}
