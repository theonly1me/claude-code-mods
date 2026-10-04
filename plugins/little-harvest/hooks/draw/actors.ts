import { cropSprite } from '../art/crops'
import { FARMER_FRAMES, FARMER_HAND, FARMER_HEIGHT, FARMER_WIDTH } from '../art/farmer'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import { CROP_BASE_Y, FEET_Y, SWING_MS, WALK_FRAME_MS } from '../sim/constants'
import { stageForLines } from '../sim/crops'
import type { Farmer, PlotView } from '../sim/types'
import type { Light } from './light'

const WILT: Color = 0x9a8452
const HANDLE: Color = 0x8b5e3c
const BLADE: Color = 0xc7ced8
const DIRT: Color = 0x8a5a33

export function drawCrops(options: { bitmap: Bitmap; views: readonly PlotView[]; light: Light; clockMs: number }): void {
  options.views.forEach((view, index) => {
    const stage = stageForLines(view.plot.lines)
    const sprite = cropSprite({ crop: view.plot.crop, stage })
    const isWilted = view.plot.isWilted && stage !== 'seed'
    const sway = stage === 'ripe' && !isWilted && Math.floor(options.clockMs / 900 + index) % 6 === 0 ? 1 : 0
    stamp({
      target: options.bitmap,
      source: sprite,
      x: view.x + sway,
      y: CROP_BASE_Y - sprite.height + 1 + (isWilted ? 1 : 0),
      tint: color => options.light.tint(isWilted ? mixColors({ from: color, to: WILT, amount: 0.6 }) : color),
    })
  })
}

function drawHoe(options: { bitmap: Bitmap; handX: number; handY: number; direction: number; isDown: boolean; light: Light }): void {
  const { bitmap, handX, handY, direction, light } = options
  const step = options.isDown ? 1 : -1
  for (let index = 1; index <= 3; index += 1) {
    setPixel({ bitmap, x: handX + direction * index, y: handY + step * index, color: light.tint(HANDLE) })
  }
  const tipX = handX + direction * 4
  const tipY = handY + step * 3
  setPixel({ bitmap, x: tipX, y: tipY, color: light.tint(BLADE) })
  setPixel({ bitmap, x: tipX, y: tipY + 1, color: light.tint(BLADE) })
  if (options.isDown) {
    setPixel({ bitmap, x: tipX - direction, y: tipY - 2, color: light.tint(DIRT) })
    setPixel({ bitmap, x: tipX + direction, y: tipY - 3, color: light.tint(DIRT) })
  }
}

export function drawFarmer(options: { bitmap: Bitmap; farmer: Farmer; light: Light }): void {
  const { bitmap, farmer, light } = options
  const x = Math.round(farmer.x)
  const isStride = farmer.mode === 'walk' && Math.floor(farmer.modeMs / WALK_FRAME_MS) % 2 === 1
  const isHop = farmer.mode === 'cheer' && Math.floor(farmer.modeMs / 200) % 2 === 0
  const frame =
    farmer.mode === 'hoe'
      ? FARMER_FRAMES.work
      : farmer.mode === 'cheer'
        ? FARMER_FRAMES.cheer
        : isStride
          ? FARMER_FRAMES.stride
          : FARMER_FRAMES.stand
  const y = FEET_Y - FARMER_HEIGHT + 1 - (isHop ? 1 : 0)
  stamp({ target: bitmap, source: frame, x, y, isFlipped: farmer.isFacingLeft, tint: light.tint })
  if (farmer.mode !== 'hoe') {
    return
  }
  const direction = farmer.isFacingLeft ? -1 : 1
  const handX = farmer.isFacingLeft ? x + FARMER_WIDTH - 1 - FARMER_HAND.x : x + FARMER_HAND.x
  const isDown = (farmer.modeMs % SWING_MS) / SWING_MS >= 0.5
  drawHoe({ bitmap, handX, handY: y + FARMER_HAND.y + 1, direction, isDown, light })
}
