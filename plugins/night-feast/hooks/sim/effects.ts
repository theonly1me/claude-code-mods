import type { Effect, EffectKind } from './types'

export const EFFECT_MS: Record<EffectKind, number> = { poof: 300, spark: 650, fume: 1100, drop: 600, alarm: 900, light: 1000 }

export function createEffects() {
  let effects: Effect[] = []
  let count = 0
  return {
    add(effect: { kind: EffectKind; x: number; y: number }): void {
      count += 1
      effects.push({ ...effect, ageMs: 0, seed: (count * 1.37) % 6.28 })
    },
    advance(dtMs: number): void {
      effects.forEach(effect => {
        effect.ageMs += dtMs
      })
      effects = effects.filter(effect => effect.ageMs < EFFECT_MS[effect.kind])
    },
    list(): readonly Effect[] {
      return effects
    },
  }
}
