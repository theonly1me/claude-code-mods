import { createFarm } from './farm'

export const farm = createFarm()

let root = ''
let baseline: Map<string, number> | undefined
let claudeLines = new Map<string, number>()

export function setProjectRoot(path: string): void {
  root = path.replace(/\/$/, '')
}

export function projectRoot(): string {
  return root
}

export function relativePath(path: string): string {
  return root !== '' && path.startsWith(root + '/') ? path.slice(root.length + 1) : path
}

export function countPatchLines(hunks: readonly { lines: readonly string[] }[]): number {
  return hunks.reduce((total, hunk) => total + hunk.lines.filter(line => line.startsWith('+') || line.startsWith('-')).length, 0)
}

export function noteClaudeChange(options: { path: string; lines: number }): void {
  claudeLines.set(options.path, (claudeLines.get(options.path) ?? 0) + options.lines)
  farm.tend(options)
}

export function parseNumstat(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  text
    .split('\n')
    .map(line => line.split('\t'))
    .forEach(([added, removed, ...rest]) => {
      const path = rest.join('\t')
      if (path !== '' && added !== undefined && removed !== undefined) {
        counts.set(path, (Number(added) || 0) + (Number(removed) || 0))
      }
    })
  return counts
}

export function userChanges(counts: Map<string, number>): { path: string; lines: number }[] {
  const previous = baseline
  const claude = claudeLines
  baseline = counts
  claudeLines = new Map()
  if (!previous) {
    return []
  }
  return [...counts.entries()]
    .map(([path, total]) => ({ path, lines: total - (previous.get(path) ?? 0) - (claude.get(path) ?? 0) }))
    .filter(change => change.lines > 0)
}
