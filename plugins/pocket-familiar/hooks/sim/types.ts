export type Stats = { fullness: number; joy: number; energy: number }

export type Activity = 'idle' | 'read' | 'edit' | 'test' | 'thinking'

export type ToolKind = 'read' | 'edit' | 'test' | 'other'

export type BubbleGlyph = 'alert' | 'question' | 'heart' | 'note' | 'sleep'

export type Bubble = { glyph: BubbleGlyph; ageMs: number }

export type GrowthForm = 'egg' | 'kit' | 'fox'

export type Growth = { form: GrowthForm; tails: number; title: string; minimumXp: number }

export type Mood = 'asleep' | 'needs a break' | 'worried' | 'hungry' | 'tired' | 'happy' | 'content'

export type EyeState = 'open' | 'shut' | 'happy'

export type AmbientKind = 'butterfly' | 'leaf' | 'yarn' | 'tail' | 'groom' | 'dig' | 'stretch' | 'stars' | 'nap'

export type AmbientPhase = AmbientKind | 'look'

export type AmbientState = {
  kind: AmbientPhase
  ms: number
  durationMs: number
  foxX: number
  fromX: number
  targetX: number
  seed: number
  last: AmbientKind | undefined
  count: number
}

export type LogEntry = { text: string; count: number }

export type FamiliarState = {
  stats: Stats
  lifetimeXp: number
  activity: Activity
  runningTools: number
  isTurnRunning: boolean
  idleMs: number
  isSleeping: boolean
  failureStreak: number
  hasDuck: boolean
  worriedMs: number
  hopMs: number
  bubble: Bubble | undefined
  clockMs: number
  hour: number
  width: number
  ambient: AmbientState
  log: LogEntry[]
  evolutions: Growth[]
}

export type SavedFamiliar = Stats & { lifetimeXp: number; lastSeenAt: number }
