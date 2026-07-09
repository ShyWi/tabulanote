import { useRef, type PointerEvent } from 'react'

interface Props {
  orientation: 'horizontal' | 'vertical'
  start: number
  size: number
  onScrollTo: (ratio: number) => void
}

/** A custom scrollbar: its thumb shows how much of the canvas is visible, and can be clicked/dragged to navigate. */
export function Scrollbar({ orientation, start, size, onScrollTo }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  /** Converts a pointer event's position into a 0-1 ratio along the track. */
  function ratioFromEvent(e: PointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    return orientation === 'horizontal'
      ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      : Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
  }

  /** Jumps to the clicked position and starts tracking the drag. */
  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    onScrollTo(ratioFromEvent(e))
  }

  /** Keeps scrolling to follow the pointer while the button is held down. */
  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1) return
    onScrollTo(ratioFromEvent(e))
  }

  return (
    <div
      ref={trackRef}
      className={`scrollbar scrollbar--${orientation}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <div
        className="scrollbar__thumb"
        style={
          orientation === 'horizontal'
            ? { left: `${start * 100}%`, width: `${size * 100}%` }
            : { top: `${start * 100}%`, height: `${size * 100}%` }
        }
      />
    </div>
  )
}
