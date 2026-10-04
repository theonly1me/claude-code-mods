import { sanitize } from '../shared/privacy'
import type { TraceEntry } from './types'

const MAX_ENTRY = 600
const MAX_TRACE = 14000

function firstString(input: Readonly<Record<string, unknown>>): string {
  const preferred = ['file_path', 'notebook_path', 'command', 'pattern', 'description', 'url', 'query', 'prompt']
  for (const key of preferred) {
    const value = input[key]
    if (typeof value === 'string' && value !== '') {
      return value
    }
  }
  const fallback = Object.values(input).find((value): value is string => typeof value === 'string')
  return fallback ?? ''
}

export function toolSummary(options: { tool: string; input: Readonly<Record<string, unknown>> }): string {
  const detail = firstString(options.input).split('\n')[0] ?? ''
  const short = detail.length > 120 ? detail.slice(0, 119) + '…' : detail
  return short === '' ? options.tool : `${options.tool} ${short}`
}

export function compact(text: string): string {
  const cleaned = sanitize(text).replace(/\s+/g, ' ').trim()
  return cleaned.length > MAX_ENTRY ? cleaned.slice(0, MAX_ENTRY - 1) + '…' : cleaned
}

export function traceText(trace: readonly TraceEntry[]): string {
  const lines = trace.map(entry => {
    if (entry.kind === 'tool') {
      return `- Tool call: ${entry.text} -> ${entry.outcome}`
    }
    return entry.kind === 'thought' ? `- Claude thought: ${entry.text}` : `- Claude said: ${entry.text}`
  })
  const joined = lines.join('\n')
  return joined.length > MAX_TRACE ? '…\n' + joined.slice(-MAX_TRACE) : joined
}
