import { BARN } from '../art/barn'
import { fillRect, setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import { BARN_WIDTH, HORIZON_Y, MOUND_Y, PLOT_WIDTH, STAGE_HEIGHT } from '../sim/constants'
import type { PlotView } from '../sim/types'
import type { Light } from './light'

const GRASS = 0x5c9e3a
const GRASS_TIP = 0x7cc04f
const POST = 0x8b6a45
const POST_TOP = 0xb08a5c
const RAIL = 0x9c7a50
const SOIL_TOP = 0x9a6a3e
const SOIL = 0x744a2a
const SOIL_DARK = 0x56361f
const PATH = 0x4a3a2c
const PEBBLE = 0x6e5a46
const FENCE_STEP = 6

export function barnX(width: number): number {
  return width - BARN_WIDTH
}

function drawFence(options: { bitmap: Bitmap; light: Light }): void {
  const { bitmap, light } = options
  const right = barnX(bitmap.width)
  fillRect({ bitmap, x: 0, y: 8, width: right, height: 1, color: light.tint(RAIL) })
  fillRect({ bitmap, x: 0, y: 10, width: right, height: 1, color: light.tint(RAIL) })
  for (let x = 1; x < right; x += FENCE_STEP) {
    fillRect({ bitmap, x, y: 7, width: 1, height: 4, color: light.tint(POST) })
    setPixel({ bitmap, x, y: 7, color: light.tint(POST_TOP) })
  }
}

function drawGround(options: { bitmap: Bitmap; light: Light }): void {
  const { bitmap, light } = options
  fillRect({ bitmap, x: 0, y: HORIZON_Y, width: bitmap.width, height: 1, color: light.tint(GRASS) })
  for (let x = 0; x < bitmap.width; x += 3) {
    setPixel({ bitmap, x, y: HORIZON_Y, color: light.tint(GRASS_TIP) })
  }
  fillRect({ bitmap, x: 0, y: MOUND_Y, width: bitmap.width, height: STAGE_HEIGHT - MOUND_Y, color: light.tint(PATH) })
  for (let x = 2; x < bitmap.width; x += 7) {
    setPixel({ bitmap, x, y: STAGE_HEIGHT - 1, color: light.tint(PEBBLE) })
    setPixel({ bitmap, x: x + 3, y: STAGE_HEIGHT - 2, color: light.tint(PEBBLE) })
  }
}

function drawMound(options: { bitmap: Bitmap; x: number; light: Light; isWet: boolean }): void {
  const { bitmap, x, light } = options
  const width = PLOT_WIDTH - 1
  const wet = (color: number): number => light.tint(options.isWet ? mixColors({ from: color, to: 0x24160c, amount: 0.35 }) : color)
  fillRect({ bitmap, x: x + 1, y: MOUND_Y, width: width - 2, height: 1, color: wet(SOIL_TOP) })
  fillRect({ bitmap, x, y: MOUND_Y + 1, width, height: 1, color: wet(SOIL) })
  setPixel({ bitmap, x, y: MOUND_Y, color: wet(SOIL) })
  setPixel({ bitmap, x: x + width - 1, y: MOUND_Y, color: wet(SOIL) })
  fillRect({ bitmap, x, y: MOUND_Y + 2, width, height: 1, color: wet(SOIL_DARK) })
}

export function drawLand(options: { bitmap: Bitmap; light: Light; views: readonly PlotView[]; isWet: boolean }): void {
  const { bitmap, light } = options
  drawFence({ bitmap, light })
  drawGround({ bitmap, light })
  stamp({ target: bitmap, source: BARN, x: barnX(bitmap.width), y: MOUND_Y + 2 - BARN.height, tint: light.tint })
  options.views.forEach(view => drawMound({ bitmap, x: view.x, light, isWet: options.isWet }))
}
