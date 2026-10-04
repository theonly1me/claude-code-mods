import { fillRect, setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { drawText } from '../shared/pixel/font'
import { DAWN_PERCENT, WARM_PERCENT } from '../sim/constants'

const GLASS = 0x9aa0c8
const CORK = 0x8b5a2b
const EMPTY = 0x1c1530
const BLOOD = 0xc1121f
const BLOOD_SHINE = 0xff4d6d
const CALM = 0xb8b0d8
const WARM = 0xf4a261
const DAWN = 0xe76f51
const VIAL_ROWS = 7

function percentColor(options: { percent: number; clockMs: number }): Color {
  if (options.percent >= DAWN_PERCENT) {
    return Math.floor(options.clockMs / 500) % 2 === 0 ? DAWN : WARM
  }
  return options.percent >= WARM_PERCENT ? WARM : CALM
}

function drawVial(options: { bitmap: Bitmap; blood: number }): void {
  const { bitmap } = options
  fillRect({ bitmap, x: 2, y: 1, width: 2, height: 1, color: CORK })
  fillRect({ bitmap, x: 1, y: 2, width: 1, height: VIAL_ROWS + 1, color: GLASS })
  fillRect({ bitmap, x: 4, y: 2, width: 1, height: VIAL_ROWS + 1, color: GLASS })
  fillRect({ bitmap, x: 1, y: 2 + VIAL_ROWS, width: 4, height: 1, color: GLASS })
  fillRect({ bitmap, x: 2, y: 2, width: 2, height: VIAL_ROWS, color: EMPTY })
  const filled = Math.round((Math.max(0, Math.min(100, options.blood)) / 100) * VIAL_ROWS)
  if (filled === 0) {
    return
  }
  const top = 2 + VIAL_ROWS - filled
  fillRect({ bitmap, x: 2, y: top, width: 2, height: filled, color: BLOOD })
  setPixel({ bitmap, x: 2, y: top, color: BLOOD_SHINE })
}

export function drawHud(options: { bitmap: Bitmap; blood: number; percent: number | null; clockMs: number }): void {
  const { bitmap, percent } = options
  drawVial({ bitmap, blood: options.blood })
  if (percent === null) {
    drawText({ bitmap, text: 'DUSK', x: 7, y: 1, color: CALM })
  } else {
    drawText({ bitmap, text: `${percent}%`, x: 7, y: 1, color: percentColor({ percent, clockMs: options.clockMs }) })
  }
}
