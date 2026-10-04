export type Fields = Readonly<Record<string, unknown>>

export function fieldsOf(value: unknown): Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {}
}

export function textOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function countOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function listOf(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

export function firstLine(text: string): string {
  return text.split('\n').find(line => line.trim() !== '')?.trim() ?? ''
}

export function clip(options: { text: string; limit: number }): string {
  return options.text.length > options.limit ? `${options.text.slice(0, options.limit - 1)}…` : options.text
}

export function plural(options: { count: number; word: string; many?: string }): string {
  return `${options.count} ${options.count === 1 ? options.word : options.many ?? `${options.word}s`}`
}
