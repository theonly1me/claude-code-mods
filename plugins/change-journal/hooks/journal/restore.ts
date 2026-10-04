import type { EditEntry, EditSource, EditStatus, FlowStep, SummaryStatus, TestRun, TurnEntry, TurnSummary } from './types'

const PREFIX = 'window.__changeJournal = '
const SOURCES: readonly EditSource[] = ['Edit', 'Write', 'NotebookEdit', 'Command']
const STATUSES: readonly EditStatus[] = ['applied', 'failed', 'denied']
const SUMMARY_STATUSES: readonly SummaryStatus[] = ['off', 'waiting', 'running', 'ready', 'failed']

type Saved = { turns: TurnEntry[]; edits: EditEntry[]; tests: TestRun[] }
type Fields = Record<string, unknown>

function isRecord(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function records(value: unknown): Fields[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function steps(value: unknown): FlowStep[] {
  return records(value).map(step => ({
    text: text(step.text),
    isChanged: step.isChanged === true,
    editIds: Array.isArray(step.editIds) ? step.editIds.filter((id): id is number => typeof id === 'number') : [],
  }))
}

function summaryOf(value: unknown): TurnSummary | null {
  if (!isRecord(value) || typeof value.title !== 'string') {
    return null
  }
  return { title: value.title, explanation: text(value.explanation), before: steps(value.before), after: steps(value.after), editReasons: [] }
}

function turnOf(turn: Fields): TurnEntry {
  const status = SUMMARY_STATUSES.find(candidate => candidate === turn.summaryStatus) ?? 'off'
  return {
    index: count(turn.index),
    prompt: text(turn.prompt),
    startedAt: count(turn.startedAt),
    endedAt: typeof turn.endedAt === 'number' ? turn.endedAt : null,
    summaryStatus: status === 'running' || status === 'waiting' ? 'failed' : status,
    summary: summaryOf(turn.summary),
  }
}

function editOf(edit: Fields): EditEntry | undefined {
  const source = SOURCES.find(candidate => candidate === edit.source)
  const status = STATUSES.find(candidate => candidate === edit.status)
  if (!source || !status || typeof edit.id !== 'number') {
    return undefined
  }
  return {
    id: edit.id,
    turn: count(edit.turn),
    source,
    path: text(edit.path),
    status,
    added: count(edit.added),
    removed: count(edit.removed),
    reason: text(edit.reason),
    isReasonInferred: edit.isReasonInferred === true,
    note: text(edit.note),
    at: count(edit.at),
    hunks: [],
    hunkCount: count(edit.hunkCount),
  }
}

export function restoreFrom(options: { text: string; sessionId: string }): Saved | undefined {
  if (!options.text.startsWith(PREFIX)) {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(options.text.slice(PREFIX.length).trim().replace(/;$/, ''))
  } catch {
    return undefined
  }
  if (!isRecord(parsed) || parsed.sessionId !== options.sessionId) {
    return undefined
  }
  return {
    turns: records(parsed.turns).map(turnOf),
    edits: records(parsed.edits).flatMap(edit => editOf(edit) ?? []),
    tests: records(parsed.tests).map(test => ({
      id: count(test.id),
      turn: count(test.turn),
      command: text(test.command),
      isPassing: test.isPassing === true,
      at: count(test.at),
    })),
  }
}
