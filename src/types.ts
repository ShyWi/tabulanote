export interface Note {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
}

/** A virtual folder placed on the canvas. Opening it navigates to its own, independent canvas. */
export interface Folder {
  id: string
  x: number
  y: number
  width: number
  height: number
  name: string
}

/** Anything that takes up space on the canvas and needs to be kept within its boundary. */
export interface PositionedItem {
  x: number
  y: number
  width: number
  height: number
}
