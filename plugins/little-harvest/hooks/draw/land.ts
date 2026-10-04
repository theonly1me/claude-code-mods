import { BARN } from '../art/barn'
import { fillRect, setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import type { Season } from '../shared/pixel/seasons'
import { BARN_WIDTH, HORIZON_Y, MOUND_Y, PLOT_WIDTH, STAGE_HEIGHT } from '../sim/constants'
import type { PlotView } from '../sim/types'
import type { Light } from './light'

const POST = 0x8b6a45
const POST_TOP = 0xb08a5c
const RAIL = 0x9c7a50
const SOIL_TOP = 0x9a6a3e
const SOIL = 0x744a2a
const SOIL_DARK = 0x56361f
const PATH = 0x4a3a2c
const PEBBLE = 0x6e5a46
const SNOW: Color = 0xf2f6fc
const FENCE_STEP = 6

export function barnX(width: number): number {
  return width - BARN_WIDTH
}

function speckle(options: { x: number; y: number }): number {
  return ((options.x * 7919 + options.y * 104729) >>> 0) % 11
}

function drawFence(options: { bitmap: Bitmap; light: Light; season: Season }): void {
  const { bitmap, light, season } = options
  const right = barnX(bitmap.width)
  const isSnowy = season.name === 'winter'
  fillRect({ bitmap, x: 0, y: 8, width: right, height: 1, color: light.tint(isSnowy ? SNOW : RAIL) })
  fillRect({ bitmap, x: 0, y: 10, width: right, height: 1, color: light.tint(RAIL) })
  for (let x = 1; x < right; x += FENCE_STEP) {
    fillRect({ bitmap, x, y: 7, width: 1, height: 4, color: light.tint(POST) })
    setPixel({ bitmap, x, y: 7, color: light.tint(isSnowy ? SNOW : POST_TOP) })
  }
}

function drawGround(options: { bitmap: Bitmap; light: Light; season: Season }): void {
  const { bitmap, light, season } = options
  const { palette } = season
  fillRect({ bitmap, x: 0, y: HORIZON_Y, width: bitmap.width, height: 1, color: light.tint(palette.ground) })
  for (let x = 0; x < bitmap.width; x += 3) {
    setPixel({ bitmap, x, y: HORIZON_Y, color: light.tint(season.name === 'winter' ? palette.groundShade : palette.foliageLight) })
  }
  fillRect({ bitmap, x: 0, y: MOUND_Y, width: bitmap.width, height: STAGE_HEIGHT - MOUND_Y, color: light.tint(PATH) })
  for (let x = 0; x < bitmap.width; x += 1) {
    for (let y = MOUND_Y; y < STAGE_HEIGHT; y += 1) {
      const roll = speckle({ x, y })
      if (season.name === 'winter' && roll < 4) {
        setPixel({ bitmap, x, y, color: light.tint(roll < 2 ? SNOW : palette.groundShade) })
      } else if (season.name === 'autumn' && roll === 0) {
        setPixel({ bitmap, x, y, color: light.tint(palette.particles[(x + y) % palette.particles.length] ?? palette.foliage) })
      } else if (season.name === 'blossom' && roll === 0 && y === STAGE_HEIGHT - 1) {
        setPixel({ bitmap, x, y, color: light.tint(palette.foliage) })
      } else if (roll === 5 && (x + y) % 3 === 0) {
        setPixel({ bitmap, x, y, color: light.tint(PEBBLE) })
      }
    }
  }
}

function drawMound(options: { bitmap: Bitmap; x: number; light: Light; isWet: boolean; isSnowy: boolean }): void {
  const { bitmap, x, light } = options
  const width = PLOT_WIDTH - 1
  const wet = (color: number): number => light.tint(options.isWet ? mixColors({ from: color, to: 0x24160c, amount: 0.35 }) : color)
  fillRect({ bitmap, x: x + 1, y: MOUND_Y, width: width - 2, height: 1, color: options.isSnowy ? light.tint(SNOW) : wet(SOIL_TOP) })
  fillRect({ bitmap, x, y: MOUND_Y + 1, width, height: 1, color: wet(SOIL) })
  setPixel({ bitmap, x, y: MOUND_Y, color: wet(SOIL) })
  setPixel({ bitmap, x: x + width - 1, y: MOUND_Y, color: wet(SOIL) })
  fillRect({ bitmap, x, y: MOUND_Y + 2, width, height: 1, color: wet(SOIL_DARK) })
}

export function drawLand(options: { bitmap: Bitmap; light: Light; views: readonly PlotView[]; isWet: boolean; season: Season }): void {
  const { bitmap, light, season } = options
  drawFence({ bitmap, light, season })
  drawGround({ bitmap, light, season })
  const left = barnX(bitmap.width)
  const top = MOUND_Y + 2 - BARN.height
  stamp({ target: bitmap, source: BARN, x: left, y: top, tint: light.tint })
  if (season.name === 'winter') {
    fillRect({ bitmap, x: left + 5, y: top, width: 7, height: 1, color: light.tint(SNOW) })
    fillRect({ bitmap, x: left + 3, y: top + 1, width: 11, height: 1, color: light.tint(SNOW) })
  }
  options.views.forEach(view =>
    drawMound({ bitmap, x: view.x, light, isWet: options.isWet, isSnowy: season.name === 'winter' }),
  )
}
