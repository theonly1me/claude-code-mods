import { lerp } from '../shared/pixel/colors'
import {
  ARC_TRAIL_PROGRESS,
  SLASH_MS,
  STRIKE_END,
  STRIKE_START,
} from './constants'
import type { Samurai, SlashVariant } from './types'

export type SamuraiPose = {
  isLowered: boolean
  isSquinting: boolean
  swordAngle: number
  arc: { from: number; to: number } | null
  offsetX: number
  offsetY: number
}

type Segment = readonly [number, number]

const GUARD_ANGLE = -55
const DASH_ANGLE = -8
const CHEER_ANGLE = -80
const BREATH_MS = 420

const SLASH_KEYFRAMES: Record<
  SlashVariant,
  { windup: Segment; strike: Segment; follow: Segment }
> = {
  down: { windup: [-50, -85], strike: [-85, 40], follow: [40, 25] },
  up: { windup: [20, 50], strike: [50, -70], follow: [-70, -55] },
}

const TRAINING_CYCLE: readonly { variant: SlashVariant | null; ms: number }[] = [
  { variant: null, ms: 900 },
  { variant: 'down', ms: SLASH_MS },
  { variant: null, ms: 800 },
  { variant: 'up', ms: SLASH_MS },
  { variant: null, ms: 1000 },
]

function along(options: { segment: Segment; amount: number }): number {
  const [from, to] = options.segment
  return lerp({ from, to, amount: options.amount })
}

function slashAngle(options: { variant: SlashVariant; progress: number }): number {
  const keyframes = SLASH_KEYFRAMES[options.variant]
  const { progress } = options
  if (progress < STRIKE_START) {
    return along({ segment: keyframes.windup, amount: progress / STRIKE_START })
  }
  if (progress < STRIKE_END) {
    const amount = (progress - STRIKE_START) / (STRIKE_END - STRIKE_START)
    return along({ segment: keyframes.strike, amount })
  }
  return along({ segment: keyframes.follow, amount: (progress - STRIKE_END) / (1 - STRIKE_END) })
}

function slashArc(options: {
  variant: SlashVariant
  progress: number
}): { from: number; to: number } | null {
  const to = Math.min(options.progress, STRIKE_END)
  const from = Math.max(STRIKE_START, options.progress - ARC_TRAIL_PROGRESS)
  if (from >= to) {
    return null
  }
  return {
    from: slashAngle({ variant: options.variant, progress: from }),
    to: slashAngle({ variant: options.variant, progress: to }),
  }
}

function slashPose(options: {
  variant: SlashVariant
  progress: number
  base: SamuraiPose
}): SamuraiPose {
  const progress = Math.min(1, Math.max(0, options.progress))
  return {
    ...options.base,
    isLowered: true,
    swordAngle: slashAngle({ variant: options.variant, progress }),
    arc: slashArc({ variant: options.variant, progress }),
  }
}

function trainingPose(options: { samurai: Samurai; base: SamuraiPose }): SamuraiPose {
  const { samurai, base } = options
  const cycleMs = TRAINING_CYCLE.reduce((total, segment) => total + segment.ms, 0)
  let remaining = samurai.trainingMs % cycleMs
  for (const segment of TRAINING_CYCLE) {
    if (remaining < segment.ms) {
      if (segment.variant) {
        return slashPose({ variant: segment.variant, progress: remaining / segment.ms, base })
      }
      break
    }
    remaining -= segment.ms
  }
  const isBreathingIn = Math.floor(samurai.trainingMs / BREATH_MS) % 2 === 1
  return { ...base, isLowered: isBreathingIn }
}

export function samuraiPoseOf(samurai: Samurai): SamuraiPose {
  const isHurt = samurai.hurtMs > 0
  const base: SamuraiPose = {
    isLowered: false,
    isSquinting: isHurt,
    swordAngle: GUARD_ANGLE,
    arc: null,
    offsetX: isHurt ? -2 : 0,
    offsetY: 0,
  }
  if (samurai.mode === 'train') {
    return trainingPose({ samurai, base })
  }
  if (samurai.mode === 'dash') {
    return { ...base, isLowered: true, swordAngle: DASH_ANGLE }
  }
  if (samurai.mode === 'slash') {
    return slashPose({ variant: samurai.variant, progress: samurai.modeMs / SLASH_MS, base })
  }
  if (samurai.mode === 'cheer') {
    return {
      ...base,
      isSquinting: true,
      swordAngle: CHEER_ANGLE,
      offsetY: -Math.round(2 * Math.abs(Math.sin(samurai.modeMs / 110))),
    }
  }
  return base
}
