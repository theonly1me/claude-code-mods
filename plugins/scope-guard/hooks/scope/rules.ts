import { isMentioned, isOutside, isTemporary, lineCount, relativeTo } from './paths'
import type { Assessment, Change, ChangeKind, Signal, Verdict } from './types'

export const CONFIRM_SCORE = 2
const CLEAR_SCORE = 4
const LARGE_EDIT_LINES = 40
const REWRITE_SHARE = 0.6
const REWRITE_MINIMUM_LINES = 20
const FILE_COMMAND = /(?:^|[;&|(]\s*|\s)(?:sudo\s+)?(git\s+)?(rm|mv)\s+([^;&|]*)/g

export type RuleContext = {
  root: string
  task: string
  isSeen: (path: string) => boolean
  isAllowed: (path: string) => boolean
  editedPaths: ReadonlySet<string>
  isManyFilesFlagged: boolean
  manyFiles: number
}

function changeFor(options: { kind: ChangeKind; tool: string; paths: readonly string[] }): Change {
  return { ...options, removedLines: 0, replacedShare: 0, originalLines: 0 }
}

export function editChange(options: { filePath: string; oldText: string; newText: string }): Change {
  const removedLines = Math.max(0, lineCount(options.oldText) - lineCount(options.newText))
  return { ...changeFor({ kind: 'edit', tool: 'Edit', paths: [options.filePath] }), removedLines }
}

export function notebookChange(options: { filePath: string; mode: string | undefined }): Change {
  return changeFor({ kind: options.mode === 'delete' ? 'delete' : 'edit', tool: 'NotebookEdit', paths: [options.filePath] })
}

export function writeChange(options: { filePath: string; content: string; original: string | undefined }): Change {
  if (options.original === undefined) {
    return changeFor({ kind: 'create', tool: 'Write', paths: [options.filePath] })
  }
  const kept = new Set(options.content.split('\n').map(line => line.trim()))
  const originalLines = options.original.split('\n').map(line => line.trim()).filter(line => line !== '')
  const replaced = originalLines.filter(line => !kept.has(line)).length
  return {
    ...changeFor({ kind: 'write', tool: 'Write', paths: [options.filePath] }),
    originalLines: originalLines.length,
    replacedShare: originalLines.length === 0 ? 0 : replaced / originalLines.length,
  }
}

export function commandChange(command: string): Change | undefined {
  const matches = [...command.matchAll(FILE_COMMAND)]
  const paths = matches.flatMap(match => (match[3] ?? '').split(/\s+/).filter(word => word !== '' && !word.startsWith('-')))
  if (paths.length === 0) {
    return undefined
  }
  const isDelete = matches.some(match => match[2] === 'rm')
  const named = paths.map(path => path.replace(/^['"]|['"]$/g, '')).filter(path => !isTemporary(path))
  return named.length === 0 ? undefined : changeFor({ kind: isDelete ? 'delete' : 'move', tool: 'Bash', paths: named })
}

function pathSignals(options: { change: Change; context: RuleContext }): Signal[] {
  const { change, context } = options
  return change.paths.flatMap((path): Signal[] => {
    const relative = relativeTo({ path, root: context.root })
    if (isTemporary(path) || context.isAllowed(relative) || context.editedPaths.has(relative)) {
      return []
    }
    if (isOutside({ path, root: context.root })) {
      return [{ kind: 'outside', weight: 3, text: `${relative} is outside the project` }]
    }
    if (isMentioned({ path: relative, text: context.task })) {
      return []
    }
    const isSeen = context.isSeen(relative)
    return [{ kind: 'unmentioned', weight: isSeen ? 1 : 2, text: isSeen ? `your request does not mention ${relative}` : `your request does not mention ${relative}, and Claude did not read or search it` }]
  })
}

function kindSignals(options: { change: Change; context: RuleContext }): Signal[] {
  const { change, context } = options
  const signals: Signal[] = []
  if (change.kind === 'delete') {
    signals.push({ kind: 'delete', weight: 3, text: `it deletes ${change.paths.join(', ')}` })
  }
  if (change.kind === 'move') {
    signals.push({ kind: 'move', weight: 2, text: `it moves ${change.paths.join(', ')}` })
  }
  const isRewrite = change.kind === 'write' && change.originalLines >= REWRITE_MINIMUM_LINES && change.replacedShare >= REWRITE_SHARE
  if (isRewrite) {
    signals.push({ kind: 'rewrite', weight: 2, text: `it rewrites ${Math.round(change.replacedShare * 100)}% of a ${change.originalLines}-line file` })
  }
  if (change.kind === 'edit' && change.removedLines >= LARGE_EDIT_LINES) {
    signals.push({ kind: 'rewrite', weight: 2, text: `it removes ${change.removedLines} lines` })
  }
  const fresh = change.paths.map(path => relativeTo({ path, root: context.root })).filter(path => !context.editedPaths.has(path))
  if (!context.isManyFilesFlagged && fresh.length > 0 && context.editedPaths.size + fresh.length >= context.manyFiles) {
    signals.push({ kind: 'many-files', weight: 2, text: `it is file ${context.editedPaths.size + fresh.length} Claude changed this turn` })
  }
  return signals
}

export function assess(options: { change: Change; context: RuleContext }): Assessment {
  const signals = [...pathSignals(options), ...kindSignals(options)]
  return { signals, score: signals.reduce((total, signal) => total + signal.weight, 0) }
}

export function rulesVerdict(score: number): Verdict {
  if (score >= CLEAR_SCORE) {
    return 'clear'
  }
  return score >= CONFIRM_SCORE ? 'mild' : 'in-scope'
}

export function actionOf(change: Change): string {
  const verbs: Record<ChangeKind, string> = { edit: 'edit', create: 'create', write: 'rewrite', delete: 'delete', move: 'move' }
  return verbs[change.kind]
}
