import type { Bitmap } from '../shared/pixel/bitmap'
import { ARRIVING_MS, COUNTER_MS, DAWN_MS, DYING_MS } from '../sim/constants'
import type { Progression } from '../sim/progression'
import type { Actor, Particle } from '../sim/types'
import { drawScene } from './scene'

const RECOIL_PIXELS = 2

export function drawBattle(options: {
  bitmap: Bitmap
  story: Progression
  actors: readonly Actor[]
  particles: readonly Particle[]
  clockMs: number
  demonX: number
  lungeMs: number
  isRecoiling: boolean
}): void {
  const { story } = options
  const chapter = story.chapter()
  const phase = story.phase()
  const phaseMs = story.phaseMs()
  const lunge = options.lungeMs > 0 ? Math.round(Math.sin(((COUNTER_MS - options.lungeMs) / COUNTER_MS) * Math.PI) * -10) : 0
  const arrival = phase === 'arriving' ? Math.round((1 - phaseMs / ARRIVING_MS) * 24) : 0
  drawScene({
    bitmap: options.bitmap,
    clockMs: options.clockMs,
    chapter,
    cycle: story.progress().cycle,
    phase,
    dawn: phase === 'dawn' ? Math.min(1, phaseMs / 1500, (DAWN_MS - phaseMs) / 1500 + 0.3) : 0,
    dissolve: phase === 'dying' ? Math.min(1, phaseMs / (DYING_MS * 0.7)) : 0,
    actors: options.actors,
    particles: options.particles,
    demonX: options.demonX + lunge + arrival + (options.isRecoiling ? RECOIL_PIXELS : 0),
    isDemonFlashing: story.isFlashing(),
    isTrueForm: chapter.shape === 'muzan' && story.progress().demonHp < story.maxHp() / 2,
    hearts: story.hearts(),
    hp: story.progress().demonHp,
    shownHp: story.shownHp(),
    maxHp: story.maxHp(),
  })
}
