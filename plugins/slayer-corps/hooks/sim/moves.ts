import type { Attack } from './types'

const READING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LSP', 'WebFetch', 'WebSearch', 'ToolSearch'])
const WRITING_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit'])
const AGENT_TOOLS = new Set(['Agent', 'Task'])

export const NEZUKO_KICK: Attack = { attacker: 'nezuko', kind: 'flame', damage: 4 }
export const SUN_DANCE: Attack = { attacker: 'tanjiro', kind: 'sun', damage: 8 }

export function attackFor(tool: string): Attack {
  if (WRITING_TOOLS.has(tool)) {
    return { attacker: 'inosuke', kind: 'beast', damage: 3 }
  }
  if (tool === 'Bash') {
    return { attacker: 'zenitsu', kind: 'thunder', damage: 3 }
  }
  if (AGENT_TOOLS.has(tool)) {
    return { attacker: 'hashira', kind: 'blaze', damage: 6 }
  }
  return { attacker: 'tanjiro', kind: 'water', damage: READING_TOOLS.has(tool) ? 2 : 1 }
}

export const FORM_NAMES: Record<Attack['kind'], string> = {
  water: 'Water Breathing',
  flame: 'Blood Demon Art',
  thunder: 'Thunderclap and Flash',
  beast: 'Beast Breathing',
  blaze: 'Flame Breathing',
  sun: 'Sun Dance',
}
