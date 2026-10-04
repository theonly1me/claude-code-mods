import type { Effect, EffectKind } from './types'

export const EFFECT_MS: Record<EffectKind, number> = { poof: 300, spark: 650, fume: 1100, drop: 600 }

export function advanceEffects(options: { effects: Effect[]; dtMs: number }): Effect[] {
  options.effects.forEach(effect => {
    effect.ageMs += options.dtMs
  })
  return options.effects.filter(effect => effect.ageMs < EFFECT_MS[effect.kind])
}
