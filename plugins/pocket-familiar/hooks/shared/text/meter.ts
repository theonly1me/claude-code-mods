const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']
const SPARKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

export function meter(options: { value: number; max: number; width: number }): string {
  const ratio = options.max <= 0 ? 0 : Math.min(1, Math.max(0, options.value / options.max))
  const eighths = Math.round(ratio * options.width * 8)
  const full = Math.floor(eighths / 8)
  const partial = EIGHTHS[eighths % 8] ?? ''
  const filled = '█'.repeat(full) + partial
  return filled + ' '.repeat(Math.max(0, options.width - full - (partial ? 1 : 0)))
}

export function sparkline(values: readonly number[]): string {
  const peak = Math.max(0, ...values)
  if (peak === 0) {
    return SPARKS[0]?.repeat(values.length) ?? ''
  }
  return values
    .map(value => SPARKS[Math.min(SPARKS.length - 1, Math.floor((value / peak) * (SPARKS.length - 1)))])
    .join('')
}

export function truncate(options: { text: string; width: number }): string {
  const characters = Array.from(options.text.replace(/\s+/g, ' ').trim())
  if (characters.length <= options.width) {
    return characters.join('')
  }
  return characters.slice(0, Math.max(0, options.width - 1)).join('') + '…'
}

export function plural(options: { count: number; word: string }): string {
  return `${options.count} ${options.word}${options.count === 1 ? '' : 's'}`
}
