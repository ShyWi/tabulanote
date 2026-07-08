import { useEffect, useState, type WheelEvent } from 'react'
import type { Note } from '../types'
import { loadNotes, saveNotes } from '../storage'
import { PostIt } from './PostIt'

const COLORS = ['#fff59d', '#ffccbc', '#c8e6c9', '#bbdefb', '#e1bee7']

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))
}

function createNote(): Note {
  return {
    id: crypto.randomUUID(),
    x: 80 + Math.random() * 160,
    y: 80 + Math.random() * 120,
    width: 180,
    height: 180,
    text: '',
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
}

export function Board() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  useEffect(() => {
    function blockBrowserZoomKeys(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0') {
        e.preventDefault()
        if (e.key === '-') setZoom((z) => clampZoom(z - ZOOM_STEP))
        else if (e.key === '0') setZoom(1)
        else setZoom((z) => clampZoom(z + ZOOM_STEP))
      }
    }

    window.addEventListener('keydown', blockBrowserZoomKeys, { passive: false })
    return () => window.removeEventListener('keydown', blockBrowserZoomKeys)
  }, [])

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey) return
    e.preventDefault()
    setZoom((z) => clampZoom(z - e.deltaY * 0.01))
  }

  function addNote() {
    setNotes((prev) => [...prev, createNote()])
  }

  function moveNote(id: string, x: number, y: number) {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, x, y } : note)))
  }

  function resizeNote(id: string, width: number, height: number) {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, width, height } : note)))
  }

  function updateText(id: string, text: string) {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, text } : note)))
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((note) => note.id !== id))
  }

  return (
    <div className="board" onWheel={handleWheel}>
      <button type="button" className="board__add" onClick={addNote}>
        + Nueva nota
      </button>

      <div className="board__zoom">
        <button type="button" onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))} aria-label="Alejar">
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))} aria-label="Acercar">
          +
        </button>
        <button type="button" className="board__zoom-reset" onClick={() => setZoom(1)}>
          Reset
        </button>
      </div>

      <div className="board__canvas" style={{ transform: `scale(${zoom})` }}>
        {notes.map((note) => (
          <PostIt
            key={note.id}
            note={note}
            zoom={zoom}
            onMove={moveNote}
            onResize={resizeNote}
            onTextChange={updateText}
            onRemove={removeNote}
          />
        ))}
      </div>
    </div>
  )
}
