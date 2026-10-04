import type { Hunk } from './types'

const MAX_LINES_PER_EDIT = 800
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

export function countLines(hunks: readonly Hunk[]): { added: number; removed: number } {
  return hunks.reduce(
    (total, hunk) => ({
      added: total.added + hunk.lines.filter(line => line.startsWith('+')).length,
      removed: total.removed + hunk.lines.filter(line => line.startsWith('-')).length,
    }),
    { added: 0, removed: 0 },
  )
}

export function capHunks(hunks: readonly Hunk[]): { hunks: Hunk[]; isTruncated: boolean } {
  let budget = MAX_LINES_PER_EDIT
  const kept: Hunk[] = []
  for (const hunk of hunks) {
    if (budget <= 0) {
      return { hunks: kept, isTruncated: true }
    }
    kept.push({ ...hunk, lines: hunk.lines.slice(0, budget) })
    budget -= hunk.lines.length
  }
  return { hunks: kept, isTruncated: budget < 0 }
}

export function creationHunk(content: string): Hunk {
  const lines = content.replace(/\n$/, '').split('\n')
  return { oldStart: 0, oldLines: 0, newStart: 1, newLines: lines.length, lines: lines.map(line => '+' + line) }
}

export function replacementHunk(options: { before: string; after: string }): Hunk {
  const before = options.before === '' ? [] : options.before.replace(/\n$/, '').split('\n')
  const after = options.after === '' ? [] : options.after.replace(/\n$/, '').split('\n')
  return {
    oldStart: 1,
    oldLines: before.length,
    newStart: 1,
    newLines: after.length,
    lines: [...before.map(line => '-' + line), ...after.map(line => '+' + line)],
  }
}

function isHunkFull(hunk: Hunk): boolean {
  const oldSeen = hunk.lines.filter(line => !line.startsWith('+')).length
  const newSeen = hunk.lines.filter(line => !line.startsWith('-')).length
  return oldSeen >= hunk.oldLines && newSeen >= hunk.newLines
}

export function parseUnifiedDiff(text: string): Hunk[] {
  const hunks: Hunk[] = []
  let current: Hunk | undefined
  for (const line of text.split('\n')) {
    const header = HUNK_HEADER.exec(line)
    if (header) {
      current = {
        oldStart: Number(header[1]),
        oldLines: Number(header[2] ?? 1),
        newStart: Number(header[3]),
        newLines: Number(header[4] ?? 1),
        lines: [],
      }
      hunks.push(current)
      continue
    }
    if (current && /^[ +-]/.test(line)) {
      current.lines.push(line)
    } else if (current && line === '' && !isHunkFull(current)) {
      current.lines.push(' ')
    }
  }
  return hunks
}

export function relativePath(options: { path: string; root: string }): string {
  const root = options.root.replace(/\/$/, '')
  return options.path.startsWith(root + '/') ? options.path.slice(root.length + 1) : options.path
}

export function parseNumstat(text: string): Map<string, string> {
  const counts = new Map<string, string>()
  for (const line of text.split('\n')) {
    const [added, removed, ...pathParts] = line.split('\t')
    const path = pathParts.join('\t')
    if (added !== undefined && removed !== undefined && path !== '') {
      counts.set(path, `${added}\t${removed}`)
    }
  }
  return counts
}
