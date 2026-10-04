export type EditStatus = 'applied' | 'failed' | 'denied'

export type EditSource = 'Edit' | 'Write' | 'NotebookEdit' | 'Command'

export type Hunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

export type EditEntry = {
  id: number
  turn: number
  source: EditSource
  path: string
  status: EditStatus
  added: number
  removed: number
  reason: string
  isReasonInferred: boolean
  note: string
  at: number
  hunks: Hunk[]
  hunkCount: number
}

export type TestRun = {
  id: number
  turn: number
  command: string
  isPassing: boolean
  at: number
}

export type FlowStep = { text: string; isChanged: boolean; editIds: number[] }

export type EditReason = { id: number; why: string }

export type TurnSummary = {
  title: string
  explanation: string
  before: FlowStep[]
  after: FlowStep[]
  editReasons: EditReason[]
}

export type SummaryStatus = 'off' | 'waiting' | 'running' | 'ready' | 'failed'

export type TurnEntry = {
  index: number
  prompt: string
  startedAt: number
  endedAt: number | null
  summaryStatus: SummaryStatus
  summary: TurnSummary | null
}

export type JournalSettings = {
  liveSummaries: boolean
  helperModel: string
  autoOpen: boolean
}

export type PendingWrites = {
  edits: { id: number; text: string }[]
  data: string | undefined
}
