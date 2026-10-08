// client/scripts/lint-theme.js
// Guard script asserting single light theme rules across client source.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

const FORBIDDEN_PATTERNS = [
  { name: 'backdrop-blur', regex: /backdrop-blur(-\w+)?/g },
  { name: 'glass-panel', regex: /\bglass-panel\b/g },
  { name: 'glass-card', regex: /\bglass-card\b/g },
  { name: 'bg-black', regex: /\bbg-black\b/g }
];

// Hex colors allowed ONLY in the token file (src/index.css)
const HEX_REGEX = /#[0-9a-fA-F]{3,8}\b/g;

// text-white is allowed on coloured backgrounds (primary, danger, success, etc.)
const TEXT_WHITE_REGEX = /\btext-white\b/g;
const ALLOWED_TEXT_WHITE_CONTEXTS = [
  'bg-primary',
  'bg-danger',
  'bg-success',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-blue-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-amber-600',
  'bg-teal-600',
  'variant="primary"',
  'variant="danger"',
  'variant="success"',
  'variant === \'primary\'',
  'variant === \'danger\'',
  'variant === \'success\''
];

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else {
      if (/\.(jsx?|tsx?|css|html)$/.test(file)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

console.log('================================================================');
console.log('                   THEME & TOKEN LINT GUARD                     ');
console.log('================================================================');

const files = getFilesRecursively(SRC_DIR);
let violations = [];

for (const filePath of files) {
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
  const isTokenFile = relPath.replace(/\\/g, '/') === 'src/index.css';
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check forbidden keywords
    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.regex.test(line)) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: rule.name,
          snippet: line.trim()
        });
      }
    }

    // Check hex colors outside token file
    if (!isTokenFile) {
      const hexMatches = line.match(HEX_REGEX);
      if (hexMatches) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: `hex color (${hexMatches.join(', ')}) outside index.css`,
          snippet: line.trim()
        });
      }
    }

    // Check text-white outside allowed contexts
    if (TEXT_WHITE_REGEX.test(line)) {
      const isAllowed = ALLOWED_TEXT_WHITE_CONTEXTS.some((ctx) => line.includes(ctx));
      if (!isAllowed) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'text-white outside coloured button/badge context',
          snippet: line.trim()
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`\n[THEME LINT FAILED] Found ${violations.length} theme violation(s):\n`);
  violations.slice(0, 50).forEach((v) => {
    console.error(`  ${v.file}:${v.line} - [${v.rule}]`);
    console.error(`    ${v.snippet}\n`);
  });
  if (violations.length > 50) {
    console.error(`  ... and ${violations.length - 50} more.`);
  }
  process.exit(1);
} else {
  console.log('\n[THEME LINT PASSED] 0 violations. Client source strictly conforms to single light theme tokens.\n');
  process.exit(0);
}
