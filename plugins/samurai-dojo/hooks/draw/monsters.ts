import { CODEX_FRAMES } from '../art/codex'
import { GEMINI_FRAMES } from '../art/gemini'
import { parsePixelMap } from '../shared/pixel/sprite'
import type { FrameSet } from '../shared/pixel/sprite'
import { stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Tint } from '../shared/pixel/bitmap'
import { mixColors, WHITE } from '../shared/pixel/colors'
import { DEATH_MS, FLOOR_TOP, WALK_FRAME_MS } from '../sim/constants'
import type { Monster } from '../sim/types'
import { drawScatter, drawSplit } from './death'

const ELITE_RED = 0xff3b30
const CROWN = parsePixelMap({
  rows: ['.g...gg...g.', '.gggggggggg.'],
  palette: { g: 0xf2c14e },
})

const whiten: Tint = color => mixColors({ from: color, to: WHITE, amount: 0.85 })
const redden: Tint = color => mixColors({ from: color, to: ELITE_RED, amount: 0.38 })

function framesOf(monster: Monster): FrameSet {
  return monster.kind === 'codex' ? CODEX_FRAMES : GEMINI_FRAMES
}

function hoverOffset(monster: Monster): number {
  return monster.kind === 'gemini' ? 1 + Math.round(Math.sin(monster.walkMs / 260)) : 0
}

export function drawMonster(options: { bitmap: Bitmap; monster: Monster }): void {
  const { bitmap, monster } = options
  const frames = framesOf(monster)
  const frameIndex = Math.floor(monster.walkMs / WALK_FRAME_MS) % frames.length
  const sprite = frames[frameIndex] ?? frames[0]
  const x = Math.round(monster.x)
  const y = FLOOR_TOP - sprite.height - hoverOffset(monster)

  if (monster.phase === 'dying') {
    const progress = Math.min(1, monster.phaseMs / DEATH_MS)
    const drawDeath = monster.kind === 'codex' ? drawScatter : drawSplit
    drawDeath({ target: bitmap, source: sprite, x, y, progress, seed: monster.id })
    return
  }

  const tint = monster.flashMs > 0 ? whiten : monster.isElite ? redden : undefined
  stamp({ target: bitmap, source: sprite, x, y, tint })
  if (monster.isElite) {
    stamp({ target: bitmap, source: CROWN, x, y: Math.max(0, y - 1) })
  }
}
