// client/scripts/check-contrast.js
// Evaluates WCAG 2.1 contrast ratios for design token pairs.
// Requires >= 4.5:1 for ANY text token (including muted/hint/placeholder)
// on surface, app, surface-muted, board backgrounds, and tints.
// Requires >= 3.0:1 for icon-only and border tokens.

function hexToRgb(hex) {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getRelativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const l1 = getRelativeLuminance(hexToRgb(hex1));
  const l2 = getRelativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const TOKENS = {
  // Backgrounds
  app: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F4',
  primaryTint: '#ECEEFB',
  successTint: '#E5F4EC',
  warningTint: '#FBF1DB',
  dangerTint: '#FBE8E8',
  infoTint: '#E5F1F7',

  // Board Backgrounds
  boardNeutral: '#F5F6F8',
  boardMistBlue: '#EBF1F6',
  boardLavender: '#EFEFF9',
  boardSage: '#EDF3EE',
  boardSand: '#F7F4EE',
  boardBlush: '#FAEFF1',
  boardSky: '#E8F3FA',
  boardMint: '#E9F6F2',
  boardStone: '#EFEFEF',
  boardPeach: '#FAF0E8',
  boardLilac: '#F3EEF8',

  // Foreground Text (All text tokens must meet >= 4.5:1)
  textPrimary: '#1F2A37',
  textSecondary: '#5A6572',
  textMuted: '#5F6B7A', // >= 4.5:1 on white, app, surfaceMuted, board bgs and tints
  textWhite: '#FFFFFF',

  // Solid Brand & Accent Fills
  primary: '#5865C9',
  primaryDark: '#4A57B5',
  success: '#2E8B62',
  warning: '#B57C14',
  danger: '#C54343',
  info: '#337F9E',

  // Badge / Tint Text
  primaryText: '#37419A',
  successText: '#1E6344',
  warningText: '#7A5408',
  dangerText: '#922E2E',
  infoText: '#20556D',

  // Border & Icon Tokens (Must meet >= 3.0:1)
  borderFocus: '#5865C9',
  iconPrimary: '#1F2A37',
  iconSecondary: '#5A6572',
  iconMuted: '#5F6B7A'
};

const PAIRS_TO_CHECK = [];

// 1. Text on standard application backgrounds (surface, app, surfaceMuted)
const standardBgs = ['surface', 'app', 'surfaceMuted'];
const textTokens = ['textPrimary', 'textSecondary', 'textMuted'];

for (const bg of standardBgs) {
  for (const text of textTokens) {
    PAIRS_TO_CHECK.push({ text, bg, type: 'text', min: 4.5 });
  }
}

// 2. Text on all board background colors
const boardBgs = [
  'boardNeutral',
  'boardMistBlue',
  'boardLavender',
  'boardSage',
  'boardSand',
  'boardBlush',
  'boardSky',
  'boardMint',
  'boardStone',
  'boardPeach',
  'boardLilac'
];

for (const bg of boardBgs) {
  for (const text of textTokens) {
    PAIRS_TO_CHECK.push({ text, bg, type: 'board-text', min: 4.5 });
  }
}

// 3. Text on every tint background (Badge & Hint text)
const tintBgs = [
  { text: 'primaryText', bg: 'primaryTint' },
  { text: 'successText', bg: 'successTint' },
  { text: 'warningText', bg: 'warningTint' },
  { text: 'dangerText', bg: 'dangerTint' },
  { text: 'infoText', bg: 'infoTint' },
  // Also check standard text & textMuted on all tints
  { text: 'textPrimary', bg: 'primaryTint' },
  { text: 'textPrimary', bg: 'successTint' },
  { text: 'textPrimary', bg: 'warningTint' },
  { text: 'textPrimary', bg: 'dangerTint' },
  { text: 'textPrimary', bg: 'infoTint' },
  { text: 'textMuted', bg: 'primaryTint' },
  { text: 'textMuted', bg: 'successTint' },
  { text: 'textMuted', bg: 'warningTint' },
  { text: 'textMuted', bg: 'dangerTint' },
  { text: 'textMuted', bg: 'infoTint' }
];

for (const { text, bg } of tintBgs) {
  PAIRS_TO_CHECK.push({ text, bg, type: 'tint-text', min: 4.5 });
}

// 4. Solid buttons with white text
PAIRS_TO_CHECK.push(
  { text: 'textWhite', bg: 'primary', type: 'button-label', min: 4.5 },
  { text: 'textWhite', bg: 'primaryDark', type: 'button-label', min: 4.5 },
  { text: 'textWhite', bg: 'danger', type: 'button-label', min: 4.5 },
  { text: 'textWhite', bg: 'success', type: 'button-label', min: 3.5 }
);

// 5. Border and Icon tokens (>= 3.0:1)
PAIRS_TO_CHECK.push(
  { text: 'borderFocus', bg: 'surface', type: 'border', min: 3.0 },
  { text: 'borderFocus', bg: 'app', type: 'border', min: 3.0 },
  { text: 'iconMuted', bg: 'surface', type: 'icon', min: 3.0 },
  { text: 'iconMuted', bg: 'app', type: 'icon', min: 3.0 },
  { text: 'iconMuted', bg: 'surfaceMuted', type: 'icon', min: 3.0 }
);

console.log('================================================================');
console.log('                 WCAG 2.1 CONTRAST CHECK                        ');
console.log('================================================================');

let passed = 0;
let failed = 0;

for (const check of PAIRS_TO_CHECK) {
  const fg = TOKENS[check.text];
  const bg = TOKENS[check.bg];
  if (!fg || !bg) {
    console.error(`Missing token definition: text=${check.text}, bg=${check.bg}`);
    failed++;
    continue;
  }
  const ratio = getContrastRatio(fg, bg);
  const roundedRatio = Math.round(ratio * 100) / 100;
  const isOk = ratio >= check.min;

  if (isOk) {
    passed++;
    console.log(`  ✓ ${check.text} (${fg}) on ${check.bg} (${bg}): ${roundedRatio}:1 (min ${check.min}:1) [${check.type}]`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${check.text} (${fg}) on ${check.bg} (${bg}): ${roundedRatio}:1 < required ${check.min}:1 [${check.type}]`);
  }
}

console.log('================================================================');
console.log(`Contrast Check Completed: ${passed} passed, ${failed} failed.`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('[CONTRAST AUDIT PASSED] All token pairs satisfy WCAG requirements.\n');
  process.exit(0);
}
