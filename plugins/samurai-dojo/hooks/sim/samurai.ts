import {
  CHEER_MS,
  DASH_SPEED_PIXELS_PER_SECOND,
  HOME_X,
  IMPACT_PROGRESS,
  RETURN_SPEED_PIXELS_PER_SECOND,
  SLASH_MS,
  STRIKE_REACH,
} from './constants'
import type { Monster, Samurai, SamuraiMode } from './types'

export type SamuraiStep = { didImpact: boolean; didStartDash: boolean }

export function createSamurai(): Samurai {
  return {
    x: HOME_X,
    mode: 'train',
    modeMs: 0,
    trainingMs: 0,
    clockMs: 0,
    hurtMs: 0,
    variant: 'down',
    hasStruck: false,
    isCheerRequested: false,
  }
}

function enter(options: { samurai: Samurai; mode: SamuraiMode }): void {
  options.samurai.mode = options.mode
  options.samurai.modeMs = 0
}

function startSlash(samurai: Samurai): void {
  samurai.variant = samurai.variant === 'down' ? 'up' : 'down'
  samurai.hasStruck = false
  enter({ samurai, mode: 'slash' })
}

export function advanceSamurai(options: {
  samurai: Samurai
  dtMs: number
  target: Monster | undefined
}): SamuraiStep {
  const { samurai, dtMs, target } = options
  const step: SamuraiStep = { didImpact: false, didStartDash: false }
  samurai.modeMs += dtMs
  samurai.clockMs += dtMs
  samurai.hurtMs = Math.max(0, samurai.hurtMs - dtMs)

  if (samurai.mode === 'train') {
    samurai.trainingMs += dtMs
    if (target) {
      enter({ samurai, mode: 'dash' })
      step.didStartDash = true
    } else if (samurai.isCheerRequested) {
      samurai.isCheerRequested = false
      enter({ samurai, mode: 'cheer' })
    }
  } else if (samurai.mode === 'dash') {
    if (!target) {
      enter({ samurai, mode: 'return' })
    } else {
      const stopX = target.x - STRIKE_REACH
      samurai.x = Math.min(stopX, samurai.x + (DASH_SPEED_PIXELS_PER_SECOND * dtMs) / 1000)
      if (samurai.x >= stopX) {
        startSlash(samurai)
      }
    }
  } else if (samurai.mode === 'slash') {
    if (!samurai.hasStruck && samurai.modeMs >= SLASH_MS * IMPACT_PROGRESS) {
      samurai.hasStruck = true
      step.didImpact = true
    }
    if (samurai.modeMs >= SLASH_MS) {
      enter({ samurai, mode: target ? 'dash' : 'return' })
    }
  } else if (samurai.mode === 'return') {
    if (target) {
      enter({ samurai, mode: 'dash' })
      step.didStartDash = true
    } else {
      samurai.x = Math.max(HOME_X, samurai.x - (RETURN_SPEED_PIXELS_PER_SECOND * dtMs) / 1000)
      if (samurai.x <= HOME_X) {
        samurai.trainingMs = 0
        enter({ samurai, mode: 'train' })
      }
    }
  } else if (samurai.mode === 'cheer') {
    if (target) {
      enter({ samurai, mode: 'dash' })
      step.didStartDash = true
    } else if (samurai.modeMs >= CHEER_MS) {
      samurai.trainingMs = 0
      enter({ samurai, mode: 'train' })
    }
  }
  return step
}
