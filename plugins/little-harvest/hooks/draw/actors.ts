import { cropSprite } from '../art/crops'
import { getPixel, setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import type { Season } from '../shared/pixel/seasons'
import { CROP_BASE_Y } from '../sim/constants'
import { stageForLines } from '../sim/crops'
import type { PlotView } from '../sim/types'
import type { Light } from './light'

const WILT: Color = 0x9a8452
const SNOW: Color = 0xf4f8ff

function capWithSnow(options: { bitmap: Bitmap; x: number; y: number; source: Bitmap; light: Light }): void {
  const { bitmap, source } = options
  for (let column = 0; column < source.width; column += 1) {
    for (let row = 0; row < source.height; row += 1) {
      if (getPixel({ bitmap: source, x: column, y: row }) !== null) {
        if (column % 3 !== 2) {
          setPixel({ bitmap, x: options.x + column, y: options.y + row, color: options.light.tint(SNOW) })
        }
        break
      }
    }
  }
}

export function drawCrops(options: { bitmap: Bitmap; views: readonly PlotView[]; light: Light; clockMs: number; season: Season }): void {
  options.views.forEach((view, index) => {
    const stage = stageForLines(view.plot.lines)
    const sprite = cropSprite({ crop: view.plot.crop, stage })
    const isWilted = view.plot.isWilted && stage !== 'seed'
    const isWindy = !isWilted && stage !== 'seed' && Math.floor(options.clockMs / 700 + index * 2) % 5 === 0
    const sway = isWindy ? 1 : 0
    const x = view.x + sway
    const y = CROP_BASE_Y - sprite.height + 1 + (isWilted ? 1 : 0)
    stamp({
      target: options.bitmap,
      source: sprite,
      x,
      y,
      tint: color => options.light.tint(isWilted ? mixColors({ from: color, to: WILT, amount: 0.6 }) : color),
    })
    if (options.season.name === 'winter' && stage !== 'seed') {
      capWithSnow({ bitmap: options.bitmap, x, y, source: sprite, light: options.light })
    }
  })
}
