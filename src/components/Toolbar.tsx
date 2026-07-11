import type { PointerEvent } from 'react'

interface Props {
  onNoteToolPointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onNoteToolPointerMove: (e: PointerEvent<HTMLButtonElement>) => void
  onNoteToolPointerUp: (e: PointerEvent<HTMLButtonElement>) => void
  onFolderToolPointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onFolderToolPointerMove: (e: PointerEvent<HTMLButtonElement>) => void
  onFolderToolPointerUp: (e: PointerEvent<HTMLButtonElement>) => void
  /** True while already inside a folder — nested folders aren't allowed, so the folder tool is disabled. */
  foldersDisabled: boolean
  /** Name of the folder currently open, if any. When set, a "back to home" button is shown. */
  currentFolderName?: string
  onBack: () => void
}

/** Top toolbar: drag-out tools (folder, note), plus a "back to home" button while inside a folder. */
export function Toolbar({
  onNoteToolPointerDown,
  onNoteToolPointerMove,
  onNoteToolPointerUp,
  onFolderToolPointerDown,
  onFolderToolPointerMove,
  onFolderToolPointerUp,
  foldersDisabled,
  currentFolderName,
  onBack,
}: Props) {
  return (
    <div className="toolbar z-20 flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2 sm:px-4">
      {currentFolderName && (
        <button
          type="button"
          className="back-button flex h-11 items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          onClick={onBack}
        >
          <span aria-hidden="true">←</span>
          <span className="max-w-[8rem] truncate">{currentFolderName}</span>
        </button>
      )}

      <button
        type="button"
        disabled={foldersDisabled}
        className={`toolbar__folder-icon flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 ${
          foldersDisabled
            ? 'cursor-not-allowed touch-auto bg-neutral-100 opacity-40'
            : 'touch-none cursor-grab bg-neutral-50 hover:bg-neutral-100 active:cursor-grabbing'
        }`}
        onPointerDown={foldersDisabled ? undefined : onFolderToolPointerDown}
        onPointerMove={foldersDisabled ? undefined : onFolderToolPointerMove}
        onPointerUp={foldersDisabled ? undefined : onFolderToolPointerUp}
        aria-label="Crear carpeta (arrastra hacia el canvas)"
        title={
          foldersDisabled
            ? 'No se pueden crear carpetas dentro de otra carpeta'
            : 'Arrastra hacia el canvas para crear una carpeta'
        }
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z"
            fill="#93c5fd"
            stroke="#3b82f6"
            strokeWidth="1"
          />
        </svg>
      </button>

      <button
        type="button"
        className="toolbar__icon flex h-11 w-11 touch-none cursor-grab items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 active:cursor-grabbing"
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
