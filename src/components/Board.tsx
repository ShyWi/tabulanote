import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Folder as FolderData, Note } from '../types'
import { loadFolders, loadNotes, loadViewport, saveFolders, saveNotes, saveViewport } from '../storage'
import { clampPan, computeBounds, computeScrollMetrics, panFromScrollRatio } from '../bounds'
import { PostIt } from './PostIt'
import { Folder } from './Folder'
import { Scrollbar } from './Scrollbar'
import { Toolbar } from './Toolbar'

const COLORS = ['#fff59d', '#ffccbc', '#c8e6c9', '#bbdefb', '#e1bee7']
const NOTE_SIZE = 180
const FOLDER_SIZE = 100

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1

/** Restricts a zoom value to the [ZOOM_MIN, ZOOM_MAX] range. */
function clampZoomValue(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))
}

/** Builds a new note centered on the given canvas coordinates, with a random color. */
function createNoteAt(x: number, y: number): Note {
  return {
    id: crypto.randomUUID(),
    x: x - NOTE_SIZE / 2,
    y: y - NOTE_SIZE / 2,
    width: NOTE_SIZE,
    height: NOTE_SIZE,
    text: '',
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
}

/** Builds a new folder centered on the given canvas coordinates, prompting the user for its name. */
function createFolderAt(x: number, y: number): FolderData | null {
  const rawName = window.prompt('Nombre de la carpeta:', 'Carpeta')
  if (rawName === null) return null
  const name = rawName.trim() || 'Carpeta'
  return {
    id: crypto.randomUUID(),
    x: x - FOLDER_SIZE / 2,
    y: y - FOLDER_SIZE / 2,
    width: FOLDER_SIZE,
    height: FOLDER_SIZE,
    name,
  }
}

interface PanState {
  pointerId: number
  startX: number
  startY: number
  panX: number
  panY: number
}

interface GhostState {
  kind: 'note' | 'folder'
  clientX: number
  clientY: number
}

/** The main canvas: renders every note/folder, and owns panning, zooming and the canvas boundary. */
export function Board() {
  const { folderName } = useParams<{ folderName?: string }>()
  const scope = folderName ? decodeURIComponent(folderName) : ''
  const navigate = useNavigate()

  const [notes, setNotes] = useState<Note[]>(() => loadNotes(scope))
  const [folders, setFolders] = useState<FolderData[]>(() => loadFolders(scope))
  // Snapshot of items the canvas boundary is fitted to. It only updates when
  // an item is added/removed or when a drag/resize gesture ends, not on every
  // frame of the gesture, so the canvas only grows/shrinks once you let go.
  const [boundsItems, setBoundsItems] = useState<(Note | FolderData)[]>(() => [...notes, ...folders])
  const initialViewport = useMemo(() => loadViewport(scope), [scope])
  const [zoom, setZoom] = useState(initialViewport.zoom)
  const [pan, setPan] = useState(initialViewport.pan)
  const [isPanning, setIsPanning] = useState(false)
  const [ghost, setGhost] = useState<GhostState | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<PanState | null>(null)

  const bounds = useMemo(() => computeBounds(boundsItems), [boundsItems])

  // Persist notes/folders to localStorage whenever they change.
  useEffect(() => {
    saveNotes(scope, notes)
  }, [scope, notes])

  useEffect(() => {
    saveFolders(scope, folders)
  }, [scope, folders])

  // Adding/removing an item isn't a drag gesture, so reflect it immediately.
  useEffect(() => {
    setBoundsItems([...notes, ...folders])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length, folders.length])

  /** Re-fits the canvas boundary to the items' current positions/sizes. Called when a drag or resize ends. */
  function commitBounds() {
    setBoundsItems([...notes, ...folders])
  }

  // Persist the pan/zoom viewport to localStorage whenever it changes.
  useEffect(() => {
    saveViewport(scope, { pan, zoom })
  }, [scope, pan, zoom])

  /** Reads the board's current on-screen size, falling back to the window size before it's mounted. */
  function viewportSize() {
    const board = boardRef.current
    return board ? { width: board.clientWidth, height: board.clientHeight } : { width: window.innerWidth, height: window.innerHeight }
  }

  // The boundary can shrink (e.g. an item dragged back toward the center), so
  // re-clamp whenever it changes to make sure the current pan is still valid.
  useEffect(() => {
    const { width, height } = viewportSize()
    setPan((prev) => clampPan(prev, zoom, bounds, width, height))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds])

  /** Sets zoom (clamped to range) and re-clamps pan so the view stays valid at the new zoom level. */
  function setZoomClamped(nextZoom: number) {
    const z = clampZoomValue(nextZoom)
    setZoom(z)
    const { width, height } = viewportSize()
    setPan((prev) => clampPan(prev, z, bounds, width, height))
  }

  // Intercepts Ctrl/Cmd +, -, and 0 so they drive our own zoom instead of the browser's page zoom.
  useEffect(() => {
    function blockBrowserZoomKeys(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0') {
        e.preventDefault()
        if (e.key === '-') setZoomClamped(zoom - ZOOM_STEP)
        else if (e.key === '0') setZoomClamped(1)
        else setZoomClamped(zoom + ZOOM_STEP)
      }
    }

    window.addEventListener('keydown', blockBrowserZoomKeys, { passive: false })
    return () => window.removeEventListener('keydown', blockBrowserZoomKeys)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, bounds])

  useEffect(() => {
    const board = boardRef.current
    if (!board) return

    // React's onWheel is registered as a passive listener, so preventDefault()
    // there can't stop the browser's native pinch/ctrl+wheel zoom. A native,
    // non-passive listener is required to actually intercept it.
    function handleWheel(e: globalThis.WheelEvent) {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoomClamped(zoom - e.deltaY * 0.01)
    }

    board.addEventListener('wheel', handleWheel, { passive: false })
    return () => board.removeEventListener('wheel', handleWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, bounds])

  /**
   * Starts panning the canvas: middle mouse button anywhere, or the primary
   * button/touch when pressed directly on empty canvas (not a note, folder or
   * a control) — there's no middle mouse button on a phone, so this is how
   * panning works on touch.
   */
  function handleBoardPointerDown(e: PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    const isEmptyCanvas = target === e.currentTarget || target.hasAttribute('data-board-canvas')
    if (e.button !== 1 && !(e.button === 0 && isEmptyCanvas)) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    setIsPanning(true)
  }

  /** Updates pan 1:1 with pointer movement while a middle-button pan is in progress. */
  function handleBoardPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = panRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const { width, height } = viewportSize()
    setPan(
      clampPan(
        { x: drag.panX + (e.clientX - drag.startX), y: drag.panY + (e.clientY - drag.startY) },
        zoom,
        bounds,
        width,
        height,
      ),
    )
  }

  /** Ends the middle-button pan gesture. */
  function handleBoardPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!panRef.current || panRef.current.pointerId !== e.pointerId) return
    panRef.current = null
    setIsPanning(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  /** Converts a client-space point to canvas coordinates, or null if it's outside the board. */
  function canvasPointFromClient(clientX: number, clientY: number) {
    const board = boardRef.current
    if (!board) return null
    const rect = board.getBoundingClientRect()
    const isOverCanvas = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    if (!isOverCanvas) return null
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom }
  }

  /** Starts dragging a new note out of the toolbar's note icon. */
  function handleNoteToolPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setGhost({ kind: 'note', clientX: e.clientX, clientY: e.clientY })
  }

  /** Starts dragging a new folder out of the toolbar's folder icon. */
  function handleFolderToolPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setGhost({ kind: 'folder', clientX: e.clientX, clientY: e.clientY })
  }

  /** Follows the pointer with the ghost preview while dragging a new item out of the toolbar. */
  function handleToolPointerMove(e: PointerEvent<HTMLButtonElement>) {
    setGhost((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : prev))
  }

  /** Drops the new note onto the canvas if released over it, converting screen to canvas coordinates. */
  function handleNoteToolPointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!ghost) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setGhost(null)
    const point = canvasPointFromClient(e.clientX, e.clientY)
    if (!point) return
    setNotes((prev) => [...prev, createNoteAt(point.x, point.y)])
  }

  /** Drops the new folder onto the canvas if released over it, prompting for its name. */
  function handleFolderToolPointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!ghost) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setGhost(null)
    const point = canvasPointFromClient(e.clientX, e.clientY)
    if (!point) return
    const folder = createFolderAt(point.x, point.y)
    if (folder) setFolders((prev) => [...prev, folder])
  }

  /** Updates a note's position (called continuously while it's being dragged). */
  function moveNote(id: string, x: number, y: number) {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, x, y } : note)))
  }

  /** Updates a note's size (called continuously while it's being resized). */
  function resizeNote(id: string, width: number, height: number) {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, width, height } : note)))
  }

  /** Updates a note's text content. */
  function updateText(id: string, text: string) {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, text } : note)))
  }

  /** Deletes a note from the board. */
  function removeNote(id: string) {
    setNotes((prev) => prev.filter((note) => note.id !== id))
  }

  /** Updates a folder's position (called continuously while it's being dragged). */
  function moveFolder(id: string, x: number, y: number) {
    setFolders((prev) => prev.map((folder) => (folder.id === id ? { ...folder, x, y } : folder)))
  }

  /** Deletes a folder (and, implicitly, leaves its own canvas data orphaned in localStorage under its name). */
  function removeFolder(id: string) {
    setFolders((prev) => prev.filter((folder) => folder.id !== id))
  }

  /** Navigates into a folder's own independent canvas. */
  function openFolder(name: string) {
    navigate(`/${encodeURIComponent(name)}`)
  }

  /** Pans horizontally so the given 0-1 ratio along the canvas width becomes the view's center. */
  function scrollToX(ratio: number) {
    const { width, height } = viewportSize()
    const x = panFromScrollRatio('x', ratio, zoom, bounds, width, height)
    setPan((prev) => clampPan({ x, y: prev.y }, zoom, bounds, width, height))
  }

  /** Pans vertically so the given 0-1 ratio along the canvas height becomes the view's center. */
  function scrollToY(ratio: number) {
    const { width, height } = viewportSize()
    const y = panFromScrollRatio('y', ratio, zoom, bounds, width, height)
    setPan((prev) => clampPan({ x: prev.x, y }, zoom, bounds, width, height))
  }

  const { width: viewportWidth, height: viewportHeight } = viewportSize()
  const scrollMetrics = computeScrollMetrics(pan, zoom, bounds, viewportWidth, viewportHeight)

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        onNoteToolPointerDown={handleNoteToolPointerDown}
        onNoteToolPointerMove={handleToolPointerMove}
        onNoteToolPointerUp={handleNoteToolPointerUp}
        onFolderToolPointerDown={handleFolderToolPointerDown}
        onFolderToolPointerMove={handleToolPointerMove}
        onFolderToolPointerUp={handleFolderToolPointerUp}
        currentFolderName={scope || undefined}
        onBack={() => navigate('/')}
      />

      <div
        className={`board relative min-h-0 flex-1 touch-none overflow-hidden bg-neutral-100 bg-[radial-gradient(#d7dbe0_1px,transparent_1px)] [background-size:24px_24px] ${
          isPanning ? 'cursor-grabbing select-none' : ''
        }`}
        ref={boardRef}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
      >
        <div className="board__zoom absolute right-3 bottom-3 z-20 flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 shadow-md sm:right-4 sm:bottom-4">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-lg leading-none text-neutral-800 hover:bg-neutral-200"
            onClick={() => setZoomClamped(zoom - ZOOM_STEP)}
            aria-label="Alejar"
          >
            −
          </button>
          <span className="min-w-[3ch] text-center text-sm font-semibold text-neutral-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-lg leading-none text-neutral-800 hover:bg-neutral-200"
            onClick={() => setZoomClamped(zoom + ZOOM_STEP)}
            aria-label="Acercar"
          >
            +
          </button>
          <button
            type="button"
            className="h-8 rounded-full bg-neutral-100 px-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-200"
            onClick={() => setZoomClamped(1)}
          >
            Reset
          </button>
        </div>

        <div
          data-board-canvas
          className="board__canvas absolute inset-0"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {notes.map((note) => (
            <PostIt
              key={note.id}
              note={note}
              zoom={zoom}
              onMove={moveNote}
              onResize={resizeNote}
              onDragEnd={commitBounds}
              onTextChange={updateText}
              onRemove={removeNote}
            />
          ))}
          {folders.map((folder) => (
            <Folder
              key={folder.id}
              folder={folder}
              zoom={zoom}
              onMove={moveFolder}
              onDragEnd={commitBounds}
              onOpen={openFolder}
              onRemove={removeFolder}
            />
          ))}
        </div>

        <Scrollbar orientation="horizontal" start={scrollMetrics.startX} size={scrollMetrics.sizeX} onScrollTo={scrollToX} />
        <Scrollbar orientation="vertical" start={scrollMetrics.startY} size={scrollMetrics.sizeY} onScrollTo={scrollToY} />
      </div>

      {ghost && ghost.kind === 'note' && (
        <div
          className="create-ghost fixed z-30 -mt-7.5 -ml-7.5 h-15 w-15 rounded border border-[#c9b94a] bg-[#fff59d] opacity-85 shadow-[3px_4px_10px_rgba(0,0,0,0.25)] pointer-events-none"
          style={{ left: ghost.clientX, top: ghost.clientY }}
          aria-hidden="true"
        />
      )}
      {ghost && ghost.kind === 'folder' && (
        <div
          className="create-ghost fixed z-30 -mt-7.5 -ml-7.5 h-15 w-15 rounded-lg border border-blue-400 bg-blue-100 opacity-85 shadow-[3px_4px_10px_rgba(0,0,0,0.25)] pointer-events-none"
          style={{ left: ghost.clientX, top: ghost.clientY }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
