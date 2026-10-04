export type TraceKind = 'said' | 'thought' | 'tool'

export type ToolOutcome = 'running' | 'ok' | 'error' | 'denied'

export type TraceEntry = {
  kind: TraceKind
  text: string
  toolUseId: string
  outcome: ToolOutcome
}

export type Confidence = 'high' | 'medium' | 'low'

export type Decision = {
  id: number
  title: string
  choice: string
  why: string
  alternatives: string[]
  evidence: string
  confidence: Confidence
  keep: string
  avoid: string
  explanation: string
  isAsking: boolean
}

export type AnalysisStatus = 'recording' | 'waiting' | 'running' | 'ready' | 'failed' | 'skipped'

export type LensTurn = {
  id: number
  turnId: string
  prompt: string
  trace: TraceEntry[]
  answer: string
  status: AnalysisStatus
  decisions: Decision[]
}

export type RuleKind = 'keep' | 'avoid'

export type RuleScope = 'project' | 'global'

export type Rule = {
  id: string
  kind: RuleKind
  text: string
  scope: RuleScope
  createdAt: number
}

export type LensTab = 'decisions' | 'rules'
