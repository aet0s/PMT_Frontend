// 10 soft light board backgrounds + 1 neutral default
export const DEFAULT_BOARD_BG = 'bg-board-neutral';

export const PALETTES = [
  { name: 'Neutral',   bg: 'bg-board-neutral',   dot: 'bg-board-dot-neutral' },
  { name: 'Mist Blue', bg: 'bg-board-mist-blue', dot: 'bg-board-dot-mist-blue' },
  { name: 'Lavender',  bg: 'bg-board-lavender',  dot: 'bg-board-dot-lavender' },
  { name: 'Sage',      bg: 'bg-board-sage',      dot: 'bg-board-dot-sage' },
  { name: 'Sand',      bg: 'bg-board-sand',      dot: 'bg-board-dot-sand' },
  { name: 'Blush',     bg: 'bg-board-blush',     dot: 'bg-board-dot-blush' },
  { name: 'Sky',       bg: 'bg-board-sky',       dot: 'bg-board-dot-sky' },
  { name: 'Mint',      bg: 'bg-board-mint',      dot: 'bg-board-dot-mint' },
  { name: 'Stone',     bg: 'bg-board-stone',     dot: 'bg-board-dot-stone' },
  { name: 'Peach',     bg: 'bg-board-peach',     dot: 'bg-board-dot-peach' },
  { name: 'Lilac',     bg: 'bg-board-lilac',     dot: 'bg-board-dot-lilac' },
];

export function getBoardBgClass(bgClass) {
  if (!bgClass) return DEFAULT_BOARD_BG;
  const match = PALETTES.find((p) => p.bg === bgClass);
  if (match) return match.bg;
  if (typeof bgClass === 'string' && (bgClass.startsWith('bg-board-') || bgClass.startsWith('bg-'))) {
    return bgClass;
  }
  return DEFAULT_BOARD_BG;
}

export function getBoardStyle(bgClass) {
  if (typeof bgClass === 'string' && (bgClass.startsWith('#') || bgClass.startsWith('rgb'))) {
    return { backgroundColor: bgClass };
  }
  return {};
}

export function getThemeDotClass(bgClass) {
  const match = PALETTES.find((p) => p.bg === bgClass);
  return match ? match.dot : 'bg-board-dot-neutral';
}
