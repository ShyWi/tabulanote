import type { PointerEvent } from 'react'

interface Props {
  onNoteToolPointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onNoteToolPointerMove: (e: PointerEvent<HTMLButtonElement>) => void
  onNoteToolPointerUp: (e: PointerEvent<HTMLButtonElement>) => void
}

/** Top toolbar. Currently holds the "drag a post-it onto the canvas" tool; built to grow with more tools later. */
export function Toolbar({ onNoteToolPointerDown, onNoteToolPointerMove, onNoteToolPointerUp }: Props) {
  return (
    <div className="toolbar">
      <button
        type="button"
        className="toolbar__icon"
        onPointerDown={onNoteToolPointerDown}
        onPointerMove={onNoteToolPointerMove}
        onPointerUp={onNoteToolPointerUp}
        aria-label="Crear nota (arrastra hacia el canvas)"
        title="Arrastra hacia el canvas para crear una nota"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 3h16v13l-5 5H4V3Z" fill="#fff59d" stroke="#c9b94a" strokeWidth="1" />
          <path d="M15 21v-5h5" fill="none" stroke="#c9b94a" strokeWidth="1" />
        </svg>
      </button>
    </div>
  )
}
