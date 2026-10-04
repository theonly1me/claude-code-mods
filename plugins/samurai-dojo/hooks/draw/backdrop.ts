import { setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import type { Season } from '../shared/pixel/seasons'
import { FLOOR_TOP, STAGE_HEIGHT } from '../sim/constants'

const FLOOR_LIGHT: Color = 0x8b5e3c
const FLOOR_DARK: Color = 0x5a3a22
const FLOOR_SEAM: Color = 0x3f2916
const PLANK_WIDTH = 11
const MOON_X = 20

const MOON_ROWS = ['.###.', '#####', '#####', '#####', '.###.']
const MOON_SHADE_SPOTS = [
  { x: 1, y: 1 },
  { x: 3, y: 3 },
]

function drawFloor(options: { bitmap: Bitmap; season: Season }): void {
  const { bitmap, season } = options
  const isSnowy = season.name === 'winter'
  for (let x = 0; x < bitmap.width; x += 1) {
    const isDrift = isSnowy && (x * 7) % 5 < 2
    setPixel({ bitmap, x, y: FLOOR_TOP, color: isSnowy ? season.palette.ground : FLOOR_LIGHT })
    const isSeam = x % PLANK_WIDTH === 0
    for (let y = FLOOR_TOP + 1; y < STAGE_HEIGHT; y += 1) {
      const wood = isSeam ? FLOOR_SEAM : FLOOR_DARK
      const color = isDrift && y === FLOOR_TOP + 1 ? season.palette.groundShade : wood
      setPixel({ bitmap, x, y, color })
    }
  }
}

function drawMoon(options: { bitmap: Bitmap; season: Season }): void {
  const { bitmap, season } = options
  const shade = mixColors({ from: season.palette.moon, to: 0x000000, amount: 0.18 })
  MOON_ROWS.forEach((row, y) => {
    Array.from(row).forEach((cell, x) => {
      if (cell === '#') {
        setPixel({ bitmap, x: MOON_X + x, y: 1 + y, color: season.palette.moon })
      }
    })
  })
  MOON_SHADE_SPOTS.forEach(spot => {
    setPixel({ bitmap, x: MOON_X + spot.x, y: 1 + spot.y, color: shade })
  })
}

export function drawBackdrop(options: { bitmap: Bitmap; season: Season }): void {
  drawMoon(options)
  drawFloor(options)
}
