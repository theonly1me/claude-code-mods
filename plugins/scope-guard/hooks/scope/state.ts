import { baseName, isUnderFolder, pathTokens, relativeTo } from './paths'
import type { Flag, FlagStatus, ScopeMode, ScopeSettings } from './types'

const KEPT_PROMPTS = 3
const KEPT_FLAGS = 20
const NARRATION_CHARACTERS = 1200
const SCANNED_OUTPUT_CHARACTERS = 6000

type ScopeState = {
  root: string
  settings: ScopeSettings
  mode: ScopeMode
  prompts: string[]
  seenPaths: Set<string>
  editedPaths: Set<string>
  isManyFilesFlagged: boolean
  allowedPaths: Set<string>
  allowedFolders: Set<string>
  narration: string
  flags: Flag[]
  nextFlagId: number
  isWorking: boolean
}

function initialState(): ScopeState {
  return {
    root: '',
    settings: { mode: 'ask', confirmModel: 'claude-sonnet-5-5', manyFiles: 8 },
    mode: 'ask',
    prompts: [],
    seenPaths: new Set(),
    editedPaths: new Set(),
    isManyFilesFlagged: false,
    allowedPaths: new Set(),
    allowedFolders: new Set(),
    narration: '',
    flags: [],
    nextFlagId: 1,
    isWorking: false,
  }
}

let scope = initialState()

export function resetScope(): void {
  scope = initialState()
}

export function scopeView(): Readonly<ScopeState> {
  return scope
}

export function configureScope(settings: ScopeSettings): void {
  scope.settings = settings
  scope.mode = settings.mode
}

export function setRoot(root: string): void {
  scope.root = root
}

export function setMode(mode: ScopeMode): void {
  scope.mode = mode
}

export function taskText(): string {
  return scope.prompts.join('\n\n')
}

export function recordPrompt(options: { text: string; isNewTask: boolean }): void {
  if (options.isNewTask) {
    scope.allowedPaths = new Set()
    scope.allowedFolders = new Set()
    scope.flags = scope.flags.map(flag => (flag.status === 'open' ? { ...flag, status: 'dropped' } : flag))
  }
  scope.prompts = [...scope.prompts, options.text.trim()].slice(-KEPT_PROMPTS)
}

export function startTurn(): void {
  scope.seenPaths = new Set()
  scope.editedPaths = new Set()
  scope.isManyFilesFlagged = false
  scope.narration = ''
  scope.isWorking = true
}

export function endTurn(): void {
  scope.isWorking = false
}

export function noteNarration(text: string): void {
  scope.narration = (scope.narration + text).slice(-NARRATION_CHARACTERS)
}

export function noteSeen(text: string): void {
  pathTokens(text.slice(0, SCANNED_OUTPUT_CHARACTERS)).forEach(token => {
    scope.seenPaths.add(relativeTo({ path: token, root: scope.root }))
  })
}

export function isSeen(path: string): boolean {
  return scope.seenPaths.has(path) || [...scope.seenPaths].some(seen => seen.endsWith(`/${path}`) || baseName(seen) === baseName(path))
}

export function noteEdited(paths: readonly string[]): void {
  paths.forEach(path => scope.editedPaths.add(relativeTo({ path, root: scope.root })))
}

export function markManyFilesFlagged(): void {
  scope.isManyFilesFlagged = true
}

export function isAllowed(path: string): boolean {
  return scope.allowedPaths.has(path) || [...scope.allowedFolders].some(folder => isUnderFolder({ path, folder }))
}

export function allowPath(path: string): void {
  scope.allowedPaths.add(path)
}

export function allowFolder(folder: string): void {
  scope.allowedFolders.add(folder)
}

export function addFlag(options: Omit<Flag, 'id'>): Flag {
  const flag = { ...options, id: scope.nextFlagId }
  scope.nextFlagId += 1
  scope.flags = [...scope.flags, flag].slice(-KEPT_FLAGS)
  return flag
}

export function openFlags(): Flag[] {
  return scope.flags.filter(flag => flag.status === 'open')
}

export function resolveFlag(options: { id: number; status: FlagStatus }): void {
  scope.flags = scope.flags.map(flag => (flag.id === options.id ? { ...flag, status: options.status } : flag))
}

export function resolveFolder(folder: string): void {
  scope.flags = scope.flags.map(flag =>
    flag.status === 'open' && isUnderFolder({ path: flag.path, folder }) ? { ...flag, status: 'allowed' } : flag,
  )
}
