import { CAT_FRAMES, CHICKEN_FRAMES, CROW_FRAMES, HEN_FRAMES, SCARECROW } from '../art/critters'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { FEET_Y, MOUND_Y } from '../sim/constants'
import type { Critters } from '../sim/critters'
import type { Cat, Chicken, Crow } from '../sim/types'
import type { Light } from './light'

const CAT_TAIL: Color = 0xe39a45
const FENCE_TOP_Y = 8

function drawChicken(options: { bitmap: Bitmap; chicken: Chicken; light: Light }): void {
  const { chicken } = options
  const frames = chicken.isBrown ? HEN_FRAMES : CHICKEN_FRAMES
  const isStep = chicken.mode === 'walk' && Math.floor(chicken.modeMs / 180) % 2 === 1
  const isPecking = chicken.mode === 'peck' && Math.floor(chicken.modeMs / 260) % 2 === 0
  const frame = isPecking ? frames.peck : isStep ? frames.step : frames.stand
  stamp({
    target: options.bitmap,
    source: frame,
    x: Math.round(chicken.x),
    y: FEET_Y - frame.height + 1,
    isFlipped: chicken.isFacingLeft,
    tint: options.light.tint,
  })
}

function drawCrow(options: { bitmap: Bitmap; crow: Crow; light: Light }): void {
  const { crow } = options
  if (crow.mode === 'away') {
    return
  }
  const isFlying = crow.mode !== 'perch'
  const flap = Math.floor(crow.modeMs / 120) % 2 === 0
  const isPecking = !isFlying && Math.floor(crow.modeMs / 450) % 3 === 0
  const frame = isFlying ? (flap ? CROW_FRAMES.wingsUp : CROW_FRAMES.wingsDown) : isPecking ? CROW_FRAMES.peck : CROW_FRAMES.perch
  stamp({
    target: options.bitmap,
    source: frame,
    x: Math.round(crow.x),
    y: Math.round(crow.y),
    isFlipped: crow.mode === 'arrive',
    tint: options.light.tint,
  })
}

function drawCat(options: { bitmap: Bitmap; cat: Cat; light: Light }): void {
  const { cat, bitmap, light } = options
  const frame = cat.mode === 'stretch' ? CAT_FRAMES.stretch : cat.mode === 'walk' ? CAT_FRAMES.walk : CAT_FRAMES.nap
  const x = Math.round(cat.x)
  const y = FENCE_TOP_Y - frame.height
  const isFlipped = !cat.isFacingLeft
  stamp({ target: bitmap, source: frame, x, y, isFlipped, tint: light.tint })
  const flick = Math.floor(cat.modeMs / (cat.mode === 'nap' ? 650 : 200)) % 2
  const tailX = isFlipped ? x - 1 : x + frame.width
  const tailBase = y + 2
  setPixel({ bitmap, x: tailX, y: tailBase - flick, color: light.tint(CAT_TAIL) })
  setPixel({ bitmap, x: tailX + (isFlipped ? -1 : 1), y: tailBase - 1 - flick, color: light.tint(CAT_TAIL) })
}

export function drawScarecrow(options: { bitmap: Bitmap; x: number | undefined; light: Light; clockMs: number }): void {
  if (options.x === undefined) {
    return
  }
  const lean = Math.floor(options.clockMs / 1800) % 4 === 0 ? 1 : 0
  stamp({
    target: options.bitmap,
    source: SCARECROW,
    x: options.x + lean,
    y: MOUND_Y + 1 - SCARECROW.height + 1,
    tint: options.light.tint,
  })
}

export function drawCritters(options: { bitmap: Bitmap; critters: Critters; light: Light; layer: 'fence' | 'field' | 'yard' }): void {
  const { bitmap, critters, light } = options
  if (options.layer === 'fence') {
    drawCat({ bitmap, cat: critters.cat(), light })
    return
  }
  if (options.layer === 'field') {
    drawCrow({ bitmap, crow: critters.crow(), light })
    return
  }
  critters.chickens().forEach(chicken => drawChicken({ bitmap, chicken, light }))
}
