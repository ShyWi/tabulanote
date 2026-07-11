import type { Folder, Note } from './types'

/** Builds the localStorage key for a piece of data, scoped to a folder (root canvas uses scope=''). */
function scopedKey(base: string, scope: string) {
  return scope ? `tabulanote.${base}.${scope}` : `tabulanote.${base}`
}

/** Loads saved notes from localStorage. Fills in width/height defaults for notes saved before resizing existed. */
export function loadNotes(scope: string): Note[] {
  const raw = localStorage.getItem(scopedKey('notes', scope))
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

/** Persists all notes for the given scope to localStorage. */
export function saveNotes(scope: string, notes: Note[]) {
  localStorage.setItem(scopedKey('notes', scope), JSON.stringify(notes))
}

/** Loads saved folders from localStorage for the given scope. */
export function loadFolders(scope: string): Folder[] {
  const raw = localStorage.getItem(scopedKey('folders', scope))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Persists all folders for the given scope to localStorage. */
export function saveFolders(scope: string, folders: Folder[]) {
  localStorage.setItem(scopedKey('folders', scope), JSON.stringify(folders))
}

export interface Viewport {
  pan: { x: number; y: number }
  zoom: number
}

const DEFAULT_VIEWPORT: Viewport = { pan: { x: 0, y: 0 }, zoom: 1 }

/** Loads the saved pan/zoom viewport from localStorage for the given scope, falling back to the default if missing or invalid. */
export function loadViewport(scope: string): Viewport {
  const raw = localStorage.getItem(scopedKey('viewport', scope))
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

/** Persists the pan/zoom viewport for the given scope to localStorage. */
export function saveViewport(scope: string, viewport: Viewport) {
  localStorage.setItem(scopedKey('viewport', scope), JSON.stringify(viewport))
}
