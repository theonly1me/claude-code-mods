import { commentRuns, isCommentLine } from './comments'
import { familyOf } from './paths'
import { findingKey, scanText } from './scan'
import { testBlocks } from './tests'
import type { Candidate, FileFamily, Finding, SlopKind } from './types'

const MAX_PROMPT_CHARACTERS = 6000
const KINDS: Readonly<Record<string, SlopKind>> = {
  test: 'slop-test',
  comment: 'restating-comment',
  phrase: 'ai-phrase',
  code: 'needless-code',
}

export const DETECT_SYSTEM = [
  'You review lines that an AI coding assistant just added to a file, and you find slop.',
  'Slop is what AI assistants write often, people rarely write, and that adds nothing.',
  'Report only clear cases of these kinds:',
  'test: a test that asserts nothing real (a tautology, only checks that a value exists, or tests a mock instead of the code).',
  'comment: a comment that narrates what the next line plainly does, a banner, or a step label.',
  'phrase: filler or marketing words in docs or comments.',
  'code: defensive code that does nothing, such as a catch that only rethrows or a check that cannot fail.',
  'Do not report real explanations of non-obvious behavior, style preferences, or lines that were not added.',
  'Do not report test names, function names, string literals, or log messages.',
  'Reply with JSON only: {"findings":[{"line":"<one added line, copied exactly>","kind":"test|comment|phrase|code","fix":"<what to do, under 15 words>"}]}.',
  'Reply {"findings":[]} when the lines are clean.',
].join('\n')

export function detectPrompt(options: { path: string; addedLines: readonly string[]; known: readonly string[] }): string {
  const added = options.addedLines.join('\n').slice(0, MAX_PROMPT_CHARACTERS)
  const known = options.known.length === 0 ? 'none' : options.known.map(line => `- ${line}`).join('\n')
  return `File: ${options.path}\n\nAdded lines:\n${added}\n\nAlready reported, skip these:\n${known}`
}

function jsonObject(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return undefined
  }
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fitsKind(options: { kind: SlopKind; line: string; family: FileFamily }): boolean {
  const isComment = isCommentLine({ line: options.line, family: options.family })
  if (options.kind === 'restating-comment') {
    return isComment
  }
  return options.kind !== 'ai-phrase' || isComment || options.family === 'prose'
}

export function parseDetection(options: { text: string; path: string; addedLines: readonly string[] }): Candidate[] {
  const family = familyOf(options.path)
  const parsed = jsonObject(options.text)
  const findings = isRecord(parsed) && Array.isArray(parsed.findings) ? parsed.findings.filter(isRecord) : []
  const trimmedLines = options.addedLines.map(line => line.trim()).filter(line => line !== '')
  return findings.flatMap(finding => {
    const reported = typeof finding.line === 'string' ? finding.line.trim() : ''
    const kind = typeof finding.kind === 'string' ? KINDS[finding.kind] : undefined
    const fix = typeof finding.fix === 'string' ? finding.fix.trim() : ''
    const excerpt = reported === '' ? undefined : trimmedLines.find(line => line === reported || line.includes(reported))
    if (!kind || !excerpt || !fitsKind({ kind, line: excerpt, family })) {
      return []
    }
    return [{ kind, line: undefined, excerpt, advice: fix === '' ? 'Remove it.' : fix }]
  })
}

export function testSnapshot(options: { text: string; excerpt: string }): string | undefined {
  const block = testBlocks(options.text.split('\n')).find(candidate => candidate.header.trim() === options.excerpt)
  return block?.body.join('\n')
}

export function withSnapshots(options: { candidates: readonly Candidate[]; text: string }): Candidate[] {
  return options.candidates.map(candidate => {
    const snapshot = candidate.kind === 'slop-test' ? testSnapshot({ text: options.text, excerpt: candidate.excerpt }) : undefined
    return snapshot === undefined ? candidate : { ...candidate, snapshot }
  })
}

export function isStillPresent(options: { finding: Finding; text: string; commentBlockLines: number }): boolean {
  const { finding, text } = options
  const lines = text.split('\n')
  if (finding.snapshot !== undefined) {
    return testSnapshot({ text, excerpt: finding.excerpt }) === finding.snapshot
  }
  if (finding.source === 'model') {
    return lines.some(line => line.trim() === finding.excerpt)
  }
  if (finding.kind === 'comment-block') {
    return commentRuns({ lines, family: familyOf(finding.path) }).some(
      run => run.lines.length >= options.commentBlockLines && run.lines.some(line => line.trim() === finding.excerpt),
    )
  }
  const key = findingKey(finding)
  return scanText({ path: finding.path, text, commentBlockLines: options.commentBlockLines }).some(candidate => findingKey(candidate) === key)
}
