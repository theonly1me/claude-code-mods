import type { Change, Signal, Verdict } from './types'

const VERDICTS: readonly Verdict[] = ['in-scope', 'mild', 'clear']

export const CONFIRM_SYSTEM = [
  'You check whether one file change by a coding agent stays inside what the user asked for.',
  'Reply with JSON only: {"verdict": "in-scope" | "mild" | "clear", "reason": "<one short sentence for the user>"}.',
  'in-scope: the request needs the change, or the user plainly invited it.',
  'mild: related to the request but beyond it, for example a tidy-up or an extra file the user may accept.',
  'clear: unrelated to the request, or destructive (a delete, a large rewrite, a file outside the project) without the user asking.',
  'Write the reason in plain words, 20 words or fewer, without dashes.',
].join('\n')

export function confirmPrompt(options: {
  task: string
  narration: string
  change: Change
  action: string
  signals: readonly Signal[]
}): string {
  const { change } = options
  return [
    `User request:\n${options.task.slice(-2000) || '(none recorded)'}`,
    `What Claude said just before the change:\n${options.narration.slice(-800) || '(nothing)'}`,
    `The change: ${change.tool} will ${options.action} ${change.paths.join(', ')}.`,
    `Signals the cheap rules found: ${options.signals.map(signal => signal.text).join('; ')}.`,
  ].join('\n\n')
}

export function parseVerdict(text: string): { verdict: Verdict; reason: string } | undefined {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null || !('verdict' in parsed)) {
    return undefined
  }
  const verdict = VERDICTS.find(candidate => candidate === parsed.verdict)
  const reason = 'reason' in parsed && typeof parsed.reason === 'string' ? parsed.reason.trim().replace(/[\u2013\u2014]/g, ',') : ''
  return verdict ? { verdict, reason } : undefined
}
