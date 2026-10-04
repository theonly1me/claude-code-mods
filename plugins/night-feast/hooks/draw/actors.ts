import { BAT_FRAMES, HURT_TINT, MINI_BAT_FRAMES, SWEAT, VAMPIRE_BLINK, VAMPIRE_SPREAD, VAMPIRE_STANDING } from '../art/vampire'
import { VILLAGER_FRAMES, VILLAGER_HEIGHT } from '../art/villager'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { FEET_Y, WALK_FRAME_MS } from '../sim/constants'
import { isBat } from '../sim/vampire'
import type { Vampire, Villager } from '../sim/types'

const VAMPIRE_TOP = FEET_Y - VAMPIRE_STANDING.height + 1

function frameAt(options: { frames: readonly [Bitmap, Bitmap]; step: number }): Bitmap {
  return options.step % 2 === 0 ? options.frames[0] : options.frames[1]
}

const DIZZY_COLORS = [0xffd166, 0xff4d6d] as const

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

export function drawVampire(options: { bitmap: Bitmap; vampire: Vampire; isNervous: boolean }): void {
  const { bitmap, vampire, isNervous } = options
  const clockMs = vampire.clockMs
  if (isBat(vampire)) {
    const frame = frameAt({ frames: BAT_FRAMES, step: Math.floor(clockMs / 110) })
    stamp({ target: bitmap, source: frame, x: Math.round(vampire.x) + 1, y: FEET_Y - 4 - Math.round(vampire.lift) })
    return
  }
  const isBlinking = clockMs % 3200 < 140
  const sprite = vampire.mode === 'perched' ? VAMPIRE_SPREAD : isBlinking ? VAMPIRE_BLINK : VAMPIRE_STANDING
  const shiver = isNervous && vampire.mode === 'idle' && Math.floor(clockMs / 180) % 4 === 0 ? 1 : 0
  const x = Math.round(vampire.x) + shiver
  const isHurtFrame = vampire.mode === 'recoil' && Math.floor(vampire.modeMs / 80) % 2 === 0
  stamp({ target: bitmap, source: sprite, x, y: VAMPIRE_TOP, tint: isHurtFrame ? () => HURT_TINT : undefined })
  if (isNervous && Math.floor(clockMs / 400) % 2 === 0) {
    setPixel({ bitmap, x: x + 10, y: VAMPIRE_TOP + 2, color: SWEAT })
    setPixel({ bitmap, x: x + 10, y: VAMPIRE_TOP + 3, color: SWEAT })
  }
  if (vampire.mode === 'perched') {
    drawCirclingBats({ bitmap, x, clockMs })
  }
}

export function drawVillager(options: { bitmap: Bitmap; villager: Villager }): void {
  const { bitmap, villager } = options
  const frames = VILLAGER_FRAMES[villager.palette]
  const pace = villager.state === 'dizzy' ? 170 : WALK_FRAME_MS
  const frame = villager.state === 'bitten' ? frames[0] : frameAt({ frames, step: Math.floor(villager.walkMs / pace) })
  const wobble = villager.state === 'dizzy' ? Math.round(Math.sin(villager.stateMs / 120)) : 0
  const x = Math.round(villager.x) + wobble
  const top = FEET_Y - VILLAGER_HEIGHT + 1
  stamp({ target: bitmap, source: frame, x, y: top, isFlipped: villager.direction === -1 })
  if (villager.state === 'dizzy') {
    const angle = villager.stateMs / 160
    DIZZY_COLORS.forEach((color, index) => {
      const turn = angle + index * Math.PI
      setPixel({ bitmap, x: x + 2 + Math.round(Math.cos(turn) * 2), y: top - 2 + Math.round(Math.sin(turn)), color })
    })
  }
}
