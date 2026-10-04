import { countLines } from './diff'
import { journalSettings } from './settings'
import type { EditEntry, EditSource, EditStatus, Hunk, TestRun, TurnEntry, TurnSummary } from './types'

export type JournalIdentity = {
  sessionId: string
  project: string
  root: string
  folder: string
  startedAt: number
}

export type Journal = JournalIdentity & {
  turns: TurnEntry[]
  edits: EditEntry[]
  tests: TestRun[]
  reasons: Map<string, string>
  unwrittenEdits: number[]
  isDataDirty: boolean
  hasOpenedPage: boolean
  baseline: Map<string, string>
  touchedThisTurn: Set<string>
}

let journal: Journal = emptyJournal({ sessionId: '', project: '', root: '', folder: '', startedAt: 0 })

function emptyJournal(options: JournalIdentity): Journal {
  return {
    ...options,
    turns: [],
    edits: [],
    tests: [],
    reasons: new Map(),
    unwrittenEdits: [],
    isDataDirty: true,
    hasOpenedPage: false,
    baseline: new Map(),
    touchedThisTurn: new Set(),
  }
}

export function resetJournal(options: JournalIdentity): void {
  journal = emptyJournal(options)
}

export function adoptJournal(saved: { turns: TurnEntry[]; edits: EditEntry[]; tests: TestRun[] }): void {
  journal = { ...journal, ...saved, hasOpenedPage: true, isDataDirty: false }
}

export function journalView(): Readonly<Journal> {
  return journal
}

function currentTurn(at: number): TurnEntry {
  const last = journal.turns.at(-1)
  if (last) {
    return last
  }
  const opening: TurnEntry = {
    index: 0,
    prompt: 'Before the first prompt',
    startedAt: at,
    endedAt: null,
    summaryStatus: 'off',
    summary: null,
  }
  journal.turns.push(opening)
  return opening
}

export function beginTurn(options: { at: number; prompt: string }): void {
  journal.turns.push({
    index: (journal.turns.at(-1)?.index ?? 0) + 1,
    prompt: options.prompt.trim() || 'A prompt with no text',
    startedAt: options.at,
    endedAt: null,
    summaryStatus: 'off',
    summary: null,
  })
  journal.touchedThisTurn = new Set()
  journal.isDataDirty = true
}

export function endTurn(at: number): void {
  const turn = currentTurn(at)
  turn.endedAt = at
  const hasEdits = journal.edits.some(edit => edit.turn === turn.index && edit.status === 'applied')
  turn.summaryStatus = journalSettings().liveSummaries && hasEdits ? 'waiting' : 'off'
  journal.isDataDirty = true
}

export function recordReason(options: { toolUseId: string; reason: string }): void {
  journal.reasons.set(options.toolUseId, options.reason)
}

export function addEdit(options: {
  toolUseId: string
  source: EditSource
  path: string
  status: EditStatus
  hunks: Hunk[]
  note: string
  at: number
}): EditEntry {
  const { added, removed } = countLines(options.hunks)
  const edit: EditEntry = {
    id: journal.edits.length + 1,
    turn: currentTurn(options.at).index,
    source: options.source,
    path: options.path,
    status: options.status,
    added,
    removed,
    reason: journal.reasons.get(options.toolUseId) ?? '',
    isReasonInferred: false,
    note: options.note,
    at: options.at,
    hunks: options.hunks,
    hunkCount: options.hunks.length,
  }
  journal.edits.push(edit)
  journal.unwrittenEdits.push(edit.id)
  journal.touchedThisTurn.add(edit.path)
  journal.isDataDirty = true
  return edit
}

export function addTest(options: { command: string; isPassing: boolean; at: number }): void {
  journal.tests.push({ id: journal.tests.length + 1, turn: currentTurn(options.at).index, ...options })
  journal.isDataDirty = true
}

export function setBaseline(counts: Map<string, string>): void {
  journal.baseline = counts
}

export function changedOutsideEdits(counts: Map<string, string>): string[] {
  const changed = [...counts.entries()]
    .filter(([path, count]) => journal.baseline.get(path) !== count)
    .map(([path]) => path)
    .filter(path => !journal.touchedThisTurn.has(path))
  journal.baseline = counts
  return changed
}

export function nextSummaryTurn(): TurnEntry | undefined {
  const turn = journal.turns.find(candidate => candidate.summaryStatus === 'waiting')
  if (turn) {
    turn.summaryStatus = 'running'
    journal.isDataDirty = true
  }
  return turn
}

export function finishSummary(options: { index: number; summary: TurnSummary | null }): void {
  const turn = journal.turns.find(candidate => candidate.index === options.index)
  if (!turn) {
    return
  }
  turn.summary = options.summary
  turn.summaryStatus = options.summary ? 'ready' : 'failed'
  options.summary?.editReasons.forEach(({ id, why }) => {
    const edit = journal.edits.find(candidate => candidate.id === id && candidate.turn === turn.index)
    if (edit && edit.reason === '' && why !== '') {
      edit.reason = why
      edit.isReasonInferred = true
    }
  })
  journal.isDataDirty = true
}

export function claimAutoOpen(): boolean {
  const hasApplied = journal.edits.some(edit => edit.status === 'applied')
  if (!journalSettings().autoOpen || journal.hasOpenedPage || !hasApplied) {
    return false
  }
  journal.hasOpenedPage = true
  return true
}

export function drainWrites(): { editIds: number[]; isDataDirty: boolean } {
  const drained = { editIds: journal.unwrittenEdits, isDataDirty: journal.isDataDirty }
  journal.unwrittenEdits = []
  journal.isDataDirty = false
  return drained
}
