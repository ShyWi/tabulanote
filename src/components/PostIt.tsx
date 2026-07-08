import { useRef, type PointerEvent } from 'react'
import type { Note } from '../types'

interface Props {
  note: Note
  zoom: number
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, width: number, height: number) => void
  onTextChange: (id: string, text: string) => void
  onRemove: (id: string) => void
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  noteX: number
  noteY: number
}

interface ResizeState {
  pointerId: number
  startX: number
  startY: number
  width: number
  height: number
}

const MIN_SIZE = 120

export function PostIt({ note, zoom, onMove, onResize, onTextChange, onRemove }: Props) {
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      noteX: note.x,
      noteY: note.y,
    }
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    onMove(
      note.id,
      drag.noteX + (e.clientX - drag.startX) / zoom,
      drag.noteY + (e.clientY - drag.startY) / zoom,
    )
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function handleResizePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: note.width,
      height: note.height,
    }
  }

  function handleResizePointerMove(e: PointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== e.pointerId) return
    const width = Math.max(MIN_SIZE, resize.width + (e.clientX - resize.startX) / zoom)
    const height = Math.max(MIN_SIZE, resize.height + (e.clientY - resize.startY) / zoom)
    onResize(note.id, width, height)
  }

  function handleResizePointerUp(e: PointerEvent<HTMLDivElement>) {
    resizeRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      className="postit"
      style={{ left: note.x, top: note.y, width: note.width, height: note.height, background: note.color }}
    >
      <div
        className="postit__handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <button
          type="button"
          className="postit__close"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(note.id)}
          aria-label="Eliminar nota"
        >
          ×
        </button>
      </div>
      <textarea
        className="postit__text"
        value={note.text}
        onChange={(e) => onTextChange(note.id, e.target.value)}
        placeholder="Escribe algo..."
      />
      <div
        className="postit__resize"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16" width="12" height="12">
          <line x1="14" y1="3" x2="3" y2="14" stroke="rgba(0,0,0,0.4)" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="14" y1="9" x2="9" y2="14" stroke="rgba(0,0,0,0.4)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
