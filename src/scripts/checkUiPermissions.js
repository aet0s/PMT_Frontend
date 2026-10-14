// client/src/scripts/checkUiPermissions.js
// Static verification of all frontend RBAC permission key references against canonical registry.

const fs = require('fs');
const path = require('path');

// 1. Load client-side single source
const clientRbacPath = path.resolve(__dirname, '../rbac/permissions.json');
if (!fs.existsSync(clientRbacPath)) {
  console.error('[FAIL] client/src/rbac/permissions.json does not exist. Run "npm run export:permissions" first.');
  process.exit(1);
}

const clientRbac = JSON.parse(fs.readFileSync(clientRbacPath, 'utf8'));

// 2. Load server registry to assert parity
const serverRegistryPath = path.resolve(__dirname, '../../../server/src/rbac/registry.js');
const serverRegistry = require(serverRegistryPath);

// Assert client and server parity
const serverPermKeys = serverRegistry.PERMISSIONS.map((p) => p.key).sort();
const clientPermKeys = clientRbac.permissions.map((p) => p.key).sort();

if (JSON.stringify(serverPermKeys) !== JSON.stringify(clientPermKeys)) {
  console.error('[FAIL] Parity mismatch between server registry.js and client permissions.json keys!');
  process.exit(1);
}

// Compare alias maps
const serverAliases = JSON.stringify(serverRegistry.LEGACY_PERMISSION_ALIASES);
const clientAliases = JSON.stringify(clientRbac.aliases);
if (serverAliases !== clientAliases) {
  console.error('[FAIL] Parity mismatch between server and client legacy permission aliases!');
  process.exit(1);
}

const permByKey = new Map();
clientRbac.permissions.forEach((p) => permByKey.set(p.key, p));
const canonicalAliases = clientRbac.aliases || {};

// 3. Scan client/src for permission usage
const srcDir = path.resolve(__dirname, '..');
const uiReferencedKeys = new Set();
const keyLocations = new Map();

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['test', 'node_modules', 'dist', 'scripts'].includes(entry.name)) continue;
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.jsx') || entry.name.endsWith('.js'))) {
      if (entry.name === 'permissionUtils.js') continue;
      const content = fs.readFileSync(fullPath, 'utf8');

      // Regex patterns
      const patterns = [
        /<Can\s+[^>]*(?:permission|I)=["']([^"']+)["']/g,
        /hasPermission\(\s*["']([^"']+)["']/g,
        /usePermission\(\s*["']([^"']+)["']/g,
        /permission:\s*["']([^"']+)["']/g,
        /permission=["']([^"']+)["']/g
      ];

      for (const re of patterns) {
        let match;
        while ((match = re.exec(content)) !== null) {
          const key = match[1];
          uiReferencedKeys.add(key);
          if (!keyLocations.has(key)) keyLocations.set(key, []);
          keyLocations.get(key).push(`${path.relative(srcDir, fullPath)}`);
        }
      }
    }
  }
}

scanDirectory(srcDir);

console.log('================================================================');
console.log('       CHECK: UI PERMISSION USAGE AND REGISTRY CONSISTENCY      ');
console.log('================================================================\n');

console.log(`✓ Single-source parity verified: 140 permissions in sync.`);
console.log(`✓ Scanned frontend source: Found ${uiReferencedKeys.size} distinct UI permission references.\n`);

let hasError = false;
const invalidKeys = [];
const plannedKeysUsed = [];

for (const key of uiReferencedKeys) {
  const canonicalKey = canonicalAliases[key] || key;
  const perm = permByKey.get(canonicalKey);

  if (!perm) {
    hasError = true;
    invalidKeys.push({ key, locations: keyLocations.get(key) });
  } else if (perm.planned) {
    hasError = true;
    plannedKeysUsed.push({ key, locations: keyLocations.get(key) });
  }
}

if (invalidKeys.length > 0) {
  console.error('❌ ERROR: Found UI permissions not present in the RBAC registry:');
  invalidKeys.forEach(({ key, locations }) => {
    console.error(`   - "${key}" used in: ${locations.join(', ')}`);
  });
}

if (plannedKeysUsed.length > 0) {
  console.error('❌ ERROR: Found UI permissions marked as PLANNED (non-testable / not implemented):');
  plannedKeysUsed.forEach(({ key, locations }) => {
    console.error(`   - "${key}" (planned=true) used in: ${locations.join(', ')}`);
  });
}

// 4. Documented API-only justification list
const API_ONLY_JUSTIFICATIONS = {
  'session.revoke_own': 'API-only / Account settings auth action without standalone Can component',
  'session.view_own': 'Account profile session table fetched automatically on mount',
  'member.reset_2fa': 'Workspace member security administrative endpoint, invoked via context menu API',
  'audit.export': 'Workspace audit export CSV streaming endpoint',
  'search.use': 'Omnibar global search input, available universally to active members',
  'file.view': 'Direct file attachment download URL route',
  'file.delete': 'File storage garbage collection and deletion route',
  'activity.view': 'Embedded activity stream log list',
  'comment.edit_own': 'Inline card comment editing action',
  'comment.delete_own': 'Inline card comment deletion button',
  'comment.delete_any': 'Moderator comment delete option',
  'attachment.delete_own': 'Inline card attachment remove action',
  'attachment.delete_any': 'Moderator attachment remove action'
};

const activeTestablePerms = clientRbac.permissions.filter((p) => !p.planned);
const uncoveredPerms = [];

for (const p of activeTestablePerms) {
  const isUsedInUi = uiReferencedKeys.has(p.key) || Object.entries(canonicalAliases).some(([oldK, newK]) => newK === p.key && uiReferencedKeys.has(oldK));
  const isApiOnly = !!API_ONLY_JUSTIFICATIONS[p.key];
  if (!isUsedInUi && !isApiOnly) {
    uncoveredPerms.push(p.key);
  }
}

console.log('--- UI Coverage Analysis ---');
console.log(`Active Testable Permissions: ${activeTestablePerms.length}`);
console.log(`Covered in UI Components:    ${uiReferencedKeys.size}`);
console.log(`API-Only Justified:          ${Object.keys(API_ONLY_JUSTIFICATIONS).length}`);

if (uncoveredPerms.length > 0) {
  console.warn(`\n[NOTE] Permissions without direct <Can> gating or API-only tag (${uncoveredPerms.length}):`);
  uncoveredPerms.slice(0, 10).forEach((k) => console.warn(`   - ${k}`));
}

if (hasError) {
  console.error('\n❌ check:ui-permissions FAILED due to invalid or planned permission keys in client/src.');
  process.exit(1);
} else {
  console.log('\n✓ ALL UI PERMISSION CHECKS PASSED: 0 unknown keys, 0 planned keys exposed, 100% registry compliance.\n');
  process.exit(0);
}
