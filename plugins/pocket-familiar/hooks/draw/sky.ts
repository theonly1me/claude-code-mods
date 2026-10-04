import { setPixel } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import type { Daylight } from './backdrop'

const STAR = 0xe8ecff
const MOON = 0xf1ecd2
const SUN = 0xffd95e
const SUN_GLOW = 0xfff1b0
const CLOUD = 0xf5f9ff
const FIREFLY = 0xe8ff8a
const FIREFLY_DIM = 0x8fae3a

const MOON_ROWS = ['.##.', '##..', '##..', '.##.']
const SUN_ROWS = ['.##.', '####', '####', '.##.']
const CLOUD_ROWS = ['..###...', '.######.', '########']

function stamp(options: { bitmap: Bitmap; rows: readonly string[]; x: number; y: number; color: number }): void {
  options.rows.forEach((row, rowIndex) => {
    Array.from(row).forEach((cell, columnIndex) => {
      if (cell === '#') {
        setPixel({ bitmap: options.bitmap, x: options.x + columnIndex, y: options.y + rowIndex, color: options.color })
      }
    })
  })
}

function scatter(index: number): { x: number; y: number } {
  return { x: (index * 37 + 11) % 71, y: (index * 13 + 3) % 9 }
}

export function drawSkyLights(options: { bitmap: Bitmap; daylight: Daylight; clockMs: number }): void {
  const { bitmap, daylight, clockMs } = options
  const lightsX = Math.max(26, bitmap.width - 30)
  if (daylight.light < 0.35) {
    for (let index = 0; index < 14; index += 1) {
      const { x, y } = scatter(index)
      const twinkle = Math.sin(clockMs / 520 + index * 1.7) > -0.4
      if (x < bitmap.width && twinkle) {
        setPixel({ bitmap, x, y, color: mixColors({ from: STAR, to: 0x6b74b8, amount: index % 3 === 0 ? 0 : 0.45 }) })
      }
    }
    stamp({ bitmap, rows: MOON_ROWS, x: lightsX, y: 1, color: MOON })
  }
  if (daylight.light > 0.55) {
    stamp({ bitmap, rows: ['#..#', '....', '....', '#..#'], x: lightsX - 1, y: 0, color: SUN_GLOW })
    stamp({ bitmap, rows: SUN_ROWS, x: lightsX, y: 1, color: SUN })
    for (let cloud = 0; cloud < 2; cloud += 1) {
      const travel = (clockMs / (260 + cloud * 90) + cloud * 31) % (bitmap.width + 10)
      stamp({ bitmap, rows: CLOUD_ROWS, x: Math.round(travel) - 9, y: 2 + cloud * 3, color: CLOUD })
    }
  }
}

export function drawFireflies(options: { bitmap: Bitmap; daylight: Daylight; clockMs: number }): void {
  const { bitmap, daylight, clockMs } = options
  if (daylight.light >= 0.4) {
    return
  }
  for (let index = 0; index < 6; index += 1) {
    const baseX = 24 + index * 8
    const x = baseX + Math.sin(clockMs / (900 + index * 130) + index) * 3
    const y = 9 + Math.cos(clockMs / (1100 + index * 170) + index * 2) * 2
    const glow = Math.sin(clockMs / 380 + index * 2.3)
    if (x < bitmap.width && glow > -0.2) {
      setPixel({ bitmap, x, y, color: glow > 0.5 ? FIREFLY : FIREFLY_DIM })
    }
  }
}
