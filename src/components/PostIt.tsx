import { useRef, type PointerEvent } from 'react'
import type { Note } from '../types'

interface Props {
  note: Note
  zoom: number
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, width: number, height: number) => void
  onDragEnd: () => void
  onTextChange: (id: string, text: string) => void
  onRemove: (id: string) => void
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  noteX: number
  noteY: number
  moved: boolean
}

interface ResizeState {
  pointerId: number
  startX: number
  startY: number
  width: number
  height: number
}

const MIN_SIZE = 120
// Pointer must move this many screen pixels before a press-and-hold on the
// note counts as a drag rather than a click that focuses the textarea.
const DRAG_THRESHOLD = 4

/** A single draggable, resizable, editable sticky note. Draggable from anywhere on it, including over the text. */
export function PostIt({ note, zoom, onMove, onResize, onDragEnd, onTextChange, onRemove }: Props) {
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)

  /** Starts tracking a potential move drag from anywhere on the note (left mouse button only). */
  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      noteX: note.x,
      noteY: note.y,
      moved: false,
    }
  }

  /**
   * Moves the note once the pointer has traveled past the drag threshold.
   * Capturing only starts at that point, so a plain click/tap still reaches
   * the textarea underneath to place the cursor and type.
   */
  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return

    if (!drag.moved) {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      drag.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
      ;(document.activeElement as HTMLElement | null)?.blur()
      window.getSelection()?.removeAllRanges()
    }

    onMove(
      note.id,
      drag.noteX + (e.clientX - drag.startX) / zoom,
      drag.noteY + (e.clientY - drag.startY) / zoom,
    )
  }

  /** Ends the move drag (if it turned into one) and notifies the board so it can re-fit the canvas boundary. */
  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    if (drag.moved) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      onDragEnd()
    }
  }

  /** Starts a resize drag from the bottom-right handle (left mouse button only). */
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

  /** Resizes the note by the pointer's screen-space delta, clamped to a minimum size. */
  function handleResizePointerMove(e: PointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== e.pointerId) return
    const width = Math.max(MIN_SIZE, resize.width + (e.clientX - resize.startX) / zoom)
    const height = Math.max(MIN_SIZE, resize.height + (e.clientY - resize.startY) / zoom)
    onResize(note.id, width, height)
  }

  /** Ends the resize drag and notifies the board so it can re-fit the canvas boundary. */
  function handleResizePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!resizeRef.current) return
    resizeRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    onDragEnd()
  }

  return (
    <div
      className="postit absolute flex touch-none flex-col rounded shadow-[3px_4px_10px_rgba(0,0,0,0.25)]"
      style={{ left: note.x, top: note.y, width: note.width, height: note.height, background: note.color }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="postit__handle flex h-7 shrink-0 cursor-grab justify-end active:cursor-grabbing">
        <button
          type="button"
          className="postit__close cursor-pointer border-0 bg-transparent px-2.5 py-1 text-base leading-none text-black/50 hover:text-black/80"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(note.id)}
          aria-label="Eliminar nota"
        >
          ×
        </button>
      </div>
      <textarea
        className="postit__text flex-1 cursor-text resize-none border-0 bg-transparent px-3 pb-3 font-[inherit] text-[0.95rem] text-neutral-800 focus:outline-none"
        value={note.text}
        onChange={(e) => onTextChange(note.id, e.target.value)}
        placeholder="Escribe algo..."
      />
      <div
        className="postit__resize absolute right-0 bottom-0 flex h-6 w-6 touch-none items-end justify-end p-1 cursor-nwse-resize"
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
