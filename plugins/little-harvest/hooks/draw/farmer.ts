import { GRAIN, HAY_BALE, SPRAY, WATERING_CAN } from '../art/critters'
import { FARMER_FRAMES, FARMER_HAND, FARMER_HEIGHT, FARMER_WIDTH } from '../art/farmer'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { FEET_Y, MOUND_Y, SWING_MS, WALK_FRAME_MS } from '../sim/constants'
import type { Farmer } from '../sim/types'
import type { Light } from './light'

const HANDLE: Color = 0x8b5e3c
const BLADE: Color = 0xc7ced8
const DIRT: Color = 0x8a5a33
const WEED: Color = 0x6fbf4a
const DREAM: Color = 0xdfe6ff

type Pose = { frame: Bitmap; hop: number }

function poseOf(farmer: Farmer): Pose {
  const beat = (periodMs: number): boolean => Math.floor(farmer.modeMs / periodMs) % 2 === 0
  const isStride = Math.floor(farmer.modeMs / WALK_FRAME_MS) % 2 === 1
  if (farmer.mode === 'walk') {
    return { frame: isStride ? FARMER_FRAMES.stride : FARMER_FRAMES.stand, hop: 0 }
  }
  if (farmer.mode === 'hoe' || farmer.mode === 'water') {
    return { frame: FARMER_FRAMES.work, hop: 0 }
  }
  if (farmer.mode === 'weed' || farmer.mode === 'lift' || farmer.mode === 'drop') {
    return { frame: FARMER_FRAMES.crouch, hop: 0 }
  }
  if (farmer.mode === 'rest') {
    return { frame: FARMER_FRAMES.rest, hop: 0 }
  }
  if (farmer.mode === 'cheer') {
    return { frame: FARMER_FRAMES.cheer, hop: beat(200) ? 1 : 0 }
  }
  if (farmer.mode === 'shoo') {
    return { frame: beat(180) ? FARMER_FRAMES.cheer : FARMER_FRAMES.stand, hop: beat(360) ? 1 : 0 }
  }
  if (farmer.mode === 'feed' || farmer.mode === 'inspect') {
    return { frame: beat(farmer.mode === 'feed' ? 300 : 500) ? FARMER_FRAMES.work : FARMER_FRAMES.stand, hop: 0 }
  }
  return { frame: FARMER_FRAMES.stand, hop: 0 }
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

function drawFalling(options: { bitmap: Bitmap; x: number; fromY: number; modeMs: number; color: Color; direction: number }): void {
  for (let drop = 0; drop < 3; drop += 1) {
    const progress = ((options.modeMs + drop * 140) % 420) / 420
    const y = Math.round(options.fromY + progress * (MOUND_Y - options.fromY))
    setPixel({ bitmap: options.bitmap, x: options.x + options.direction * (drop % 2), y, color: options.color })
  }
}

function drawTools(options: { bitmap: Bitmap; farmer: Farmer; x: number; y: number; light: Light }): void {
  const { bitmap, farmer, x, y, light } = options
  const direction = farmer.isFacingLeft ? -1 : 1
  const handX = farmer.isFacingLeft ? x + FARMER_WIDTH - 1 - FARMER_HAND.x : x + FARMER_HAND.x
  const handY = y + FARMER_HAND.y + 1
  if (farmer.mode === 'hoe') {
    drawHoe({ bitmap, handX, handY, direction, isDown: (farmer.modeMs % SWING_MS) / SWING_MS >= 0.5, light })
  }
  if (farmer.mode === 'water') {
    const canX = farmer.isFacingLeft ? handX - 3 : handX
    stamp({ target: bitmap, source: WATERING_CAN, x: canX, y: handY - 1, isFlipped: farmer.isFacingLeft, tint: light.tint })
    drawFalling({ bitmap, x: handX + direction * 4, fromY: handY + 1, modeMs: farmer.modeMs, color: SPRAY, direction })
  }
  if (farmer.mode === 'feed' && Math.floor(farmer.modeMs / 300) % 2 === 0) {
    drawFalling({ bitmap, x: handX + direction * 2, fromY: handY, modeMs: farmer.modeMs, color: GRAIN, direction })
  }
  if (farmer.mode === 'weed') {
    const progress = (farmer.modeMs % 700) / 700
    setPixel({ bitmap, x: handX + direction * (1 + progress * -4), y: MOUND_Y - Math.sin(Math.PI * progress) * 5, color: light.tint(WEED) })
  }
  if (farmer.isCarrying && farmer.mode !== 'drop') {
    stamp({ target: bitmap, source: HAY_BALE, x: x + 1, y: y - 2, tint: light.tint })
  }
  if (farmer.mode === 'lift' || farmer.mode === 'drop') {
    stamp({ target: bitmap, source: HAY_BALE, x: handX + (farmer.isFacingLeft ? -4 : 1), y: FEET_Y - 1, tint: light.tint })
  }
  if (farmer.mode === 'rest') {
    const rise = Math.floor((farmer.modeMs % 1500) / 300)
    ;[0, 1, 2].forEach(offset => setPixel({ bitmap, x: x + 5 + offset, y: y + 1 - rise, color: DREAM }))
    setPixel({ bitmap, x: x + 6, y: y + 2 - rise, color: DREAM })
    ;[0, 1, 2].forEach(offset => setPixel({ bitmap, x: x + 5 + offset, y: y + 3 - rise, color: DREAM }))
  }
}

export function drawFarmer(options: { bitmap: Bitmap; farmer: Farmer; light: Light }): void {
  const { bitmap, farmer, light } = options
  const pose = poseOf(farmer)
  const x = Math.round(farmer.x)
  const y = FEET_Y - FARMER_HEIGHT + 1 - pose.hop
  stamp({ target: bitmap, source: pose.frame, x, y, isFlipped: farmer.isFacingLeft, tint: light.tint })
  drawTools({ bitmap, farmer, x, y, light })
}
