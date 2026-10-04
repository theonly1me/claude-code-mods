import { clip, fieldsOf, listOf, plural, textOf } from './fields'
import type { Fields } from './fields'
import { hasOwnResult } from './summary'

export type LineTone = 'plain' | 'added' | 'removed' | 'failed'
export type ResultLine = { text: string; tone: LineTone }
export type ResultView = { kind: 'engine' } | { kind: 'none' } | { kind: 'lines'; lines: readonly ResultLine[]; more: number }

const LINE_LIMIT = 160
const ERROR_LINES = 4

function fitted(options: { entries: readonly ResultLine[]; limit: number }): ResultView {
  const lines = options.entries.slice(0, options.limit).map(entry => ({ ...entry, text: clip({ text: entry.text, limit: LINE_LIMIT }) }))
  return lines.length === 0 ? { kind: 'none' } : { kind: 'lines', lines, more: Math.max(0, options.entries.length - lines.length) }
}

function linesOf(options: { text: string; tone: LineTone }): ResultLine[] {
  const lines = options.text.replace(/<\/?[a-z_]+>/g, '').split('\n')
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
    lines.pop()
  }
  return lines.map(text => ({ text: text.trimEnd(), tone: options.tone }))
}

function patchLines(output: Fields): ResultLine[] {
  return listOf(output.structuredPatch)
    .flatMap(hunk => listOf(fieldsOf(hunk).lines))
    .map(textOf)
    .filter(line => line.startsWith('+') || line.startsWith('-'))
    .map(text => ({ text, tone: text.startsWith('+') ? 'added' : 'removed' }))
}

export function resultView(options: { tool: string; output: unknown; isErrored: boolean; limit: number }): ResultView {
  if (!hasOwnResult(options.tool)) {
    return { kind: 'engine' }
  }
  const output = fieldsOf(options.output)
  if (options.isErrored) {
    const text = typeof options.output === 'string' ? options.output : textOf(output.stderr)
    return fitted({ entries: linesOf({ text, tone: 'failed' }), limit: ERROR_LINES })
  }
  if (options.tool === 'Bash') {
    return fitted({ entries: [...linesOf({ text: textOf(output.stdout), tone: 'plain' }), ...linesOf({ text: textOf(output.stderr), tone: 'plain' })], limit: options.limit })
  }
  if (options.tool === 'Edit' || options.tool === 'Write') {
    return fitted({ entries: patchLines(output), limit: options.limit })
  }
  return { kind: 'none' }
}

export function moreHint(more: number): string {
  return `${plural({ count: more, word: 'more line' })} (ctrl+o for all)`
}
