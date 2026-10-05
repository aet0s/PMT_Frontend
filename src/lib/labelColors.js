// client/src/lib/labelColors.js
// Maps label colors to pastel backgrounds and high-contrast dark text

export const LABEL_PALETTES = [
  { id: 'blue', name: 'Blue', bg: 'bg-label-blue', text: 'text-label-blue-text', border: 'border-label-blue-text/20' },
  { id: 'green', name: 'Green', bg: 'bg-label-green', text: 'text-label-green-text', border: 'border-label-green-text/20' },
  { id: 'purple', name: 'Purple', bg: 'bg-label-purple', text: 'text-label-purple-text', border: 'border-label-purple-text/20' },
  { id: 'amber', name: 'Amber', bg: 'bg-label-amber', text: 'text-label-amber-text', border: 'border-label-amber-text/20' },
  { id: 'rose', name: 'Rose', bg: 'bg-label-rose', text: 'text-label-rose-text', border: 'border-label-rose-text/20' },
  { id: 'teal', name: 'Teal', bg: 'bg-label-teal', text: 'text-label-teal-text', border: 'border-label-teal-text/20' },
  { id: 'slate', name: 'Slate', bg: 'bg-label-slate', text: 'text-label-slate-text', border: 'border-label-slate-text/20' }
];

export function getLabelClasses(colorKey) {
  if (!colorKey) return LABEL_PALETTES[0];
  const found = LABEL_PALETTES.find((p) => p.id === colorKey || p.name.toLowerCase() === String(colorKey).toLowerCase());
  if (found) return found;

  // Legacy fallback mapping
  const lower = String(colorKey).toLowerCase();
  if (lower.includes('blue') || lower.includes('3b82f6') || lower.includes('6366f1')) return LABEL_PALETTES[0];
  if (lower.includes('green') || lower.includes('10b981') || lower.includes('22c55e')) return LABEL_PALETTES[1];
  if (lower.includes('purple') || lower.includes('8b5cf6') || lower.includes('a855f7')) return LABEL_PALETTES[2];
  if (lower.includes('amber') || lower.includes('orange') || lower.includes('f59e0b')) return LABEL_PALETTES[3];
  if (lower.includes('red') || lower.includes('rose') || lower.includes('ef4444')) return LABEL_PALETTES[4];
  if (lower.includes('teal') || lower.includes('cyan') || lower.includes('06b6d4')) return LABEL_PALETTES[5];

  return LABEL_PALETTES[6]; // Slate fallback
}
