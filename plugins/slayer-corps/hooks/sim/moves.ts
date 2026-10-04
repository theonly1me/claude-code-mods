import type { Attack, AttackKind, SlayerName } from './types'

export type CorpsMember = 'tanjiro' | 'zenitsu' | 'inosuke' | 'nezuko'

export const ROTATION: readonly CorpsMember[] = ['tanjiro', 'zenitsu', 'inosuke', 'nezuko']
const RECENT_LIMIT = 3

const READING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LSP', 'WebFetch', 'WebSearch', 'ToolSearch'])
const WRITING_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit'])
const AGENT_TOOLS = new Set(['Agent', 'Task'])

export const SIGNATURES: Record<CorpsMember, AttackKind> = {
  tanjiro: 'water',
  zenitsu: 'thunder',
  inosuke: 'beast',
  nezuko: 'flame',
}

export const NEZUKO_KICK: Attack = { attacker: 'nezuko', kind: 'flame', damage: 4, style: 'hit', source: 'your prompt' }
export const SUN_DANCE: Attack = { attacker: 'tanjiro', kind: 'sun', damage: 8, style: 'hit', source: 'a finished turn' }

export const FORM_NAMES: Record<AttackKind, string> = {
  water: 'Water Breathing',
  flame: 'Blood Demon Art',
  thunder: 'Thunderclap and Flash',
  beast: 'Beast Breathing',
  blaze: 'Flame Breathing',
  sun: 'Sun Dance',
}

export const DISPLAY_NAMES: Record<SlayerName, string> = {
  tanjiro: 'Tanjiro',
  nezuko: 'Nezuko',
  zenitsu: 'Zenitsu',
  inosuke: 'Inosuke',
  hashira: 'The Flame Hashira',
}

function preferredFor(tool: string): CorpsMember | undefined {
  if (WRITING_TOOLS.has(tool)) {
    return 'inosuke'
  }
  if (tool === 'Bash') {
    return 'zenitsu'
  }
  return READING_TOOLS.has(tool) ? 'tanjiro' : undefined
}

export function damageFor(tool: string): number {
  if (AGENT_TOOLS.has(tool)) {
    return 6
  }
  if (WRITING_TOOLS.has(tool) || tool === 'Bash') {
    return 3
  }
  return READING_TOOLS.has(tool) ? 2 : 1
}

export function pickAttacker(options: { tool: string; recent: readonly CorpsMember[] }): CorpsMember {
  const preferred = preferredFor(options.tool)
  if (preferred && !options.recent.includes(preferred)) {
    return preferred
  }
  return ROTATION.find(name => !options.recent.includes(name)) ?? ROTATION[0] ?? 'tanjiro'
}

export function rememberAttacker(options: { recent: readonly CorpsMember[]; attacker: CorpsMember }): CorpsMember[] {
  return [...options.recent.filter(name => name !== options.attacker), options.attacker].slice(-RECENT_LIMIT)
}

export function workAttack(options: { tool: string; recent: readonly CorpsMember[] }): Attack {
  if (AGENT_TOOLS.has(options.tool)) {
    return { attacker: 'hashira', kind: 'blaze', damage: damageFor(options.tool), style: 'hit', source: options.tool }
  }
  const attacker = pickAttacker(options)
  return { attacker, kind: SIGNATURES[attacker], damage: damageFor(options.tool), style: 'hit', source: options.tool }
}

export function isCorpsMember(name: SlayerName): name is CorpsMember {
  return name !== 'hashira'
}
