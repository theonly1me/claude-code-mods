import { sanitize } from '../shared/privacy'
import type { EditEntry, FlowStep, TestRun, TurnEntry, TurnSummary } from './types'

const DIFF_LINES_PER_EDIT = 60
const PROMPT_BUDGET = 12000

export const SUMMARY_SYSTEM =
  'You explain code changes to a developer who watches an AI coding agent work. Be concrete and plain. Reply with one JSON object and nothing else.'

function diffExcerpt(edit: EditEntry): string {
  const lines = edit.hunks.flatMap(hunk => [
    `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    ...hunk.lines,
  ])
  return sanitize(lines.slice(0, DIFF_LINES_PER_EDIT).join('\n'))
}

export function summaryPrompt(options: {
  turn: TurnEntry
  edits: readonly EditEntry[]
  tests: readonly TestRun[]
}): string {
  const edits = options.edits
    .map(edit =>
      [
        `### Edit ${edit.id}: ${edit.path} (${edit.source}, +${edit.added} -${edit.removed})`,
        edit.reason ? `Agent's stated reason: ${sanitize(edit.reason)}` : '',
        diffExcerpt(edit),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
  const tests = options.tests
    .map(test => `- ${test.isPassing ? 'PASS' : 'FAIL'}: ${sanitize(test.command)}`)
    .join('\n')
  return [
    `The developer asked: ${sanitize(options.turn.prompt).slice(0, 1500)}`,
    '',
    'The agent made these edits:',
    edits.slice(0, PROMPT_BUDGET),
    tests ? `\nChecks run:\n${tests}` : '',
    '',
    'Return JSON with this shape:',
    '{"title": "what changed, at most 8 words",',
    ' "explanation": "2 to 4 short sentences: what changed, why, and what a reviewer should check",',
    ' "before": [{"text": "one step of how the code behaved before", "editIds": [1]}],',
    ' "after": [{"text": "one step of how it behaves now", "changed": true, "editIds": [1]}],',
    ' "edits": [{"id": 1, "why": "the most likely reason for this edit, one short sentence"}]}',
    'Use 3 to 7 steps in each flow. Mark an "after" step changed only when its behavior differs.',
    'If the behavior did not change (a refactor or docs), say so in the explanation and keep the flows identical.',
  ].join('\n')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numbersOf(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : []
}

function stepsOf(options: { value: unknown; isAfter: boolean }): FlowStep[] {
  if (!Array.isArray(options.value)) {
    return []
  }
  return options.value
    .filter(isRecord)
    .filter(step => typeof step.text === 'string')
    .slice(0, 9)
    .map(step => ({
      text: String(step.text).slice(0, 200),
      isChanged: options.isAfter && step.changed === true,
      editIds: numbersOf(step.editIds),
    }))
}

export function parseSummary(text: string): TurnSummary | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
  if (!isRecord(parsed) || typeof parsed.title !== 'string' || typeof parsed.explanation !== 'string') {
    return null
  }
  return {
    title: parsed.title.slice(0, 80),
    explanation: parsed.explanation.slice(0, 900),
    before: stepsOf({ value: parsed.before, isAfter: false }),
    after: stepsOf({ value: parsed.after, isAfter: true }),
    editReasons: Array.isArray(parsed.edits)
      ? parsed.edits
          .filter(isRecord)
          .filter(edit => typeof edit.id === 'number' && typeof edit.why === 'string')
          .map(edit => ({ id: Number(edit.id), why: String(edit.why).slice(0, 300) }))
      : [],
  }
}
