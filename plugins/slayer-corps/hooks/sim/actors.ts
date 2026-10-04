import { SLAYER_WIDTH } from './constants'
import type { Actor, ActorMode, Attack, SlayerName } from './types'

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

export function formationIndex(name: SlayerName): number {
  return FORMATION.indexOf(name)
}

export function laneFor(width: number): number {
  return formationX({ index: FORMATION.length - 1, width }) + SLAYER_WIDTH + 1
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

export function isAtRest(candidate: Actor): boolean {
  return candidate.mode === 'home' || candidate.mode === 'offstage'
}

export function isBusy(candidate: Actor): boolean {
  return !isAtRest(candidate) && candidate.mode !== 'stagger'
}

export function isWorking(candidate: Actor): boolean {
  return isBusy(candidate) && candidate.attack?.style === 'hit'
}

export function enter(options: { actor: Actor; mode: ActorMode }): void {
  options.actor.mode = options.mode
  options.actor.modeMs = 0
}

function openingMode(attack: Attack): ActorMode {
  if (attack.style === 'doze') {
    return 'doze'
  }
  return attack.style === 'dodge' ? 'hop' : 'dash'
}

export function launch(options: { actor: Actor; attack: Attack }): void {
  options.actor.attack = options.attack
  options.actor.hasStruck = false
  options.actor.lift = 0
  enter({ actor: options.actor, mode: openingMode(options.attack) })
}

export function stagger(target: Actor): void {
  target.attack = undefined
  target.lift = 0
  target.x = target.homeX
  enter({ actor: target, mode: 'stagger' })
}

export function interruptSparring(actors: readonly Actor[]): void {
  actors.forEach(candidate => {
    const isSparring = candidate.attack !== undefined && candidate.attack.style !== 'hit'
    if (isSparring && (candidate.mode === 'dash' || candidate.mode === 'strike' || candidate.mode === 'doze')) {
      candidate.lift = 0
      enter({ actor: candidate, mode: 'return' })
    }
  })
}
