import { fillRect, setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import { GROUND_TOP, STAGE_HEIGHT } from '../sim/constants'

const DAWN_TOP: Color = 0x6a4c93
const DAWN_HORIZON: Color = 0xffb347
const SUN: Color = 0xffe8a3
const SUN_CORE: Color = 0xfff8e1

export function drawSky(options: { bitmap: Bitmap; top: Color; horizon: Color; dawn: number }): void {
  const { bitmap, dawn } = options
  for (let y = 0; y < GROUND_TOP; y += 1) {
    const amount = y / (GROUND_TOP - 1)
    const night = mixColors({ from: options.top, to: options.horizon, amount })
    const morning = mixColors({ from: DAWN_TOP, to: DAWN_HORIZON, amount })
    fillRect({ bitmap, x: 0, y, width: bitmap.width, height: 1, color: mixColors({ from: night, to: morning, amount: dawn }) })
  }
}

export function drawSun(options: { bitmap: Bitmap; dawn: number }): void {
  if (options.dawn <= 0) {
    return
  }
  const { bitmap } = options
  const centerX = Math.round(bitmap.width / 2)
  const centerY = Math.round(GROUND_TOP + 2 - options.dawn * 8)
  for (let dy = -3; dy <= 3; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const distance = Math.hypot(dx * 0.8, dy)
      if (distance <= 3.2 && centerY + dy < GROUND_TOP) {
        setPixel({ bitmap, x: centerX + dx, y: centerY + dy, color: distance < 1.8 ? SUN_CORE : SUN })
      }
    }
  }
}

export function drawGround(options: { bitmap: Bitmap; top: Color; body: Color; seam: Color; seamEvery: number }): void {
  const { bitmap } = options
  fillRect({ bitmap, x: 0, y: GROUND_TOP, width: bitmap.width, height: 1, color: options.top })
  fillRect({ bitmap, x: 0, y: GROUND_TOP + 1, width: bitmap.width, height: STAGE_HEIGHT - GROUND_TOP - 1, color: options.body })
  for (let x = 0; x < bitmap.width; x += options.seamEvery) {
    setPixel({ bitmap, x, y: GROUND_TOP + 1, color: options.seam })
    setPixel({ bitmap, x: x + Math.floor(options.seamEvery / 2), y: GROUND_TOP + 2, color: options.seam })
  }
}

export function scatter(options: { seed: number; index: number; span: number }): number {
  const value = Math.sin(options.seed * 12.9898 + options.index * 78.233) * 43758.5453
  return Math.floor((value - Math.floor(value)) * options.span)
}

export function drawStars(options: { bitmap: Bitmap; clockMs: number; count: number; color: Color }): void {
  for (let index = 0; index < options.count; index += 1) {
    const isLit = (Math.floor(options.clockMs / 600) + index) % 5 !== 0
    if (isLit) {
      setPixel({
        bitmap: options.bitmap,
        x: scatter({ seed: 3, index, span: options.bitmap.width }),
        y: scatter({ seed: 7, index, span: GROUND_TOP - 4 }),
        color: options.color,
      })
    }
  }
}

export function drawMoon(options: { bitmap: Bitmap; x: number; y: number; light: Color; shade: Color }): void {
  const rows = ['.###.', '#####', '##.##', '#####', '.###.']
  rows.forEach((row, rowIndex) => {
    Array.from(row).forEach((cell, columnIndex) => {
      if (cell !== '.') {
        const isShade = (rowIndex === 1 && columnIndex === 3) || (rowIndex === 3 && columnIndex === 1)
        setPixel({ bitmap: options.bitmap, x: options.x + columnIndex, y: options.y + rowIndex, color: isShade ? options.shade : options.light })
      }
    })
  })
}
