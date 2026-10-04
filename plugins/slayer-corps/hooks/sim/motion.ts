import { enter } from './actors'
import {
  AMBIENT_RETURN_PIXELS_PER_SECOND,
  DASH_PIXELS_PER_SECOND,
  DOZE_MS,
  HOP_MS,
  IMPACT_MS,
  RETURN_PIXELS_PER_SECOND,
  STAGGER_MS,
  STRIKE_MS,
} from './constants'
import type { Actor } from './types'

const FEINT_STEP = 6
const HOP_BACK = 3
const HOP_HEIGHT = 5

type Stage = { actor: Actor; frontX: number; laneX: number }

export function stopFor(options: Stage): number {
  const { actor: mover, frontX } = options
  const style = mover.attack?.style
  const lane = Math.max(mover.homeX, Math.min(options.laneX, frontX - 2))
  if (style === 'feint') {
    return Math.max(lane, Math.min(lane + FEINT_STEP, frontX - 3))
  }
  return style === 'form' ? lane : frontX
}

function advanceDash(options: Stage & { dtMs: number }): void {
  const { actor: mover } = options
  const stopX = stopFor(options)
  const start = mover.homeX
  if (mover.attack?.kind === 'thunder') {
    mover.x = stopX
  } else {
    mover.x = Math.min(stopX, mover.x + (DASH_PIXELS_PER_SECOND * options.dtMs) / 1000)
  }
  const progress = stopX === start ? 1 : (mover.x - start) / (stopX - start)
  mover.lift = mover.name === 'inosuke' ? Math.round(Math.sin(progress * Math.PI) * 5) : 0
  if (mover.x >= stopX) {
    mover.lift = 0
    enter({ actor: mover, mode: 'strike' })
  }
}

function advanceReturn(options: { actor: Actor; dtMs: number }): void {
  const { actor: mover } = options
  const isSparring = mover.attack !== undefined && mover.attack.style !== 'hit'
  const speed = isSparring ? AMBIENT_RETURN_PIXELS_PER_SECOND : RETURN_PIXELS_PER_SECOND
  mover.x = Math.max(mover.homeX, mover.x - (speed * options.dtMs) / 1000)
  if (mover.attack?.kind === 'thunder') {
    mover.x = mover.homeX
  }
  if (mover.x <= mover.homeX) {
    mover.x = mover.homeX
    mover.attack = undefined
    enter({ actor: mover, mode: mover.name === 'hashira' ? 'offstage' : 'home' })
  }
}

function advanceHop(mover: Actor): void {
  const progress = Math.min(1, mover.modeMs / HOP_MS)
  const arc = Math.sin(progress * Math.PI)
  mover.x = mover.homeX - Math.round(arc * HOP_BACK)
  mover.lift = Math.round(arc * HOP_HEIGHT)
  if (progress >= 1) {
    mover.x = mover.homeX
    mover.lift = 0
    mover.attack = undefined
    enter({ actor: mover, mode: 'home' })
  }
}

export function advanceActor(options: Stage & { dtMs: number }): { didImpact: boolean } {
  const { actor: mover, dtMs } = options
  mover.modeMs += dtMs
  if (mover.mode === 'dash') {
    advanceDash(options)
  } else if (mover.mode === 'strike') {
    const didImpact = !mover.hasStruck && mover.modeMs >= IMPACT_MS
    mover.hasStruck = mover.hasStruck || didImpact
    if (mover.modeMs >= STRIKE_MS) {
      enter({ actor: mover, mode: 'return' })
    }
    return { didImpact }
  } else if (mover.mode === 'return') {
    advanceReturn(options)
  } else if (mover.mode === 'hop') {
    advanceHop(mover)
  } else if (mover.mode === 'doze' && mover.modeMs >= DOZE_MS) {
    enter({ actor: mover, mode: 'dash' })
  } else if (mover.mode === 'stagger' && mover.modeMs >= STAGGER_MS) {
    enter({ actor: mover, mode: 'home' })
  }
  return { didImpact: false }
}
