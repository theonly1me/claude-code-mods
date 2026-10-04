import type { LogEntry } from './types'

const LOG_LIMIT = 8

export function pushLog(options: { log: LogEntry[]; text: string }): void {
  const { log, text } = options
  const [newest] = log
  if (newest && newest.text === text) {
    newest.count += 1
    return
  }
  log.unshift({ text, count: 1 })
  log.splice(LOG_LIMIT)
}

export function logLines(log: readonly LogEntry[]): string[] {
  return log.map(entry => (entry.count > 1 ? `${entry.text} (${entry.count} times)` : entry.text))
}
