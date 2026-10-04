import type { Bitmap } from '../../shared/pixel/bitmap.ts'

export type ScriptedEvent = { atMs: number; run: () => void }

export type Storyboard = { bitmaps: Bitmap[]; note: string }

function snapshot(bitmap: Bitmap): Bitmap {
  return { ...bitmap, pixels: [...bitmap.pixels] }
}

export function runScript(options: {
  frameMs: number
  endMs: number
  captureAtMs: readonly number[]
  events: readonly ScriptedEvent[]
  tick: (dtMs: number) => void
  frame: () => Bitmap
}): Bitmap[] {
  const bitmaps: Bitmap[] = []
  for (let elapsedMs = 0; elapsedMs <= options.endMs; elapsedMs += options.frameMs) {
    options.events.filter(event => event.atMs === elapsedMs).forEach(event => event.run())
    options.tick(options.frameMs)
    if (options.captureAtMs.includes(elapsedMs)) {
      bitmaps.push(snapshot(options.frame()))
    }
  }
  return bitmaps
}
