// client/src/components/Notes/noteConstants.js

export const CANVAS_WIDTH = 4000;
export const CANVAS_HEIGHT = 3000;

export const DEFAULT_NOTE_WIDTH = 220;
export const DEFAULT_NOTE_HEIGHT = 200;
export const MIN_NOTE_WIDTH = 160;
export const MIN_NOTE_HEIGHT = 120;
export const MAX_NOTE_WIDTH = 480;
export const MAX_NOTE_HEIGHT = 480;

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 1.5;
export const ZOOM_STEP = 0.1;

export const GRID_SNAP_PX = 8;
export const MAX_ACTIVE_NOTES = 500;
export const MAX_NOTE_CONTENT_LENGTH = 5000;

export const NOTE_COLORS = {
  yellow: {
    key: 'yellow',
    label: 'Yellow',
    bgVar: 'var(--color-warning-tint)',
    dotVar: 'var(--color-warning)',
    borderVar: 'var(--color-border)'
  },
  peach: {
    key: 'peach',
    label: 'Peach',
    bgVar: 'var(--color-board-peach)',
    dotVar: 'var(--color-board-dot-peach)',
    borderVar: 'var(--color-border)'
  },
  blush: {
    key: 'blush',
    label: 'Blush',
    bgVar: 'var(--color-board-blush)',
    dotVar: 'var(--color-board-dot-blush)',
    borderVar: 'var(--color-border)'
  },
  lilac: {
    key: 'lilac',
    label: 'Lilac',
    bgVar: 'var(--color-board-lilac)',
    dotVar: 'var(--color-board-dot-lilac)',
    borderVar: 'var(--color-border)'
  },
  sky: {
    key: 'sky',
    label: 'Sky',
    bgVar: 'var(--color-board-sky)',
    dotVar: 'var(--color-board-dot-sky)',
    borderVar: 'var(--color-border)'
  },
  mint: {
    key: 'mint',
    label: 'Mint',
    bgVar: 'var(--color-board-mint)',
    dotVar: 'var(--color-board-dot-mint)',
    borderVar: 'var(--color-border)'
  },
  sage: {
    key: 'sage',
    label: 'Sage',
    bgVar: 'var(--color-board-sage)',
    dotVar: 'var(--color-board-dot-sage)',
    borderVar: 'var(--color-border)'
  }
};

export const NOTE_COLOR_LIST = Object.values(NOTE_COLORS);

export function getNoteColorMeta(colorKey) {
  return NOTE_COLORS[colorKey] || NOTE_COLORS.sky;
}

export function clampNoteSize(width, height) {
  const w = Math.round(Math.min(MAX_NOTE_WIDTH, Math.max(MIN_NOTE_WIDTH, Number(width) || DEFAULT_NOTE_WIDTH)));
  const h = Math.round(Math.min(MAX_NOTE_HEIGHT, Math.max(MIN_NOTE_HEIGHT, Number(height) || DEFAULT_NOTE_HEIGHT)));
  return { width: w, height: h };
}

export function clampNotePosition(x, y, width = DEFAULT_NOTE_WIDTH, height = DEFAULT_NOTE_HEIGHT) {
  const { width: w, height: h } = clampNoteSize(width, height);
  const maxX = Math.max(0, CANVAS_WIDTH - w);
  const maxY = Math.max(0, CANVAS_HEIGHT - h);
  return {
    x: Math.round(Math.min(maxX, Math.max(0, Number(x) || 0))),
    y: Math.round(Math.min(maxY, Math.max(0, Number(y) || 0)))
  };
}

export function snapToGrid(value, gridSize = GRID_SNAP_PX, enabled = true) {
  if (!enabled || !gridSize) return Math.round(value);
  return Math.round(value / gridSize) * gridSize;
}

export function clampZoom(zoom) {
  const numeric = Number(zoom);
  if (!Number.isFinite(numeric)) return 1;
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, numeric)) * 100) / 100;
}

export function screenToCanvasPoint(screenDeltaX, screenDeltaY, zoom = 1) {
  const safeZoom = clampZoom(zoom);
  return {
    x: screenDeltaX / safeZoom,
    y: screenDeltaY / safeZoom
  };
}

export function getDeterministicTilt(seed = 0, enabled = true) {
  if (!enabled) return 0;
  const n = Math.abs(Number(seed) || 0);
  const deg = ((n % 21) - 10) / 10; // -1.0 to +1.0 deg
  return deg;
}

export function getNextZIndex(notes = []) {
  if (!Array.isArray(notes) || notes.length === 0) return 1;
  let maxZ = 0;
  for (const n of notes) {
    const z = Number(n?.z_index) || 0;
    if (z > maxZ) maxZ = z;
  }
  return maxZ + 1;
}
