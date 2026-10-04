import type { Finding, SlopKind } from './types'

const EXCERPT_LIMIT = 120

export const STYLE_SECTION_ID = 'unslop:style'

export const STYLE_TEXT = [
  'Write your chat replies to the user in ASD-STE100 Simplified Technical English, at about 80% strictness.',
  'Keep sentences short: 20 words or fewer for an instruction, 25 or fewer for a description. Put one idea in each sentence.',
  'Use the active voice, simple tenses, and common words with one meaning. Use the same term for the same thing every time.',
  'Do not use idioms, filler, flattery, hedging, or a closing summary that repeats what you said.',
  'Do not use the em dash or the en dash. Use a comma, a period, parentheses, or two sentences.',
  'Keep code, commands, file paths, and product names exactly as they are. This rule is for chat replies, not for code.',
].join('\n')

export const KIND_LABELS: Record<SlopKind, string> = {
  dash: 'dash',
  'comment-block': 'comment block',
  'restating-comment': 'restating comment',
  'slop-test': 'slop test',
  'ai-phrase': 'AI phrase',
  emoji: 'emoji',
  'needless-code': 'needless code',
}

export function shortExcerpt(text: string): string {
  return text.length > EXCERPT_LIMIT ? `${text.slice(0, EXCERPT_LIMIT - 1)}…` : text
}

function where(finding: Finding): string {
  const line = finding.line === undefined ? '' : ` line ${finding.line}`
  return `${line} (${KIND_LABELS[finding.kind]})`.trim()
}

function item(options: { finding: Finding; isPathShown: boolean }): string {
  const { finding } = options
  const path = options.isPathShown ? `${finding.path} ` : ''
  return `- ${path}${where(finding)}: \`${shortExcerpt(finding.excerpt)}\` ${finding.advice}`
}

export function contextNote(options: { path: string; findings: readonly Finding[] }): string {
  return [
    `Unslop found slop in what you just added to ${options.path}. Remove it with a follow-up edit, and keep the behavior the same:`,
    ...options.findings.map(finding => item({ finding, isPathShown: false })),
    'You do not need to tell the user about this note.',
  ].join('\n')
}

export function appendNote(findings: readonly Finding[]): string {
  return [
    'Unslop (a plugin) checked your recent edits and found more slop. Remove it when you next touch these files, and keep the behavior the same:',
    ...findings.map(finding => item({ finding, isPathShown: true })),
  ].join('\n')
}

export function fixPrompt(findings: readonly Finding[]): string {
  return [
    'Unslop found slop in your recent changes. Remove each item without changing behavior:',
    ...findings.map(finding => item({ finding, isPathShown: true })),
    'Do not add comments that explain the removal.',
  ].join('\n')
}

export function statusLine(options: { removed: number; open: number; waiting: number }): string | undefined {
  const { removed, open, waiting } = options
  if (removed === 0 && open === 0) {
    return undefined
  }
  const base = `${removed} removed, ${open} open`
  return waiting > 0 ? `${base}, ${waiting} waiting  /unslop fix` : `${base}  /unslop`
}
