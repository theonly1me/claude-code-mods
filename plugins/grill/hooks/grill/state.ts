import { DEFAULT_HELPER_MODEL } from './helper'
import type { Helper } from './helper'
import type { Answer, ChatMessage, GrillMode, Job, Question, Round, RoundMode } from './types'

const MIN_WORDS = 8
const MAX_CHAT = 40

type Grill = {
  mode: GrillMode
  round: Round | undefined
  isWorking: boolean
  jobs: Job[]
  chat: ChatMessage[]
  isChatThinking: boolean
  lastTask: string
  helper: Helper
  nextRoundId: number
}

const grill: Grill = {
  mode: 'grill',
  round: undefined,
  isWorking: false,
  jobs: [],
  chat: [],
  isChatThinking: false,
  lastTask: '',
  helper: { helperModel: DEFAULT_HELPER_MODEL, helperEffort: 'medium' },
  nextRoundId: 1,
}

export function grillView(): Readonly<Grill> {
  return grill
}

export function configureGrill(helper: Helper): void {
  grill.helper = helper
}

export function setMode(mode: GrillMode): void {
  grill.mode = mode
}

export function setWorking(isWorking: boolean): void {
  grill.isWorking = isWorking
}

export function isTaskPrompt(text: string): boolean {
  const trimmed = text.trim()
  return !trimmed.startsWith('/') && trimmed.split(/\s+/).filter(Boolean).length >= MIN_WORDS
}

export function rememberTask(text: string): void {
  grill.lastTask = text
}

export function startRound(options: { prompt: string; mode: RoundMode }): Round {
  const round: Round = {
    id: grill.nextRoundId,
    mode: options.mode,
    prompt: options.prompt,
    status: 'thinking',
    questions: [],
    index: 0,
    answers: [],
  }
  grill.nextRoundId += 1
  grill.round = round
  grill.lastTask = options.prompt
  grill.jobs = [...grill.jobs.filter(job => job.kind !== 'round'), { kind: 'round', roundId: round.id }]
  return round
}

export function setQuestions(options: { roundId: number; questions: Question[] | null }): void {
  const round = grill.round
  if (!round || round.id !== options.roundId) {
    return
  }
  round.questions = options.questions ?? []
  round.status = options.questions && options.questions.length > 0 ? 'ready' : 'failed'
}

export function currentQuestion(): Question | undefined {
  const round = grill.round
  return round && round.status === 'ready' ? round.questions[round.index] : undefined
}

function advance(round: Round): void {
  round.index += 1
  if (round.index >= round.questions.length) {
    round.status = 'done'
  }
}

export function answerCurrent(options: { answer: string; isDelivered: boolean }): Answer | undefined {
  const round = grill.round
  const question = currentQuestion()
  if (!round || !question) {
    return undefined
  }
  const answer: Answer = { question: question.text, answer: options.answer, mode: round.mode, isDelivered: options.isDelivered }
  round.answers.push(answer)
  advance(round)
  return answer
}

export function skipCurrent(): void {
  if (grill.round && currentQuestion()) {
    advance(grill.round)
  }
}

export function dismissRound(): void {
  grill.round = undefined
}

export function undeliveredAnswers(): Answer[] {
  return grill.round ? grill.round.answers.filter(answer => !answer.isDelivered) : []
}

export function markUndelivered(answer: Answer): void {
  answer.isDelivered = false
}

export function markAllDelivered(): void {
  grill.round?.answers.forEach(answer => {
    answer.isDelivered = true
  })
}

export function addChatMessage(message: ChatMessage): void {
  grill.chat = [...grill.chat, message].slice(-MAX_CHAT)
  if (message.role === 'you') {
    grill.isChatThinking = true
    grill.jobs = [...grill.jobs, { kind: 'chat' }]
  } else {
    grill.isChatThinking = false
  }
}

export function queueShare(): void {
  grill.jobs = [...grill.jobs, { kind: 'share' }]
}

export function takeJob(): Job | undefined {
  const [job, ...rest] = grill.jobs
  grill.jobs = rest
  return job
}
