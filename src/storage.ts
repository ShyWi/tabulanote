import type { Note } from './types'

const STORAGE_KEY = 'anotador.notes'

export function loadNotes(): Note[] {
  const raw = localStorage.getItem(STORAGE_KEY)
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

export function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}
