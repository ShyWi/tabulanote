import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Note } from '../types'
import { loadNotes, loadViewport, saveNotes, saveViewport } from '../storage'
import { clampPan, computeBoundsForNotes, computeScrollMetrics, panFromScrollRatio } from '../bounds'
import { PostIt } from './PostIt'
import { Scrollbar } from './Scrollbar'

const COLORS = ['#fff59d', '#ffccbc', '#c8e6c9', '#bbdefb', '#e1bee7']

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1

function clampZoomValue(value: number) {
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

interface PanState {
  pointerId: number
  startX: number
  startY: number
  panX: number
  panY: number
}

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
  const boardRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<PanState | null>(null)

  const bounds = useMemo(() => computeBoundsForNotes(boundsNotes), [boundsNotes])

  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  // Adding/removing a note isn't a drag gesture, so reflect it immediately.
  useEffect(() => {
    setBoundsNotes(notes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length])

  function commitBounds() {
    setBoundsNotes(notes)
  }

  useEffect(() => {
    saveViewport({ pan, zoom })
  }, [pan, zoom])

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

  function setZoomClamped(nextZoom: number) {
    const z = clampZoomValue(nextZoom)
    setZoom(z)
    const { width, height } = viewportSize()
    setPan((prev) => clampPan(prev, z, bounds, width, height))
  }

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

  function handleBoardPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 1) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    setIsPanning(true)
  }

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

  function handleBoardPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!panRef.current || panRef.current.pointerId !== e.pointerId) return
    panRef.current = null
    setIsPanning(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
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

  function scrollToX(ratio: number) {
    const { width, height } = viewportSize()
    const x = panFromScrollRatio('x', ratio, zoom, bounds, width, height)
    setPan((prev) => clampPan({ x, y: prev.y }, zoom, bounds, width, height))
  }

  function scrollToY(ratio: number) {
    const { width, height } = viewportSize()
    const y = panFromScrollRatio('y', ratio, zoom, bounds, width, height)
    setPan((prev) => clampPan({ x: prev.x, y }, zoom, bounds, width, height))
  }

  const { width: viewportWidth, height: viewportHeight } = viewportSize()
  const scrollMetrics = computeScrollMetrics(pan, zoom, bounds, viewportWidth, viewportHeight)

  return (
    <div
      className={`board ${isPanning ? 'is-panning' : ''}`}
      ref={boardRef}
      onPointerDown={handleBoardPointerDown}
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUp}
    >
      <button type="button" className="board__add" onClick={addNote}>
        + Nueva nota
      </button>

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
  )
}
