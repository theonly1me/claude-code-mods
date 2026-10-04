import { plural } from './fields'

const GROUP_PHRASES: Readonly<Record<string, readonly [string, string]>> = {
  Read: ['read', 'file'],
  Grep: ['searched', 'pattern'],
  Glob: ['matched', 'glob'],
  Bash: ['ran', 'command'],
  WebFetch: ['fetched', 'page'],
  WebSearch: ['searched the web', 'time'],
}

export function summarizeGroup(calls: readonly { tool: string; isErrored: boolean; isRunning: boolean }[]): { text: string; failed: number; running: number } {
  const counts = new Map<string, number>()
  calls.forEach(call => counts.set(call.tool, (counts.get(call.tool) ?? 0) + 1))
  const parts = [...counts.entries()].map(([tool, count]) => {
    const [verb, noun] = GROUP_PHRASES[tool] ?? [`used ${tool}`, 'time']
    return `${verb} ${plural({ count, word: noun })}`
  })
  const text = parts.join(', ')
  return {
    text: text.charAt(0).toUpperCase() + text.slice(1),
    failed: calls.filter(call => call.isErrored).length,
    running: calls.filter(call => call.isRunning).length,
  }
}
