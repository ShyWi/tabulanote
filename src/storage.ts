import type { Note } from './types'

const NOTES_KEY = 'anotador.notes'
const VIEWPORT_KEY = 'anotador.viewport'

/** Loads saved notes from localStorage. Fills in width/height defaults for notes saved before resizing existed. */
export function loadNotes(): Note[] {
  const raw = localStorage.getItem(NOTES_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((note) => ({
      width: 180,
      height: 180,
      ...note,
    }))
  } catch {
    return []
  }
}

/** Persists all notes to localStorage. */
export function saveNotes(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

export interface Viewport {
  pan: { x: number; y: number }
  zoom: number
}

const DEFAULT_VIEWPORT: Viewport = { pan: { x: 0, y: 0 }, zoom: 1 }

/** Loads the saved pan/zoom viewport from localStorage, falling back to the default if missing or invalid. */
export function loadViewport(): Viewport {
  const raw = localStorage.getItem(VIEWPORT_KEY)
  if (!raw) return DEFAULT_VIEWPORT

  try {
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.zoom !== 'number' ||
      typeof parsed?.pan?.x !== 'number' ||
      typeof parsed?.pan?.y !== 'number'
    ) {
      return DEFAULT_VIEWPORT
    }
    return parsed
  } catch {
    return DEFAULT_VIEWPORT
  }
}

/** Persists the pan/zoom viewport to localStorage. */
export function saveViewport(viewport: Viewport) {
  localStorage.setItem(VIEWPORT_KEY, JSON.stringify(viewport))
}
