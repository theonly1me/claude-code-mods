export type GrillMode = 'grill' | 'brainstorm' | 'off'

export type RoundMode = 'grill' | 'brainstorm'

export type Question = { text: string; why: string; options: string[] }

export type Answer = { question: string; answer: string; mode: RoundMode; isDelivered: boolean }

export type RoundStatus = 'thinking' | 'ready' | 'failed' | 'done'

export type Round = {
  id: number
  mode: RoundMode
  prompt: string
  status: RoundStatus
  questions: Question[]
  index: number
  answers: Answer[]
}

export type ChatMessage = { role: 'you' | 'partner'; text: string }

export type Job = { kind: 'round'; roundId: number } | { kind: 'chat' } | { kind: 'share' }
