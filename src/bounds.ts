import type { Note } from './types'

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const DEFAULT_BOUNDS: Bounds = { minX: 0, minY: 0, maxX: 2000, maxY: 1400 }

// How much room every note should keep around it before the canvas boundary.
const EDGE_MARGIN = 300
// How far past the canvas boundary the viewport is allowed to pan.
const PAN_OVERSHOOT = 200

/**
 * Fits the bounds around all notes (plus EDGE_MARGIN), recomputed from scratch
 * every time, but never smaller than DEFAULT_BOUNDS. This lets the canvas both
 * grow and shrink: a note dragged toward an edge pushes it out, and dragging
 * it back toward the center lets the boundary shrink again — down to the
 * default floor, never below it (a tiny canvas would fight with dragging: if
 * it's smaller than the viewport, panning ends up recentering it every time a
 * note moves, which cancels out the drag itself).
 */
export function computeBoundsForNotes(notes: Note[]): Bounds {
  let minX = DEFAULT_BOUNDS.minX
  let minY = DEFAULT_BOUNDS.minY
  let maxX = DEFAULT_BOUNDS.maxX
  let maxY = DEFAULT_BOUNDS.maxY

  for (const note of notes) {
    minX = Math.min(minX, note.x - EDGE_MARGIN)
    minY = Math.min(minY, note.y - EDGE_MARGIN)
    maxX = Math.max(maxX, note.x + note.width + EDGE_MARGIN)
    maxY = Math.max(maxY, note.y + note.height + EDGE_MARGIN)
  }

  return { minX, minY, maxX, maxY }
}

/** Clamps pan so the canvas can't be dragged more than PAN_OVERSHOOT past its own edges. */
export function clampPan(
  pan: { x: number; y: number },
  zoom: number,
  bounds: Bounds,
  viewportWidth: number,
  viewportHeight: number,
) {
  const minPanX = viewportWidth - PAN_OVERSHOOT - bounds.maxX * zoom
  const maxPanX = PAN_OVERSHOOT - bounds.minX * zoom
  const minPanY = viewportHeight - PAN_OVERSHOOT - bounds.maxY * zoom
  const maxPanY = PAN_OVERSHOOT - bounds.minY * zoom

  return {
    x: minPanX <= maxPanX ? Math.min(maxPanX, Math.max(minPanX, pan.x)) : (minPanX + maxPanX) / 2,
    y: minPanY <= maxPanY ? Math.min(maxPanY, Math.max(minPanY, pan.y)) : (minPanY + maxPanY) / 2,
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export interface ScrollMetrics {
  startX: number
  sizeX: number
  startY: number
  sizeY: number
}

/** Where the visible viewport sits within the full bounds, as 0-1 ratios (for scrollbar thumbs). */
export function computeScrollMetrics(
  pan: { x: number; y: number },
  zoom: number,
  bounds: Bounds,
  viewportWidth: number,
  viewportHeight: number,
): ScrollMetrics {
  const boundsWidth = bounds.maxX - bounds.minX
  const boundsHeight = bounds.maxY - bounds.minY
  const visibleLeft = -pan.x / zoom
  const visibleTop = -pan.y / zoom

  const sizeX = clamp01(viewportWidth / zoom / boundsWidth)
  const sizeY = clamp01(viewportHeight / zoom / boundsHeight)
  const startX = Math.min(1 - sizeX, clamp01((visibleLeft - bounds.minX) / boundsWidth))
  const startY = Math.min(1 - sizeY, clamp01((visibleTop - bounds.minY) / boundsHeight))

  return { startX, sizeX, startY, sizeY }
}

/** Converts a 0-1 scrollbar ratio (thumb center along the track) into the pan value that centers the view there. */
export function panFromScrollRatio(
  axis: 'x' | 'y',
  ratio: number,
  zoom: number,
  bounds: Bounds,
  viewportWidth: number,
  viewportHeight: number,
): number {
  if (axis === 'x') {
    const boundsWidth = bounds.maxX - bounds.minX
    const centerX = bounds.minX + ratio * boundsWidth
    const visibleLeft = centerX - viewportWidth / zoom / 2
    return -visibleLeft * zoom
  }
  const boundsHeight = bounds.maxY - bounds.minY
  const centerY = bounds.minY + ratio * boundsHeight
  const visibleTop = centerY - viewportHeight / zoom / 2
  return -visibleTop * zoom
}
