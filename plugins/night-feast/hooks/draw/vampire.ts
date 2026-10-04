import {
  BAT_FRAMES,
  EYE_COLOR,
  HURT_TINT,
  MINI_BAT_FRAMES,
  ROOST_FRAMES,
  SHADOW_COLOR,
  SWEAT,
  VAMPIRE_BLINK,
  VAMPIRE_SPREAD,
  VAMPIRE_STANDING,
  VAMPIRE_STRIDES,
} from '../art/vampire'
import type { RoostLook } from '../art/vampire'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Tint } from '../shared/pixel/bitmap'
import { FEET_Y } from '../sim/constants'
import type { Vampire } from '../sim/types'
import { isBat } from '../sim/vampire'

export const VAMPIRE_TOP = FEET_Y - VAMPIRE_STANDING.height + 1
const ROOST_TOP = 1
const PEEK_CYCLE_MS = 2400
const PEEK_START_MS = 1300
const PEEK_END_MS = 1900
const ROOST_LOOKS: readonly RoostLook[] = ['front', 'left', 'front', 'right', 'front', 'shut']

const shadowTint: Tint = color => (color === EYE_COLOR ? EYE_COLOR : SHADOW_COLOR)

export function frameAt(options: { frames: readonly [Bitmap, Bitmap]; step: number }): Bitmap {
  return options.step % 2 === 0 ? options.frames[0] : options.frames[1]
}

function drawCirclingBats(options: { bitmap: Bitmap; x: number; clockMs: number }): void {
  const frame = frameAt({ frames: MINI_BAT_FRAMES, step: Math.floor(options.clockMs / 140) })
  for (let index = 0; index < 3; index += 1) {
    const angle = options.clockMs / 420 + index * 2.1
    stamp({
      target: options.bitmap,
      source: frame,
      x: Math.round(options.x + 5 + Math.cos(angle) * 9),
      y: Math.round(VAMPIRE_TOP + 1 + Math.sin(angle) * 2),
    })
  }
}

function drawRoost(options: { bitmap: Bitmap; vampire: Vampire }): void {
  const { vampire } = options
  const look = ROOST_LOOKS[Math.floor(vampire.modeMs / 600) % ROOST_LOOKS.length] ?? 'front'
  stamp({ target: options.bitmap, source: ROOST_FRAMES[look], x: Math.round(vampire.x) + 3, y: ROOST_TOP })
}

function drawStanding(options: { bitmap: Bitmap; vampire: Vampire; isNervous: boolean }): void {
  const { bitmap, vampire, isNervous } = options
  const clockMs = vampire.clockMs
  const isBlinking = clockMs % 3200 < 140
  const stride = Math.floor(vampire.modeMs / 220)
  const isWalking = vampire.mode === 'stalking'
  const sprite = isWalking
    ? frameAt({ frames: VAMPIRE_STRIDES, step: stride })
    : vampire.mode === 'perched'
      ? VAMPIRE_SPREAD
      : isBlinking
        ? VAMPIRE_BLINK
        : VAMPIRE_STANDING
  const shiver = isNervous && vampire.mode === 'idle' && Math.floor(clockMs / 180) % 4 === 0 ? 1 : 0
  const x = Math.round(vampire.x) + shiver
  const y = VAMPIRE_TOP + (isWalking && stride % 2 === 1 ? 1 : 0)
  const isHurtFrame = vampire.mode === 'recoil' && Math.floor(vampire.modeMs / 80) % 2 === 0
  const peekMs = vampire.modeMs % PEEK_CYCLE_MS
  const isHidden = vampire.mode === 'hiding' && (peekMs < PEEK_START_MS || peekMs > PEEK_END_MS)
  const tint = isHurtFrame ? () => HURT_TINT : isHidden ? shadowTint : undefined
  stamp({ target: bitmap, source: sprite, x: vampire.mode === 'hiding' && !isHidden ? x + 1 : x, y, tint, isFlipped: vampire.facing === -1 })
  if (isNervous && !isHidden && Math.floor(clockMs / 400) % 2 === 0) {
    setPixel({ bitmap, x: x + 10, y: VAMPIRE_TOP + 2, color: SWEAT })
    setPixel({ bitmap, x: x + 10, y: VAMPIRE_TOP + 3, color: SWEAT })
  }
  if (vampire.mode === 'perched') {
    drawCirclingBats({ bitmap, x, clockMs })
  }
}

export function drawVampire(options: { bitmap: Bitmap; vampire: Vampire; isNervous: boolean }): void {
  const { bitmap, vampire } = options
  if (vampire.mode === 'roosting') {
    drawRoost({ bitmap, vampire })
    return
  }
  if (isBat(vampire)) {
    const frame = frameAt({ frames: BAT_FRAMES, step: Math.floor(vampire.clockMs / 110) })
    stamp({ target: bitmap, source: frame, x: Math.round(vampire.x) + 1, y: FEET_Y - 4 - Math.round(vampire.lift) })
    return
  }
  drawStanding(options)
}
