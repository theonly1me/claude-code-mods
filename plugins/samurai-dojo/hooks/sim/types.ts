export type MonsterKind = 'codex' | 'gemini'

export type KillTally = { codex: number; gemini: number }

export type KillEvent = { kind: MonsterKind; isElite: boolean }

export type MonsterPlan = { kind: MonsterKind; isElite: boolean }

export type Monster = {
  id: number
  kind: MonsterKind
  isElite: boolean
  x: number
  hitsRemaining: number
  isDoomed: boolean
  phase: 'alive' | 'dying'
  phaseMs: number
  flashMs: number
  walkMs: number
}

export type SamuraiMode = 'train' | 'dash' | 'slash' | 'return' | 'cheer'

export type SlashVariant = 'down' | 'up'

export type Samurai = {
  x: number
  mode: SamuraiMode
  modeMs: number
  trainingMs: number
  clockMs: number
  hurtMs: number
  variant: SlashVariant
  hasStruck: boolean
  isCheerRequested: boolean
}

export type EffectKind = 'hit' | 'clang' | 'dust' | 'flurry'

export type Effect = { kind: EffectKind; x: number; y: number; ageMs: number }

export type StrikeOutcome = 'killed' | 'parried'
