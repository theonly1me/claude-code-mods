import {
  DASH_PIXELS_PER_SECOND,
  IMPACT_MS,
  RETURN_PIXELS_PER_SECOND,
  STAGGER_MS,
  STRIKE_MS,
} from './constants'
import type { Actor, Attack, SlayerName } from './types'

const FORMATION: readonly SlayerName[] = ['tanjiro', 'nezuko', 'zenitsu', 'inosuke']
const OFFSTAGE_X = -10

export function formationX(options: { index: number; width: number }): number {
  const spacing = Math.min(8, Math.max(6, Math.floor((options.width - 40) / 4)))
  return 2 + options.index * spacing
}

function actor(options: { name: SlayerName; homeX: number }): Actor {
  return { name: options.name, homeX: options.homeX, x: options.homeX, lift: 0, mode: 'home', modeMs: 0, attack: undefined, hasStruck: false }
}

export function createActors(width: number): Actor[] {
  return [
    ...FORMATION.map((name, index) => actor({ name, homeX: formationX({ index, width }) })),
    { ...actor({ name: 'hashira', homeX: OFFSTAGE_X }), mode: 'offstage' },
  ]
}

export function placeFormation(options: { actors: Actor[]; width: number }): void {
  options.actors.forEach(candidate => {
    const index = FORMATION.indexOf(candidate.name)
    if (index >= 0) {
      const homeX = formationX({ index, width: options.width })
      if (candidate.mode === 'home') {
        candidate.x = homeX
      }
      candidate.homeX = homeX
    }
  })
}

export function isBusy(candidate: Actor): boolean {
  return candidate.mode === 'dash' || candidate.mode === 'strike' || candidate.mode === 'return'
}

function enter(options: { actor: Actor; mode: Actor['mode'] }): void {
  options.actor.mode = options.mode
  options.actor.modeMs = 0
}

export function launch(options: { actor: Actor; attack: Attack }): void {
  options.actor.attack = options.attack
  options.actor.hasStruck = false
  enter({ actor: options.actor, mode: 'dash' })
}

export function stagger(target: Actor): void {
  enter({ actor: target, mode: 'stagger' })
}

function advanceDash(options: { actor: Actor; dtMs: number; targetX: number }): void {
  const { actor: mover, targetX } = options
  const start = mover.homeX
  if (mover.attack?.kind === 'thunder') {
    mover.x = targetX
  } else {
    mover.x = Math.min(targetX, mover.x + (DASH_PIXELS_PER_SECOND * options.dtMs) / 1000)
  }
  const progress = targetX === start ? 1 : (mover.x - start) / (targetX - start)
  mover.lift = mover.name === 'inosuke' ? Math.round(Math.sin(progress * Math.PI) * 5) : 0
  if (mover.x >= targetX) {
    mover.lift = 0
    enter({ actor: mover, mode: 'strike' })
  }
}

export function advanceActor(options: { actor: Actor; dtMs: number; targetX: number }): { didImpact: boolean } {
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
    mover.x = Math.max(mover.homeX, mover.x - (RETURN_PIXELS_PER_SECOND * dtMs) / 1000)
    if (mover.attack?.kind === 'thunder') {
      mover.x = mover.homeX
    }
    if (mover.x <= mover.homeX) {
      mover.attack = undefined
      enter({ actor: mover, mode: mover.name === 'hashira' ? 'offstage' : 'home' })
    }
  } else if (mover.mode === 'stagger' && mover.modeMs >= STAGGER_MS) {
    enter({ actor: mover, mode: 'home' })
  }
  return { didImpact: false }
}
