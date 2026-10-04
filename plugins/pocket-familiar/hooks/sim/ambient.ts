import { butterflyAt, progressOf, yarnAt } from './ambientPaths'
import { FOX_X } from './constants'
import { growthOf } from './growth'
import { pushLog } from './log'
import type { AmbientKind, AmbientState, FamiliarState } from './types'

export const AMBIENT_KINDS: readonly [AmbientKind, ...AmbientKind[]] = [
  'butterfly',
  'leaf',
  'yarn',
  'tail',
  'groom',
  'dig',
  'stretch',
  'stars',
  'nap',
]

const DURATION_MS: Record<AmbientKind, number> = {
  butterfly: 6400,
  leaf: 4200,
  yarn: 6000,
  tail: 3600,
  groom: 3200,
  dig: 4800,
  stretch: 2800,
  stars: 4600,
  nap: 5200,
}

export const AMBIENT_LOG: Record<AmbientKind, string> = {
  butterfly: 'Chased a butterfly',
  leaf: 'Pounced on a falling leaf',
  yarn: 'Batted a ball of yarn',
  tail: 'Chased its own tail',
  groom: 'Groomed its fur',
  dig: 'Dug up a shiny pebble',
  stretch: 'Stretched and yawned',
  stars: 'Watched the sky',
  nap: 'Took a short nap',
}

export const AMBIENT_NOW: Record<AmbientKind, string> = {
  butterfly: 'chasing a butterfly',
  leaf: 'pouncing on a leaf',
  yarn: 'batting yarn',
  tail: 'chasing its tail',
  groom: 'grooming',
  dig: 'digging',
  stretch: 'stretching',
  stars: 'watching the sky',
  nap: 'napping',
}

const LOOK_MS = 700
const HOME_PER_SECOND = 36
const SPOT_DISTANCE = 14

export function createAmbient(seed: number): AmbientState {
  return { kind: 'look', ms: 0, durationMs: LOOK_MS, foxX: FOX_X, fromX: FOX_X, targetX: FOX_X, seed, last: undefined, count: 0 }
}

function nextRandom(ambient: AmbientState): number {
  ambient.seed = (Math.imul(ambient.seed, 1664525) + 1013904223) >>> 0
  return ambient.seed / 4294967296
}

export function foxRange(width: number): { min: number; max: number } {
  const min = 3
  return { min, max: Math.max(min, width - 32) }
}

export function isAmbientAllowed(state: FamiliarState): boolean {
  return (
    !state.isSleeping &&
    !state.isTurnRunning &&
    state.runningTools === 0 &&
    state.hopMs <= 0 &&
    state.worriedMs <= 0 &&
    state.bubble === undefined &&
    growthOf(state.lifetimeXp).form !== 'egg'
  )
}

function moveToward(options: { ambient: AmbientState; target: number; perSecond: number; dtMs: number }): void {
  const { ambient, target } = options
  const step = (options.perSecond * options.dtMs) / 1000
  const distance = target - ambient.foxX
  ambient.foxX = Math.abs(distance) <= step ? target : ambient.foxX + Math.sign(distance) * step
}

function spotAwayFrom(options: { ambient: AmbientState; min: number; max: number }): number {
  const { ambient, min, max } = options
  const spot = min + nextRandom(ambient) * (max - min)
  if (Math.abs(spot - ambient.foxX) >= SPOT_DISTANCE) {
    return spot
  }
  return ambient.foxX + SPOT_DISTANCE <= max ? ambient.foxX + SPOT_DISTANCE : Math.max(min, ambient.foxX - SPOT_DISTANCE)
}

export function startAmbient(options: { state: FamiliarState; kind: AmbientKind }): void {
  const { state, kind } = options
  const ambient = state.ambient
  const { min, max } = foxRange(state.width)
  ambient.kind = kind
  ambient.ms = 0
  ambient.durationMs = DURATION_MS[kind]
  ambient.fromX = ambient.foxX
  ambient.last = kind
  ambient.count += 1
  ambient.targetX = kind === 'leaf' || kind === 'dig' ? spotAwayFrom({ ambient, min, max }) : ambient.foxX
  pushLog({ log: state.log, text: AMBIENT_LOG[kind] })
}

function chooseNext(state: FamiliarState): AmbientKind {
  const ambient = state.ambient
  const choices = AMBIENT_KINDS.filter(kind => kind !== ambient.last)
  return choices[Math.floor(nextRandom(ambient) * choices.length)] ?? 'groom'
}

function steer(options: { state: FamiliarState; dtMs: number }): void {
  const { state, dtMs } = options
  const ambient = state.ambient
  const progress = progressOf(ambient)
  if (ambient.kind === 'butterfly') {
    moveToward({ ambient, target: butterflyAt({ ambient, width: state.width }).x - 14, perSecond: 22, dtMs })
  } else if (ambient.kind === 'yarn') {
    moveToward({ ambient, target: yarnAt(ambient).x - 12, perSecond: 26, dtMs })
  } else if (ambient.kind === 'dig' && progress < 0.3) {
    moveToward({ ambient, target: ambient.targetX, perSecond: 26, dtMs })
  } else if (ambient.kind === 'leaf' && progress >= 0.45 && progress < 0.65) {
    const amount = (progress - 0.45) / 0.2
    ambient.foxX = ambient.fromX + (ambient.targetX - ambient.fromX) * amount
  } else if (ambient.kind === 'leaf' && progress >= 0.65) {
    ambient.foxX = ambient.targetX
  }
  const { min, max } = foxRange(state.width)
  ambient.foxX = Math.min(max, Math.max(min, ambient.foxX))
}

export function advanceAmbient(options: { state: FamiliarState; dtMs: number }): void {
  const { state, dtMs } = options
  const ambient = state.ambient
  if (!isAmbientAllowed(state)) {
    ambient.kind = 'look'
    ambient.ms = 0
    ambient.durationMs = LOOK_MS
    moveToward({ ambient, target: FOX_X, perSecond: HOME_PER_SECOND, dtMs })
    return
  }
  ambient.ms += dtMs
  if (ambient.ms >= ambient.durationMs) {
    if (ambient.kind === 'look') {
      startAmbient({ state, kind: chooseNext(state) })
    } else {
      ambient.kind = 'look'
      ambient.ms = 0
      ambient.durationMs = LOOK_MS
    }
  }
  steer({ state, dtMs })
}
