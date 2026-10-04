export type SlopKind =
  | 'dash'
  | 'comment-block'
  | 'restating-comment'
  | 'slop-test'
  | 'ai-phrase'
  | 'emoji'
  | 'needless-code'

export type FindingSource = 'rules' | 'model'

export type FindingStatus = 'open' | 'removed'

export type Segment = { startLine: number | undefined; lines: readonly string[] }

export type Candidate = {
  kind: SlopKind
  line: number | undefined
  excerpt: string
  advice: string
  snapshot?: string
}

export type Finding = Candidate & {
  id: number
  path: string
  absolutePath: string
  source: FindingSource
  status: FindingStatus
  isNotified: boolean
  turn: number
}

export type DetectJob = {
  path: string
  absolutePath: string
  addedLines: readonly string[]
  turn: number
}

export type FileFamily = 'slash' | 'hash' | 'double-dash' | 'prose' | 'other'
