import type { FileFamily } from './types'

const DIRECTIVE = /\b(?:eslint|tslint|prettier-ignore|biome-ignore|@ts-|ts-ignore|ts-expect-error|noqa|pylint|type:\s*ignore|istanbul|c8\s|v8\s|jshint|global\s|#region|#endregion|SPDX|Copyright|@license|@preserve|nolint|rubocop|fmt:)/i
const STOP_WORDS = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'from', 'into', 'then', 'its', 'our', 'are', 'was', 'all', 'any', 'out', 'here', 'now', 'just', 'will', 'should', 'can', 'each', 'new'])
const MAX_RESTATING_WORDS = 6
const RESTATING_RATIO = 0.6

export function isCommentLine(options: { line: string; family: FileFamily }): boolean {
  const trimmed = options.line.trim()
  if (trimmed === '') {
    return false
  }
  if (options.family === 'slash') {
    return /^(?:\/\/|\/\*|\*)/.test(trimmed)
  }
  if (options.family === 'hash') {
    return trimmed.startsWith('#') && !trimmed.startsWith('#!')
  }
  if (options.family === 'double-dash') {
    return trimmed.startsWith('--')
  }
  return false
}

export function commentText(line: string): string {
  return line
    .trim()
    .replace(/^(?:\/\/+|\/\*+|\*+\/?|#+|--+)\s?/, '')
    .replace(/\*+\/\s*$/, '')
    .trim()
}

export function isDirective(line: string): boolean {
  return DIRECTIVE.test(line) || /^#!/.test(line.trim())
}

export type CommentRun = { start: number; lines: string[] }

export function commentRuns(options: { lines: readonly string[]; family: FileFamily }): CommentRun[] {
  const runs: CommentRun[] = []
  let current: CommentRun | undefined
  options.lines.forEach((line, index) => {
    if (isCommentLine({ line, family: options.family })) {
      current = current ?? { start: index, lines: [] }
      current.lines.push(line)
      return
    }
    if (current) {
      runs.push(current)
      current = undefined
    }
  })
  if (current) {
    runs.push(current)
  }
  return runs
}

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word))
}

function tokensOf(code: string): string[] {
  return code
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(token => token.length >= 2)
}

function stemOf(word: string): string {
  return word.replace(/(?:ing|ed|es|s)$/, '')
}

function isWordInCode(options: { word: string; tokens: readonly string[] }): boolean {
  const stem = stemOf(options.word)
  return options.tokens.some(token => token === options.word || stemOf(token) === stem || (token.length >= 4 && stem.startsWith(token)))
}

export function isRestating(options: { comment: string; code: string }): boolean {
  if (isDirective(options.comment)) {
    return false
  }
  const words = wordsOf(commentText(options.comment))
  if (words.length === 0 || words.length > MAX_RESTATING_WORDS) {
    return false
  }
  const tokens = tokensOf(options.code)
  const matched = words.filter(word => isWordInCode({ word, tokens })).length
  return matched > 0 && matched / words.length >= RESTATING_RATIO
}
