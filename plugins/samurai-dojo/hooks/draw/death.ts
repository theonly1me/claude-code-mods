import { setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors, WHITE } from '../shared/pixel/colors'

const CODE_GREEN: Color = 0x4ade80
const TWIN_PINK: Color = 0xe86a92

function noiseOf(options: { x: number; y: number; seed: number }): number {
  const raw = Math.sin(options.x * 12.9898 + options.y * 78.233 + options.seed * 37.719) * 43758.5453
  return raw - Math.floor(raw)
}

export function drawScatter(options: {
  target: Bitmap
  source: Bitmap
  x: number
  y: number
  progress: number
  seed: number
}): void {
  const { source, progress } = options
  source.pixels.forEach((color, index) => {
    if (color === null) {
      return
    }
    const column = index % source.width
    const row = Math.floor(index / source.width)
    const noise = noiseOf({ x: column, y: row, seed: options.seed })
    if (progress > 0.45 + noise * 0.55) {
      return
    }
    const glow = mixColors({ from: color, to: CODE_GREEN, amount: progress * 1.8 })
    setPixel({
      bitmap: options.target,
      x: options.x + column + (noise - 0.5) * progress * 16,
      y: options.y + row + progress * progress * (6 + noise * 14) - progress * 3,
      color: progress < 0.12 ? WHITE : glow,
    })
  })
}

export function drawSplit(options: {
  target: Bitmap
  source: Bitmap
  x: number
  y: number
  progress: number
  seed: number
}): void {
  const { source, progress } = options
  const middle = source.width / 2
  source.pixels.forEach((color, index) => {
    if (color === null) {
      return
    }
    const column = index % source.width
    const row = Math.floor(index / source.width)
    const noise = noiseOf({ x: column, y: row, seed: options.seed })
    if (progress > 0.4 + noise * 0.6) {
      return
    }
    const direction = column < middle ? -1 : 1
    const faded = mixColors({ from: color, to: TWIN_PINK, amount: progress })
    setPixel({
      bitmap: options.target,
      x: options.x + column + direction * progress * 9,
      y: options.y + row - progress * 4,
      color: progress < 0.15 ? WHITE : faded,
    })
  })
}
