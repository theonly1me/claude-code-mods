import { fillRect, setPixel } from '../../shared/pixel/bitmap'
import type { Bitmap, Color } from '../../shared/pixel/bitmap'
import { mixColors } from '../../shared/pixel/colors'

export const SCENE_HEIGHT = 12

export type SceneInput = { bitmap: Bitmap; ms: number; isWorking: boolean; isLight: boolean }

export function hexColor(hex: string): Color {
  return Number.parseInt(hex.slice(1), 16)
}

export function blend(options: { from: Color; to: Color; amount: number }): Color {
  return mixColors(options)
}

export function noise(seed: number): number {
  const raw = Math.sin(seed * 12.9898) * 43758.5453
  return raw - Math.floor(raw)
}

export function band(options: { bitmap: Bitmap; y: number; height: number; color: Color }): void {
  fillRect({ bitmap: options.bitmap, x: 0, y: options.y, width: options.bitmap.width, height: options.height, color: options.color })
}

export function disc(options: { bitmap: Bitmap; cx: number; cy: number; radius: number; colorAt: (y: number) => Color | null }): void {
  for (let y = Math.floor(options.cy - options.radius); y <= Math.ceil(options.cy + options.radius); y += 1) {
    const half = Math.sqrt(Math.max(0, options.radius ** 2 - (y - options.cy) ** 2))
    const color = options.colorAt(y)
    if (color === null) {
      continue
    }
    for (let x = Math.ceil(options.cx - half); x <= Math.floor(options.cx + half); x += 1) {
      setPixel({ bitmap: options.bitmap, x, y, color })
    }
  }
}
