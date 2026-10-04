import {
  BAT_SPEED_PIXELS_PER_SECOND,
  FEED_MS,
  HOME_X,
  PERCH_MS,
  RECOIL_MS,
  RECOIL_PIXELS,
} from './constants'
import type { Vampire, VampireMode, Villager } from './types'

export type VampireStep = {
  didTransform: boolean
  bittenId: number | undefined
  didFinishFeed: boolean
}

export type FlightPlan = { target: Villager | undefined; perchX: number | undefined }

const FEED_LEFT_GAP = 10
const FEED_RIGHT_GAP = 3
const CRUISE_LIFT = 6

export function createVampire(): Vampire {
  return {
    x: HOME_X,
    lift: 0,
    mode: 'idle',
    modeMs: 0,
    facing: 1,
    targetId: undefined,
    clockMs: 0,
    destinationX: HOME_X,
    landsPerched: false,
  }
}

const AMBIENT_MODES: readonly VampireMode[] = ['stalking', 'hiding', 'cruising', 'roosting']
const BAT_MODES: readonly VampireMode[] = ['flying', 'returning', 'cruising', 'roosting']

export function isBat(vampire: Vampire): boolean {
  return BAT_MODES.includes(vampire.mode)
}

export function isAmbient(vampire: Vampire): boolean {
  return AMBIENT_MODES.includes(vampire.mode)
}

export function enter(options: { vampire: Vampire; mode: VampireMode }): void {
  options.vampire.mode = options.mode
  options.vampire.modeMs = 0
}

function flyToward(options: { vampire: Vampire; x: number; dtMs: number }): boolean {
  const { vampire } = options
  const distance = options.x - vampire.x
  const travel = (BAT_SPEED_PIXELS_PER_SECOND * options.dtMs) / 1000
  vampire.facing = distance >= 0 ? 1 : -1
  vampire.x += Math.sign(distance) * Math.min(Math.abs(distance), travel)
  vampire.lift = CRUISE_LIFT + Math.sin(vampire.clockMs / 120)
  return Math.abs(options.x - vampire.x) < 0.5
}

export function returnTo(options: { vampire: Vampire; x: number; landsPerched: boolean }): void {
  options.vampire.destinationX = options.x
  options.vampire.landsPerched = options.landsPerched
  enter({ vampire: options.vampire, mode: 'returning' })
}

export function recoil(vampire: Vampire): void {
  vampire.lift = 0
  vampire.targetId = undefined
  enter({ vampire, mode: 'recoil' })
}

export function advanceVampire(options: { vampire: Vampire; dtMs: number; plan: FlightPlan; target: Villager | undefined }): VampireStep {
  const { vampire, dtMs, plan } = options
  const step: VampireStep = { didTransform: false, bittenId: undefined, didFinishFeed: false }
  vampire.modeMs += dtMs
  vampire.clockMs += dtMs
  const canHunt =
    vampire.mode === 'idle' || vampire.mode === 'perched' || vampire.mode === 'returning' || isAmbient(vampire)
  if (canHunt && plan.target) {
    step.didTransform = !isBat(vampire)
    vampire.targetId = plan.target.id
    enter({ vampire, mode: 'flying' })
  } else if ((vampire.mode === 'idle' || isAmbient(vampire)) && plan.perchX !== undefined) {
    step.didTransform = !isBat(vampire)
    returnTo({ vampire, x: plan.perchX, landsPerched: true })
  } else if (vampire.mode === 'flying') {
    const target = options.target
    if (!target || target.state !== 'walking') {
      returnTo({ vampire, x: HOME_X, landsPerched: false })
    } else {
      const side = vampire.x <= target.x ? -1 : 1
      const stopX = side === -1 ? target.x - FEED_LEFT_GAP : target.x + FEED_RIGHT_GAP
      if (flyToward({ vampire, x: stopX, dtMs })) {
        vampire.lift = 0
        vampire.facing = side === -1 ? 1 : -1
        enter({ vampire, mode: 'feeding' })
        step.didTransform = true
        step.bittenId = target.id
      }
    }
  } else if (vampire.mode === 'feeding' && vampire.modeMs >= FEED_MS) {
    step.didFinishFeed = true
    vampire.targetId = undefined
    returnTo({ vampire, x: HOME_X, landsPerched: false })
    step.didTransform = true
  } else if (vampire.mode === 'returning' && flyToward({ vampire, x: vampire.destinationX, dtMs })) {
    vampire.lift = 0
    enter({ vampire, mode: vampire.landsPerched ? 'perched' : 'idle' })
    step.didTransform = true
  } else if (vampire.mode === 'recoil') {
    vampire.x -= (vampire.facing * RECOIL_PIXELS * dtMs) / RECOIL_MS
    if (vampire.modeMs >= RECOIL_MS) {
      enter({ vampire, mode: 'idle' })
    }
  } else if (vampire.mode === 'perched' && vampire.modeMs >= PERCH_MS) {
    returnTo({ vampire, x: HOME_X, landsPerched: false })
    step.didTransform = true
  }
  return step
}
