import { journalSettings } from './settings'
import { drainWrites, journalView } from './state'
import type { EditEntry, PendingWrites } from './types'

export type Totals = { files: number; added: number; removed: number; passing: number; failing: number }

export function totals(): Totals {
  const journal = journalView()
  const applied = journal.edits.filter(edit => edit.status === 'applied')
  return {
    files: new Set(applied.map(edit => edit.path)).size,
    added: applied.reduce((sum, edit) => sum + edit.added, 0),
    removed: applied.reduce((sum, edit) => sum + edit.removed, 0),
    passing: journal.tests.filter(test => test.isPassing).length,
    failing: journal.tests.filter(test => !test.isPassing).length,
  }
}

export function statusLine(): string | undefined {
  const { files, added, removed, passing, failing } = totals()
  if (files === 0) {
    return undefined
  }
  const checks = passing + failing > 0 ? ` · ✓${passing} ✗${failing}` : ''
  return `✎ ${files} file${files === 1 ? '' : 's'} +${added} −${removed}${checks}`
}

function editScript(edit: EditEntry): string {
  const payload = JSON.stringify({ hunks: edit.hunks })
  return `(window.__changeJournalEdits = window.__changeJournalEdits || {})[${edit.id}] = ${payload};\n`
}

function dataScript(updatedAt: number): string {
  const journal = journalView()
  const payload = {
    version: 1,
    project: journal.project,
    sessionId: journal.sessionId,
    startedAt: journal.startedAt,
    updatedAt,
    liveSummaries: journalSettings().liveSummaries,
    totals: totals(),
    turns: journal.turns,
    edits: journal.edits.map(({ hunks, ...edit }) => edit),
    tests: journal.tests,
  }
  return `window.__changeJournal = ${JSON.stringify(payload)};\n`
}

export function takeWrites(updatedAt: number): PendingWrites {
  const { editIds, isDataDirty } = drainWrites()
  const edits = journalView().edits.filter(edit => editIds.includes(edit.id))
  return {
    edits: edits.map(edit => ({ id: edit.id, text: editScript(edit) })),
    data: isDataDirty || editIds.length > 0 ? dataScript(updatedAt) : undefined,
  }
}
