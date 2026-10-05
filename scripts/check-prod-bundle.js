#!/usr/bin/env node
// client/scripts/check-prod-bundle.js
// Verifies that the production bundle does NOT contain any reference to
// "dev/components" (the DevComponentsPage route).
// This confirms that import.meta.env.DEV dead-code elimination works correctly.

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const clientRoot = resolve(__dirname, '..');
const distDir = join(clientRoot, 'dist');

console.log('================================================================');
console.log('           PRODUCTION BUNDLE DEV-ROUTE CHECK                    ');
console.log('================================================================');

// Step 1: Build the production bundle
console.log('\n[1] Building production bundle...');
try {
  execSync('npm run build', {
    cwd: clientRoot,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (err) {
  console.error('[ERROR] Production build failed.');
  process.exit(1);
}

if (!existsSync(distDir)) {
  console.error('[ERROR] dist/ directory not found after build.');
  process.exit(1);
}

// Step 2: Walk all JS files in dist/
function getAllJsFiles(dir) {
  const results = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllJsFiles(fullPath));
    } else if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('\n[2] Scanning production bundle for dev-only routes...');
const jsFiles = getAllJsFiles(distDir);
console.log(`    Found ${jsFiles.length} JS files in dist/`);

const FORBIDDEN_PATTERNS = [
  'dev/components',
  'DevComponentsPage',
  'DevComponents'
];

let failures = 0;
for (const filePath of jsFiles) {
  const content = readFileSync(filePath, 'utf-8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (content.includes(pattern)) {
      console.error(`[FAIL] "${pattern}" found in production bundle: ${filePath}`);
      failures++;
    }
  }
}

console.log('================================================================');
if (failures > 0) {
  console.error(`[CHECK FAILED] ${failures} forbidden dev-only pattern(s) found in production bundle!`);
  console.error('Make sure import.meta.env.DEV guard is working correctly.');
  process.exit(1);
} else {
  console.log('[CHECK PASSED] Production bundle contains NO dev-only routes.');
  console.log('Dead-code elimination for import.meta.env.DEV is working correctly.');
  process.exit(0);
}
