import { setPixel } from '../render/bitmap'
import type { Bitmap, Color } from '../render/bitmap'
import { FLOOR_TOP, STAGE_HEIGHT } from '../sim/constants'

const FLOOR_LIGHT: Color = 0x8b5e3c
const FLOOR_DARK: Color = 0x5a3a22
const FLOOR_SEAM: Color = 0x3f2916
const MOON_LIGHT: Color = 0xe9e6d6
const MOON_SHADE: Color = 0xc9c4aa
const PLANK_WIDTH = 11

const MOON_ROWS = ['.###.', '#####', '#####', '#####', '.###.']
const MOON_SHADE_SPOTS = [
  { x: 1, y: 1 },
  { x: 3, y: 3 },
]

function drawFloor(bitmap: Bitmap): void {
  for (let x = 0; x < bitmap.width; x += 1) {
    setPixel({ bitmap, x, y: FLOOR_TOP, color: FLOOR_LIGHT })
    const isSeam = x % PLANK_WIDTH === 0
    for (let y = FLOOR_TOP + 1; y < STAGE_HEIGHT; y += 1) {
      setPixel({ bitmap, x, y, color: isSeam ? FLOOR_SEAM : FLOOR_DARK })
    }
  }
}

function drawMoon(bitmap: Bitmap): void {
  const originX = Math.max(24, bitmap.width - 30)
  MOON_ROWS.forEach((row, y) => {
    Array.from(row).forEach((cell, x) => {
      if (cell === '#') {
        setPixel({ bitmap, x: originX + x, y: 1 + y, color: MOON_LIGHT })
      }
    })
  })
  MOON_SHADE_SPOTS.forEach(spot => {
    setPixel({ bitmap, x: originX + spot.x, y: 1 + spot.y, color: MOON_SHADE })
  })
}

export function drawBackdrop(bitmap: Bitmap): void {
  drawMoon(bitmap)
  drawFloor(bitmap)
}
