import { useRef, type PointerEvent } from 'react'
import type { Folder as FolderData } from '../types'

interface Props {
  folder: FolderData
  zoom: number
  /** True while a note is being dragged over this folder — highlights it as a drop target. */
  isDropTarget: boolean
  onMove: (id: string, x: number, y: number) => void
  onDragEnd: () => void
  onOpen: (name: string) => void
  onRemove: (id: string) => void
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  folderX: number
  folderY: number
  moved: boolean
}

// Pointer must move this many screen pixels before a press-and-hold counts as
// a drag rather than a click that opens the folder.
const DRAG_THRESHOLD = 4

/** A draggable folder icon on the canvas. Click (without dragging) opens its own independent canvas. */
export function Folder({ folder, zoom, isDropTarget, onMove, onDragEnd, onOpen, onRemove }: Props) {
  const dragRef = useRef<DragState | null>(null)

  /** Starts tracking a potential move drag from anywhere on the folder (left mouse button only). */
  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      folderX: folder.x,
      folderY: folder.y,
      moved: false,
    }
  }

  /** Moves the folder once the pointer has traveled past the drag threshold; otherwise it stays a click-to-open. */
  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return

    if (!drag.moved) {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      drag.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    onMove(
      folder.id,
      drag.folderX + (e.clientX - drag.startX) / zoom,
      drag.folderY + (e.clientY - drag.startY) / zoom,
    )
  }

  /** Ends the drag if there was one; otherwise treats it as a click that opens the folder. */
  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    if (drag.moved) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      onDragEnd()
    } else {
      onOpen(folder.name)
    }
  }

  return (
    <div
      className={`folder absolute flex touch-none cursor-pointer flex-col items-center rounded-lg border p-2 shadow-[3px_4px_10px_rgba(0,0,0,0.2)] select-none ${
        isDropTarget ? 'border-blue-500 bg-blue-200 ring-4 ring-blue-300' : 'border-blue-200 bg-blue-50'
      }`}
      style={{ left: folder.x, top: folder.y, width: folder.width, height: folder.height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <button
        type="button"
        className="folder__close absolute top-0 right-0 cursor-pointer border-0 bg-transparent px-2.5 py-1 text-base leading-none text-black/40 hover:text-black/70"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          if (window.confirm(`¿Eliminar la carpeta "${folder.name}"? Su contenido dejará de ser accesible.`)) {
            onRemove(folder.id)
          }
        }}
        aria-label="Eliminar carpeta"
      >
        ×
      </button>
      <svg viewBox="0 0 24 24" width="40%" height="40%" className="mt-2 flex-none" aria-hidden="true">
        <path
          d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z"
          fill="#93c5fd"
          stroke="#3b82f6"
          strokeWidth="1"
        />
      </svg>
      <span className="folder__name mt-1 max-w-full truncate px-1 text-sm font-medium text-neutral-700">
        {folder.name}
      </span>
    </div>
  )
}
