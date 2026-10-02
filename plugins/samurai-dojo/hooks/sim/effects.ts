import type { Color } from '../render/bitmap'
import type { Effect, EffectKind } from './types'

export type EffectStyle = {
  durationMs: number
  reach: number
  colors: readonly Color[]
  anglesDegrees: readonly number[]
}

const ALL_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315]
const UPWARD_DIRECTIONS = [-160, -110, -70, -20]

export const EFFECT_STYLES: Record<EffectKind, EffectStyle> = {
  hit: {
    durationMs: 300,
    reach: 8,
    colors: [0xffffff, 0x6fe3f5, 0x3b7dd8],
    anglesDegrees: ALL_DIRECTIONS,
  },
  clang: {
    durationMs: 260,
    reach: 6,
    colors: [0xfff3b0, 0xf2c14e, 0xd97757],
    anglesDegrees: ALL_DIRECTIONS,
  },
  dust: {
    durationMs: 360,
    reach: 4,
    colors: [0xc9b79c, 0x8b7355],
    anglesDegrees: UPWARD_DIRECTIONS,
  },
}

export function advanceEffects(options: { effects: Effect[]; dtMs: number }): Effect[] {
  options.effects.forEach(effect => {
    effect.ageMs += options.dtMs
  })
  return options.effects.filter(effect => effect.ageMs < EFFECT_STYLES[effect.kind].durationMs)
}
