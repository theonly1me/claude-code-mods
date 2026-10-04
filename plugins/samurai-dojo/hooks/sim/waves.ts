import type { SeasonName } from '../shared/pixel/seasons'
import type { MonsterKind } from './types'

export type WavePlan = { kind: MonsterKind; isElite: boolean }

const NAMES: Record<MonsterKind, { one: string; many: string }> = {
  codex: { one: 'Codex pod', many: 'Codex pods' },
  gemini: { one: 'Gemini star', many: 'Gemini stars' },
  chatgpt: { one: 'ChatGPT orb', many: 'ChatGPT orbs' },
}

export const MEDITATION_LINES: Record<SeasonName, string> = {
  winter: 'Meditates in the falling snow',
  blossom: 'Meditates beneath the cherry blossoms',
  summer: 'Meditates among the fireflies',
  autumn: 'Meditates under the red leaves',
}

export function singularOf(kind: MonsterKind): string {
  return NAMES[kind].one
}

export function nameOf(options: { kind: MonsterKind; count: number }): string {
  const name = NAMES[options.kind]
  return options.count === 1 ? `a ${name.one}` : `${options.count} ${name.many}`
}

function kindFor(roll: number): MonsterKind {
  if (roll < 0.45) {
    return 'chatgpt'
  }
  return roll < 0.8 ? 'gemini' : 'codex'
}

export function pickWave(random: () => number): WavePlan[] {
  const count = 2 + Math.floor(random() * 3)
  const hasCaptain = random() < 0.2
  return Array.from({ length: count }, (_, index) => ({
    kind: kindFor(random()),
    isElite: hasCaptain && index === 0,
  }))
}

export function describeWave(wave: readonly WavePlan[]): string {
  const kinds: MonsterKind[] = ['chatgpt', 'gemini', 'codex']
  const parts = kinds
    .map(kind => ({ kind, count: wave.filter(plan => plan.kind === kind).length }))
    .filter(part => part.count > 0)
    .map(part => nameOf(part))
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1) ?? ''}` : (parts[0] ?? '')
  const captain = wave.some(plan => plan.isElite) ? ', led by a crowned captain' : ''
  const sentence = `${list} attack${captain}`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}
