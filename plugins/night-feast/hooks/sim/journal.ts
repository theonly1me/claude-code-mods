import { LOG_LIMIT } from './constants'

export function createJournal() {
  let lines: string[] = []
  return {
    push(line: string): void {
      lines = [line, ...lines].slice(0, LOG_LIMIT)
    },
    lines(): readonly string[] {
      return lines
    },
  }
}

export type Journal = ReturnType<typeof createJournal>
