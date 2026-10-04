import type { Color } from '../shared/pixel/bitmap'
import type { Effect, EffectKind } from './types'

export type EffectStyle = {
  hasFlash: boolean
  durationMs: number
  reach: number
  colors: readonly Color[]
  anglesDegrees: readonly number[]
}

const ALL_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315]
const UPWARD_DIRECTIONS = [-160, -110, -70, -20]
const FLURRY_DIRECTIONS = Array.from({ length: 31 }, (_, step) => -120 + step * 8)

export const EFFECT_STYLES: Record<EffectKind, EffectStyle> = {
  hit: {
    hasFlash: true,
    durationMs: 300,
    reach: 8,
    colors: [0xffffff, 0x6fe3f5, 0x3b7dd8],
    anglesDegrees: ALL_DIRECTIONS,
  },
  clang: {
    hasFlash: true,
    durationMs: 260,
    reach: 6,
    colors: [0xfff3b0, 0xf2c14e, 0xd97757],
    anglesDegrees: ALL_DIRECTIONS,
  },
  dust: {
    hasFlash: false,
    durationMs: 360,
    reach: 4,
    colors: [0xc9b79c, 0x8b7355],
    anglesDegrees: UPWARD_DIRECTIONS,
  },
  flurry: {
    hasFlash: true,
    durationMs: 520,
    reach: 14,
    colors: [0xffffff, 0xfff3b0, 0xf2c14e, 0xd97757],
    anglesDegrees: FLURRY_DIRECTIONS,
  },
  ki: {
    hasFlash: false,
    durationMs: 1500,
    reach: 7,
    colors: [0xe6fbff, 0xa8e8f5, 0x6fc3df, 0x3b7dd8],
    anglesDegrees: [-90],
  },
}

export function advanceEffects(options: { effects: Effect[]; dtMs: number }): Effect[] {
  options.effects.forEach(effect => {
    effect.ageMs += options.dtMs
  })
  return options.effects.filter(effect => effect.ageMs < EFFECT_STYLES[effect.kind].durationMs)
}
