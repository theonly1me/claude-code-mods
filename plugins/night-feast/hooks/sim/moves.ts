import { CRUISE_SPEED_PIXELS_PER_SECOND, STALK_SPEED_PIXELS_PER_SECOND } from './constants'
import type { Activity, ActivityKind, Vampire } from './types'
import { enter } from './vampire'

export type AmbientStep = {
  didTransform: boolean
  started: ActivityKind | undefined
  wantsPrey: boolean
  scareId: number | undefined
}

export type StepResult = { step: AmbientStep; isDone: boolean }

export const ACTIVITY_LINES: Record<ActivityKind, string> = {
  stalk: 'The vampire stalks down the lane',
  perch: 'Perched on the castle tower, watching the village',
  swoop: 'Swooping low over the rooftops',
  shadow: 'Hiding in the shadows by the cottages',
  chase: 'Lying in wait for a lantern bearer',
}

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  stalk: 'stalking the lane',
  perch: 'on the tower',
  swoop: 'swooping',
  shadow: 'in the shadows',
  chase: 'lying in wait',
}

export function describeDoing(options: { activity: Activity | undefined; vampire: Vampire }): string {
  if (options.activity) {
    return ACTIVITY_LABELS[options.activity.kind]
  }
  const { mode } = options.vampire
  if (mode === 'flying' || mode === 'feeding') {
    return 'feeding'
  }
  return mode === 'perched' ? 'at the castle' : 'watching the street'
}

export function quietStep(): AmbientStep {
  return { didTransform: false, started: undefined, wantsPrey: false, scareId: undefined }
}

export function walkToward(options: { vampire: Vampire; x: number; dtMs: number }): boolean {
  const { vampire } = options
  const distance = options.x - vampire.x
  const travel = (STALK_SPEED_PIXELS_PER_SECOND * options.dtMs) / 1000
  if (distance !== 0) {
    vampire.facing = distance > 0 ? 1 : -1
  }
  vampire.x += Math.sign(distance) * Math.min(Math.abs(distance), travel)
  return Math.abs(options.x - vampire.x) < 0.5
}

export function glide(options: { vampire: Vampire; activity: Activity; dtMs: number; fromLift: number; toLift: number }): boolean {
  const { vampire, activity } = options
  const distance = activity.goalX - vampire.x
  const travel = (CRUISE_SPEED_PIXELS_PER_SECOND * options.dtMs) / 1000
  if (distance !== 0) {
    vampire.facing = distance > 0 ? 1 : -1
  }
  vampire.x += Math.sign(distance) * Math.min(Math.abs(distance), travel)
  const total = Math.max(1, Math.abs(activity.goalX - activity.originX))
  const progress = 1 - Math.abs(activity.goalX - vampire.x) / total
  const bob = Math.sin(vampire.clockMs / 120) * 0.6
  vampire.lift = options.fromLift + (options.toLift - options.fromLift) * progress + bob
  return Math.abs(activity.goalX - vampire.x) < 0.5
}

export function moveStage(options: { activity: Activity; stage: number; vampire: Vampire; goalX?: number }): void {
  options.activity.stage = options.stage
  options.activity.stageMs = 0
  options.activity.originX = options.vampire.x
  options.activity.goalX = options.goalX ?? options.activity.goalX
}

export function takeOff(options: { activity: Activity; stage: number; vampire: Vampire; goalX?: number }): void {
  enter({ vampire: options.vampire, mode: 'cruising' })
  moveStage(options)
}

export function land(vampire: Vampire): void {
  vampire.lift = 0
  vampire.facing = 1
  enter({ vampire, mode: 'idle' })
}
