import { compact } from './trace'
import type { Decision, LensTab, LensTurn, Rule, ToolOutcome } from './types'

const MAX_TURNS = 20
const MIN_NARRATION_FOR_ANALYSIS = 160

type Lens = {
  turns: LensTurn[]
  currentId: number | undefined
  selectedId: number | undefined
  isFollowing: boolean
  tab: LensTab
  rules: Rule[]
  project: string
  helperModel: string
  isAnalysisOn: boolean
  nextId: number
}

const lens: Lens = {
  turns: [],
  currentId: undefined,
  selectedId: undefined,
  isFollowing: true,
  tab: 'decisions',
  rules: [],
  project: '',
  helperModel: 'haiku',
  isAnalysisOn: true,
  nextId: 1,
}

export function configureLens(options: { helperModel: string; isAnalysisOn: boolean }): void {
  lens.helperModel = options.helperModel
  lens.isAnalysisOn = options.isAnalysisOn
}

export function lensView(): Readonly<Lens> {
  return lens
}

export function currentTurn(): LensTurn | undefined {
  return lens.turns.find(turn => turn.id === lens.currentId)
}

export function selectedTurn(): LensTurn | undefined {
  return lens.turns.find(turn => turn.id === lens.selectedId) ?? lens.turns.at(-1)
}

export function startLensTurn(options: { turnId: string; prompt: string }): void {
  const turn: LensTurn = {
    id: lens.nextId,
    turnId: options.turnId,
    prompt: compact(options.prompt),
    trace: [],
    answer: '',
    status: 'recording',
    decisions: [],
  }
  lens.nextId += 1
  lens.turns = [...lens.turns, turn].slice(-MAX_TURNS)
  lens.currentId = turn.id
}

export function noteNarration(options: { kind: 'said' | 'thought'; text: string }): void {
  const text = compact(options.text)
  if (text !== '') {
    currentTurn()?.trace.push({ kind: options.kind, text, toolUseId: '', outcome: 'ok' })
  }
}

export function noteToolStart(options: { toolUseId: string; summary: string }): void {
  currentTurn()?.trace.push({ kind: 'tool', text: compact(options.summary), toolUseId: options.toolUseId, outcome: 'running' })
}

export function noteToolEnd(options: { toolUseId: string; outcome: ToolOutcome }): void {
  const entry = currentTurn()?.trace.find(candidate => candidate.toolUseId === options.toolUseId)
  if (entry) {
    entry.outcome = options.outcome
  }
}

export function completeLensTurn(options: { answer: string }): LensTurn | undefined {
  const turn = currentTurn()
  if (!turn) {
    return undefined
  }
  turn.answer = compact(options.answer)
  const narration = turn.trace.filter(entry => entry.kind !== 'tool').reduce((sum, entry) => sum + entry.text.length, 0)
  const hasTools = turn.trace.some(entry => entry.kind === 'tool')
  const isWorthAnalyzing = hasTools || narration + turn.answer.length >= MIN_NARRATION_FOR_ANALYSIS
  turn.status = lens.isAnalysisOn && isWorthAnalyzing ? 'waiting' : 'skipped'
  lens.currentId = undefined
  if (lens.isFollowing) {
    lens.selectedId = turn.id
  }
  return turn
}

export function nextAnalysis(): LensTurn | undefined {
  const turn = lens.turns.find(candidate => candidate.status === 'waiting')
  if (turn) {
    turn.status = 'running'
  }
  return turn
}

export function finishAnalysis(options: { id: number; decisions: Decision[] | null }): void {
  const turn = lens.turns.find(candidate => candidate.id === options.id)
  if (turn) {
    turn.decisions = options.decisions ?? []
    turn.status = options.decisions ? 'ready' : 'failed'
  }
}

export function moveSelection(step: number): void {
  const current = selectedTurn()
  const index = current ? lens.turns.indexOf(current) : lens.turns.length - 1
  const target = lens.turns[Math.min(lens.turns.length - 1, Math.max(0, index + step))]
  if (target) {
    lens.selectedId = target.id
    lens.isFollowing = target === lens.turns.at(-1)
  }
}

export function followLatest(): void {
  lens.isFollowing = true
  lens.selectedId = lens.turns.at(-1)?.id
}

export function showTab(tab: LensTab): void {
  lens.tab = tab
}

export function findDecision(options: { turnId: number; decisionId: number }): Decision | undefined {
  return lens.turns.find(turn => turn.id === options.turnId)?.decisions.find(decision => decision.id === options.decisionId)
}

export function markAsking(options: { turnId: number; decisionId: number }): Decision | undefined {
  const decision = findDecision(options)
  if (decision) {
    decision.isAsking = true
    decision.explanation = ''
  }
  return decision
}

export function setExplanation(options: { turnId: number; decisionId: number; text: string }): void {
  const decision = findDecision(options)
  if (decision) {
    decision.isAsking = false
    decision.explanation = options.text
  }
}

export function setRules(options: { project: string; rules: Rule[] }): void {
  lens.project = options.project
  lens.rules = options.rules
}

export function replaceRules(rules: Rule[]): void {
  lens.rules = rules
}
