export type MonsterKind = 'codex' | 'gemini' | 'chatgpt'

export type KillTally = { codex: number; gemini: number; chatgpt: number }

export type KillEvent = { kind: MonsterKind; isElite: boolean }

export type MonsterPlan = { kind: MonsterKind; isElite: boolean; label: string }

export type Monster = {
  id: number
  kind: MonsterKind
  isElite: boolean
  isAmbient: boolean
  label: string
  x: number
  hitsRemaining: number
  isDoomed: boolean
  phase: 'alive' | 'dying'
  phaseMs: number
  flashMs: number
  walkMs: number
}

export type SamuraiMode = 'train' | 'dash' | 'slash' | 'return' | 'cheer'

export type Activity = 'kata' | 'meditate' | 'duel' | 'guard'

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
  activity: Activity
}

export type DuelPhase = 'enter' | 'exchange' | 'finish' | 'leave'

export type Duel = {
  phase: DuelPhase
  phaseMs: number
  rivalX: number
  exchange: number
  exchanges: number
  isWin: boolean
  isRetreat: boolean
  struckExchange: number
  hasFinishStruck: boolean
}

export type EffectKind = 'hit' | 'clang' | 'dust' | 'flurry' | 'ki'

export type Effect = { kind: EffectKind; x: number; y: number; ageMs: number }

export type StrikeOutcome = 'killed' | 'parried'
