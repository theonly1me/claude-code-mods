import { BARN_DOOR_X } from '../art/barn'
import { fillRect, setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { drawText, textWidth } from '../shared/pixel/font'
import { HARVEST_MS, POP_MS } from '../sim/constants'
import type { Harvest, Pop } from '../sim/types'
import { barnX } from './land'

const INK: Color = 0x2a1d12
const CREAM: Color = 0xfff6dc
const GOLD: Color = 0xffe066
const WICKER: Color = 0xc8913f
const WICKER_DARK: Color = 0x8e5f24
const LABEL_DELAY_MS = 800

function shadowText(options: { bitmap: Bitmap; text: string; x: number; y: number; color: Color }): void {
  drawText({ ...options, x: options.x + 1, y: options.y + 1, color: INK })
  drawText(options)
}

function drawBasket(options: { bitmap: Bitmap; x: number; y: number }): void {
  const { bitmap, x, y } = options
  setPixel({ bitmap, x: x + 1, y, color: GOLD })
  setPixel({ bitmap, x: x + 2, y, color: 0xf08a24 })
  setPixel({ bitmap, x: x + 3, y, color: 0x9be564 })
  fillRect({ bitmap, x, y: y + 1, width: 5, height: 1, color: WICKER })
  fillRect({ bitmap, x, y: y + 2, width: 5, height: 1, color: WICKER_DARK })
  fillRect({ bitmap, x: x + 1, y: y + 3, width: 3, height: 1, color: WICKER })
}

export function drawHud(options: { bitmap: Bitmap; bushels: number }): void {
  drawBasket({ bitmap: options.bitmap, x: 1, y: 1 })
  shadowText({ bitmap: options.bitmap, text: String(options.bushels), x: 8, y: 0, color: CREAM })
}

export function drawEffects(options: { bitmap: Bitmap; pops: readonly Pop[]; harvest: Harvest | undefined }): void {
  const { bitmap } = options
  options.pops
    .filter(pop => pop.ageMs >= 0)
    .forEach(pop => {
      const progress = pop.ageMs / POP_MS
      const x = Math.round(pop.fromX + (pop.toX - pop.fromX) * progress)
      const lift = pop.toX === pop.fromX ? progress * 6 : Math.sin(Math.PI * progress) * 8
      const y = Math.round(10 - lift)
      setPixel({ bitmap, x, y, color: pop.color })
      setPixel({ bitmap, x: x + 1, y, color: pop.color })
      setPixel({ bitmap, x, y: y + 1, color: pop.color })
      setPixel({ bitmap, x: x + 1, y: y + 1, color: INK })
    })
  if (!options.harvest || options.harvest.ageMs < LABEL_DELAY_MS) {
    return
  }
  const label = `+${options.harvest.count}`
  const rise = Math.round(((options.harvest.ageMs - LABEL_DELAY_MS) / (HARVEST_MS - LABEL_DELAY_MS)) * 5)
  const x = barnX(bitmap.width) + BARN_DOOR_X - Math.ceil(textWidth(label) / 2)
  shadowText({ bitmap, text: label, x, y: 6 - rise, color: GOLD })
}
