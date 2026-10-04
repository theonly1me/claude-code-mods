import { CASTLE_WIDTH, CRUISE_SPEED_PIXELS_PER_SECOND, HOME_X } from './constants'
import { glide, land, moveStage, quietStep, takeOff, walkToward } from './moves'
import type { StepResult } from './moves'
import type { Activity, Vampire, Villager } from './types'
import { enter } from './vampire'

export const ROOST_LIFT = 7
const SWOOP_MS = 6400
const SURVEY_MS = 3600
const HIDE_MS = 4800
const LOOK_MS = 1200
const SPOT_MS = 6500
const CHASE_LIMIT_MS = 7000
const HOVER_MS = 800

type StepInput = { vampire: Vampire; activity: Activity; dtMs: number; villagers: readonly Villager[]; width: number }

function busy(): StepResult {
  return { step: quietStep(), isDone: false }
}

function done(options: { vampire: Vampire; didTransform: boolean }): StepResult {
  land(options.vampire)
  return { step: { ...quietStep(), didTransform: options.didTransform }, isDone: true }
}

function transformed(): StepResult {
  return { step: { ...quietStep(), didTransform: true }, isDone: false }
}

function stepOnFoot(input: StepInput): StepResult {
  const { vampire, activity, dtMs } = input
  const isShadow = activity.kind === 'shadow'
  if (activity.stage === 0) {
    if (vampire.mode !== 'stalking') {
      enter({ vampire, mode: 'stalking' })
    }
    if (walkToward({ vampire, x: activity.goalX, dtMs })) {
      enter({ vampire, mode: isShadow ? 'hiding' : 'stalking' })
      moveStage({ activity, stage: 1, vampire })
    }
    return busy()
  }
  if (activity.stage === 1) {
    if (!isShadow) {
      vampire.facing = Math.floor(activity.stageMs / 400) % 2 === 0 ? -1 : 1
    }
    if (activity.stageMs >= (isShadow ? HIDE_MS : LOOK_MS)) {
      enter({ vampire, mode: 'stalking' })
      moveStage({ activity, stage: 2, vampire, goalX: HOME_X })
    }
    return busy()
  }
  return walkToward({ vampire, x: HOME_X, dtMs }) ? done({ vampire, didTransform: false }) : busy()
}

function stepPerch(input: StepInput): StepResult {
  const { vampire, activity, dtMs } = input
  if (activity.stage === 0) {
    takeOff({ activity, stage: 1, vampire })
    return transformed()
  }
  if (activity.stage === 1 && glide({ vampire, activity, dtMs, fromLift: 0, toLift: ROOST_LIFT })) {
    vampire.lift = ROOST_LIFT
    enter({ vampire, mode: 'roosting' })
    moveStage({ activity, stage: 2, vampire })
  } else if (activity.stage === 2 && activity.stageMs >= SURVEY_MS) {
    takeOff({ activity, stage: 3, vampire, goalX: HOME_X })
  } else if (activity.stage === 3 && glide({ vampire, activity, dtMs, fromLift: ROOST_LIFT, toLift: 0 })) {
    return done({ vampire, didTransform: true })
  }
  return busy()
}

function stepSwoop(input: StepInput): StepResult {
  const { vampire, activity } = input
  if (activity.stage === 0) {
    takeOff({ activity, stage: 1, vampire })
    return transformed()
  }
  const progress = Math.min(1, activity.stageMs / SWOOP_MS)
  const span = Math.max(8, input.width - CASTLE_WIDTH - 8 - HOME_X)
  vampire.x = HOME_X + (span * (1 - Math.cos(progress * Math.PI * 2))) / 2
  vampire.facing = Math.sin(progress * Math.PI * 2) >= 0 ? 1 : -1
  vampire.lift = 4.5 - 3.5 * Math.cos(progress * Math.PI * 6)
  return progress >= 1 ? done({ vampire, didTransform: true }) : busy()
}

function stepChase(input: StepInput): StepResult {
  const { vampire, activity, dtMs } = input
  const prey = input.villagers.find(villager => villager.id === activity.preyId)
  if (activity.stage === 0) {
    enter({ vampire, mode: 'hiding' })
    moveStage({ activity, stage: 1, vampire })
    return { step: { ...quietStep(), wantsPrey: true }, isDone: false }
  }
  if (activity.stage === 1) {
    if (prey && (prey.x - vampire.x > 10 || activity.stageMs >= SPOT_MS)) {
      takeOff({ activity, stage: 2, vampire })
      return { step: { ...quietStep(), didTransform: true, scareId: prey.id }, isDone: false }
    }
    return !prey && activity.stageMs >= SPOT_MS ? done({ vampire, didTransform: false }) : busy()
  }
  if (activity.stage === 2) {
    if (!prey || activity.stageMs >= CHASE_LIMIT_MS) {
      moveStage({ activity, stage: 3, vampire })
      return busy()
    }
    const gap = prey.x - 4 - vampire.x
    const travel = (CRUISE_SPEED_PIXELS_PER_SECOND * 0.8 * dtMs) / 1000
    vampire.facing = gap >= 0 ? 1 : -1
    vampire.x += Math.abs(gap) > 6 ? Math.sign(gap) * Math.min(Math.abs(gap) - 6, travel) : 0
    vampire.lift = 3 + Math.sin(vampire.clockMs / 150) * 1.2
    return busy()
  }
  if (activity.stage === 3) {
    vampire.lift = 4 + Math.sin(vampire.clockMs / 110)
    vampire.facing = Math.floor(activity.stageMs / 250) % 2 === 0 ? 1 : -1
    if (activity.stageMs >= HOVER_MS) {
      takeOff({ activity, stage: 4, vampire, goalX: HOME_X })
    }
    return busy()
  }
  return glide({ vampire, activity, dtMs, fromLift: 4, toLift: 0 }) ? done({ vampire, didTransform: true }) : busy()
}

export function stepActivity(input: StepInput): StepResult {
  const { kind } = input.activity
  if (kind === 'stalk' || kind === 'shadow') {
    return stepOnFoot(input)
  }
  if (kind === 'perch') {
    return stepPerch(input)
  }
  return kind === 'swoop' ? stepSwoop(input) : stepChase(input)
}
