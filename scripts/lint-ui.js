// client/scripts/lint-ui.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

let violations = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    // Check for native <select> usage (must be lowercase HTML tag, not uppercase React Component <Select>)
    if (/<select[\s>]/g.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      violations.push({
        file: path.relative(path.resolve(__dirname, '..'), filePath),
        line: lineNum,
        reason: 'Native <select> element is forbidden. Use the custom Select component from components/ui/Select instead.',
        code: line.trim()
      });
    }

    // Check for CustomDropdown import
    if (/from\s+['"][^'"]*CustomDropdown['"]/i.test(line) || /import\s+CustomDropdown/i.test(line)) {
      violations.push({
        file: path.relative(path.resolve(__dirname, '..'), filePath),
        line: lineNum,
        reason: 'CustomDropdown is deprecated and removed. Use Select, Combobox, or Menu from components/ui instead.',
        code: line.trim()
      });
    }
  });
}

function traverse(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      traverse(fullPath);
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      checkFile(fullPath);
    }
  }
}

console.log('================================================================');
console.log('                   UI & ACCESSIBILITY LINT                      ');
console.log('================================================================');

traverse(srcDir);

if (violations.length > 0) {
  console.error(`\n[UI LINT FAILED] Found ${violations.length} violation(s):\n`);
  violations.forEach((v) => {
    console.error(`  - ${v.file}:${v.line}`);
    console.error(`    Violation: ${v.reason}`);
    console.error(`    Line: ${v.code}\n`);
  });
  process.exit(1);
} else {
  console.log('\n[UI LINT PASSED] 0 violations. No native <select> elements or CustomDropdown imports found.\n');
  process.exit(0);
}
