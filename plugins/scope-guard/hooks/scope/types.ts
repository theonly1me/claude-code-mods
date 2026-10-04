export type ScopeMode = 'ask' | 'flag' | 'off'

export type Verdict = 'in-scope' | 'mild' | 'clear'

export type SignalKind = 'unmentioned' | 'outside' | 'delete' | 'move' | 'many-files' | 'rewrite'

export type Signal = { kind: SignalKind; weight: number; text: string }

export type ChangeKind = 'edit' | 'create' | 'write' | 'delete' | 'move'

export type Change = {
  kind: ChangeKind
  tool: string
  paths: readonly string[]
  removedLines: number
  replacedShare: number
  originalLines: number
}

export type Assessment = { signals: readonly Signal[]; score: number }

export type Decision = { verdict: Verdict; reason: string; isConfirmed: boolean }

export type FlagStatus = 'open' | 'pulled' | 'fine' | 'allowed' | 'stopped' | 'asked' | 'dropped'

export type Flag = {
  id: number
  path: string
  folder: string
  action: string
  reason: string
  status: FlagStatus
}

export type ScopeSettings = { mode: ScopeMode; confirmModel: string; manyFiles: number }

export type BandChoice = 'pull' | 'fine' | 'folder'
