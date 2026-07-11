import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Note } from '../types'
import { loadNotes, loadViewport, saveNotes, saveViewport } from '../storage'
import { clampPan, computeBoundsForNotes, computeScrollMetrics, panFromScrollRatio } from '../bounds'
import { PostIt } from './PostIt'
import { Scrollbar } from './Scrollbar'
import { Toolbar } from './Toolbar'

const COLORS = ['#fff59d', '#ffccbc', '#c8e6c9', '#bbdefb', '#e1bee7']
const NOTE_SIZE = 180

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

interface PanState {
  pointerId: number
  startX: number
  startY: number
  panX: number
  panY: number
}

interface GhostState {
  clientX: number
  clientY: number
}

/** The main canvas: renders every note, and owns panning, zooming and the canvas boundary. */
export function Board() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  // Snapshot of notes the canvas boundary is fitted to. It only updates when a
  // note is added/removed or when a drag/resize gesture ends, not on every
  // frame of the gesture, so the canvas only grows/shrinks once you let go.
  const [boundsNotes, setBoundsNotes] = useState<Note[]>(notes)
  const initialViewport = useMemo(loadViewport, [])
  const [zoom, setZoom] = useState(initialViewport.zoom)
  const [pan, setPan] = useState(initialViewport.pan)
  const [isPanning, setIsPanning] = useState(false)
  const [ghost, setGhost] = useState<GhostState | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<PanState | null>(null)

  const bounds = useMemo(() => computeBoundsForNotes(boundsNotes), [boundsNotes])

  // Persist notes to localStorage whenever they change.
  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  // Adding/removing a note isn't a drag gesture, so reflect it immediately.
  useEffect(() => {
    setBoundsNotes(notes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length])

  /** Re-fits the canvas boundary to the notes' current positions/sizes. Called when a drag or resize ends. */
  function commitBounds() {
    setBoundsNotes(notes)
  }

  // Persist the pan/zoom viewport to localStorage whenever it changes.
  useEffect(() => {
    saveViewport({ pan, zoom })
  }, [pan, zoom])

  /** Reads the board's current on-screen size, falling back to the window size before it's mounted. */
  function viewportSize() {
    const board = boardRef.current
    return board ? { width: board.clientWidth, height: board.clientHeight } : { width: window.innerWidth, height: window.innerHeight }
  }

  // The boundary can shrink (e.g. a note dragged back toward the center), so
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

  /** Starts panning the canvas when the middle mouse button is pressed on empty space. */
  function handleBoardPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 1) return
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

  /** Starts dragging a new note out of the toolbar's note icon. */
  function handleNoteToolPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setGhost({ clientX: e.clientX, clientY: e.clientY })
  }

  /** Follows the pointer with the ghost preview while dragging a new note out of the toolbar. */
  function handleNoteToolPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!ghost) return
    setGhost({ clientX: e.clientX, clientY: e.clientY })
  }

  /** Drops the new note onto the canvas if released over it, converting screen to canvas coordinates. */
  function handleNoteToolPointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!ghost) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setGhost(null)

    const board = boardRef.current
    if (!board) return
    const rect = board.getBoundingClientRect()
    const isOverCanvas =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
    if (!isOverCanvas) return

    const canvasX = (e.clientX - rect.left - pan.x) / zoom
    const canvasY = (e.clientY - rect.top - pan.y) / zoom
    setNotes((prev) => [...prev, createNoteAt(canvasX, canvasY)])
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
    <div className="app-shell">
      <Toolbar
        onNoteToolPointerDown={handleNoteToolPointerDown}
        onNoteToolPointerMove={handleNoteToolPointerMove}
        onNoteToolPointerUp={handleNoteToolPointerUp}
      />

      <div
        className={`board ${isPanning ? 'is-panning' : ''}`}
        ref={boardRef}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
      >
        <div className="board__zoom">
          <button type="button" onClick={() => setZoomClamped(zoom - ZOOM_STEP)} aria-label="Alejar">
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoomClamped(zoom + ZOOM_STEP)} aria-label="Acercar">
            +
          </button>
          <button type="button" className="board__zoom-reset" onClick={() => setZoomClamped(1)}>
            Reset
          </button>
        </div>

        <div
          className="board__canvas"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
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
        </div>

        <Scrollbar orientation="horizontal" start={scrollMetrics.startX} size={scrollMetrics.sizeX} onScrollTo={scrollToX} />
        <Scrollbar orientation="vertical" start={scrollMetrics.startY} size={scrollMetrics.sizeY} onScrollTo={scrollToY} />
      </div>

      {ghost && (
        <div className="create-ghost" style={{ left: ghost.clientX, top: ghost.clientY }} aria-hidden="true" />
      )}
    </div>
  )
}
