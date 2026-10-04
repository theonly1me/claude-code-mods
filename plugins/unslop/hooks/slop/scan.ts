import { commentRuns, commentText, isCommentLine, isDirective, isRestating } from './comments'
import { familyOf, isTestPath } from './paths'
import { dashName, hasDash, hasEmoji, isProseHeadingOrBullet, phraseIn } from './phrases'
import { hasNoAssertion, hasOnlyWeakAssertions, isTautology, testBlocks } from './tests'
import type { Candidate, FileFamily, Segment, SlopKind } from './types'

const MAX_FINDINGS = 12
const FENCE = /^\s*(?:```|~~~)/

type Context = { segment: Segment; family: FileFamily; found: Candidate[] }

export function findingKey(options: { kind: SlopKind; excerpt: string }): string {
  return `${options.kind}:${options.excerpt}`
}

function add(context: Context, options: { kind: SlopKind; index: number; advice: string }): void {
  const excerpt = (context.segment.lines[options.index] ?? '').trim()
  const key = findingKey({ kind: options.kind, excerpt })
  if (excerpt === '' || context.found.some(found => findingKey(found) === key)) {
    return
  }
  const { startLine } = context.segment
  context.found.push({
    kind: options.kind,
    line: startLine === undefined ? undefined : startLine + options.index,
    excerpt,
    advice: options.advice,
  })
}

function scanLines(context: Context): void {
  let isInFence = false
  context.segment.lines.forEach((line, index) => {
    if (hasDash(line)) {
      add(context, { kind: 'dash', index, advice: `Replace the ${dashName(line)} with a comma, a period, parentheses, or two sentences.` })
    }
    if (context.family === 'prose' && FENCE.test(line)) {
      isInFence = !isInFence
      return
    }
    const isComment = isCommentLine({ line, family: context.family })
    const isProse = context.family === 'prose' && !isInFence
    if (!isComment && !isProse) {
      return
    }
    const text = isComment ? commentText(line) : line
    const phrase = isComment && isDirective(line) ? undefined : phraseIn(text)
    if (phrase) {
      add(context, { kind: 'ai-phrase', index, advice: `"${phrase}" is filler that AI writes often. Use a plain word, or cut it.` })
    }
    if (hasEmoji(text) && (isComment || isProseHeadingOrBullet(line))) {
      add(context, { kind: 'emoji', index, advice: 'Remove the emoji.' })
    }
  })
}

function scanComments(context: Context, options: { commentBlockLines: number }): void {
  const { lines } = context.segment
  commentRuns({ lines, family: context.family }).forEach(run => {
    const isLicense = run.lines.some(line => isDirective(line))
    if (run.lines.length >= options.commentBlockLines && !isLicense) {
      add(context, {
        kind: 'comment-block',
        index: run.start,
        advice: `A ${run.lines.length}-line comment block. Remove it, or cut it to one short line and let names carry the meaning.`,
      })
      return
    }
    const last = run.lines.at(-1) ?? ''
    const code = lines[run.start + run.lines.length] ?? ''
    if (run.lines.length === 1 && code.trim() !== '' && isRestating({ comment: last, code })) {
      add(context, { kind: 'restating-comment', index: run.start, advice: 'This comment repeats the next line of code. Remove it.' })
    }
  })
}

function scanTests(context: Context): void {
  const { lines } = context.segment
  lines.forEach((line, index) => {
    if (isTautology(line)) {
      add(context, { kind: 'slop-test', index, advice: 'This assertion is always true. Assert real behavior, or remove it.' })
    }
  })
  testBlocks(lines).forEach(block => {
    if (hasNoAssertion(block)) {
      add(context, { kind: 'slop-test', index: block.start, advice: 'This test asserts nothing. Add a real assertion, or remove the test.' })
    } else if (hasOnlyWeakAssertions(block)) {
      add(context, { kind: 'slop-test', index: block.start, advice: 'This test only checks that a value exists. Assert the value itself.' })
    }
  })
}

type ScanOptions = { path: string; segments: readonly Segment[]; commentBlockLines: number }

function scanAll(options: ScanOptions): Candidate[] {
  const family = familyOf(options.path)
  const found: Candidate[] = []
  options.segments.forEach(segment => {
    const context: Context = { segment, family, found }
    scanLines(context)
    scanComments(context, { commentBlockLines: options.commentBlockLines })
    if (isTestPath(options.path)) {
      scanTests(context)
    }
  })
  return found
}

export function scanSegments(options: ScanOptions): Candidate[] {
  return scanAll(options).slice(0, MAX_FINDINGS)
}

export function scanText(options: { path: string; text: string; commentBlockLines: number }): Candidate[] {
  const segment: Segment = { startLine: 1, lines: options.text.split('\n') }
  return scanAll({ path: options.path, segments: [segment], commentBlockLines: options.commentBlockLines })
}
