import type { BandChoice, Flag, ScopeMode } from './types'

export const ASK_OPTIONS = ['Allow once', 'Allow for this task', 'Stop'] as const

export const CHOICE_LABELS: Record<BandChoice, string> = {
  pull: 'Pull back',
  fine: 'Fine',
  folder: 'Allow this folder',
}

export const CHOICE_DIGITS: Record<BandChoice, string> = { pull: '7', fine: '8', folder: '9' }

const MODE_TEXT: Record<ScopeMode, string> = {
  ask: 'on: clear drift waits for your answer, milder drift is flagged above the prompt',
  flag: 'on in flag mode: drift is flagged above the prompt and never stops Claude',
  off: 'off: nothing is checked until you run /scope on',
}

function excerpt(options: { text: string; length: number }): string {
  const flat = options.text.replace(/\s+/g, ' ').trim()
  return flat.length > options.length ? `${flat.slice(0, options.length - 1)}…` : flat
}

export function statusText(openCount: number): string | undefined {
  if (openCount === 0) {
    return undefined
  }
  return `${openCount} flag${openCount === 1 ? '' : 's'}  7 pull back  8 fine`
}

export function askQuestion(options: { action: string; paths: readonly string[]; reason: string }): string {
  const target = excerpt({ text: options.paths.join(', '), length: 80 })
  const reason = options.reason === '' ? '' : ` ${excerpt({ text: options.reason, length: 140 }).replace(/[.?!]$/, '')}.`
  return `Claude wants to ${options.action} ${target}, outside your request.${reason} Allow it?`
}

export function denyReason(options: { reason: string; typed: string | undefined }): string {
  const said = options.typed === undefined ? '' : ` The user said: "${options.typed}".`
  return `Scope Guard: the user stopped this change because it is outside their request (${options.reason}).${said} Stay inside the request, and ask the user before you touch files it does not mention.`
}

export function pullBackNote(flag: Flag): string {
  return `Scope Guard: the user asks you to stay inside their request. You chose to ${flag.action} ${flag.path} (${flag.reason}). If the request does not need that change, revert it, then continue with the request only.`
}

export function flagLine(flag: Flag): string {
  return `Claude chose to ${flag.action} ${flag.path}, which looks outside your request.`
}

export function scopeReport(options: {
  mode: ScopeMode
  prompts: readonly string[]
  allowed: readonly string[]
  flags: readonly Flag[]
}): string {
  const [latest] = options.prompts.slice(-1)
  const earlier = options.prompts.length - 1
  const lines = [
    `Scope Guard is ${MODE_TEXT[options.mode]}.`,
    latest === undefined
      ? 'Task: nothing recorded yet. Send a request first.'
      : `Task: "${excerpt({ text: latest, length: 160 })}"${earlier > 0 ? ` (and ${earlier} earlier prompt${earlier === 1 ? '' : 's'})` : ''}`,
    `Allowed for this task: ${options.allowed.length === 0 ? 'nothing yet' : options.allowed.join(', ')}`,
  ]
  if (options.flags.length === 0) {
    return [...lines, 'Flags: none yet.'].join('\n')
  }
  const recent = options.flags.slice(-6).map(flag => `  ${flag.status.padEnd(7)} ${flag.action} ${flag.path}: ${flag.reason}`)
  return [...lines, 'Recent flags:', ...recent].join('\n')
}
