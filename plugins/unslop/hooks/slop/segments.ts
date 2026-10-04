import type { Segment } from './types'

type Hunk = { newStart: number; lines: readonly string[] }

export function segmentsFromPatch(hunks: readonly Hunk[]): Segment[] {
  const segments: Segment[] = []
  hunks.forEach(hunk => {
    let lineNumber = hunk.newStart
    let run: { startLine: number; lines: string[] } | undefined
    const close = () => {
      if (run) {
        segments.push(run)
        run = undefined
      }
    }
    hunk.lines.forEach(line => {
      if (line.startsWith('+')) {
        run = run ?? { startLine: lineNumber, lines: [] }
        run.lines.push(line.slice(1))
        lineNumber += 1
      } else if (line.startsWith(' ')) {
        close()
        lineNumber += 1
      }
    })
    close()
  })
  return segments
}

export function segmentsFromStrings(options: { before: string; after: string }): Segment[] {
  const remaining = new Map<string, number>()
  options.before.split('\n').forEach(line => remaining.set(line, (remaining.get(line) ?? 0) + 1))
  const segments: Segment[] = []
  let run: string[] = []
  options.after.split('\n').forEach(line => {
    const count = remaining.get(line) ?? 0
    if (count > 0) {
      remaining.set(line, count - 1)
      if (run.length > 0) {
        segments.push({ startLine: undefined, lines: run })
        run = []
      }
      return
    }
    run.push(line)
  })
  if (run.length > 0) {
    segments.push({ startLine: undefined, lines: run })
  }
  return segments
}

export function segmentsFromContent(content: string): Segment[] {
  return [{ startLine: 1, lines: content.split('\n') }]
}

export function addedLines(segments: readonly Segment[]): string[] {
  return segments.flatMap(segment => [...segment.lines])
}
