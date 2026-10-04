import { meter } from '../shared/text/meter'
import { AMBIENT_NOW, isAmbientAllowed } from './ambient'
import { growthOf, nextGrowthOf } from './growth'
import { moodOf } from './stats'
import type { Activity, FamiliarState } from './types'

const ACTIVITY_NOW: Record<Activity, string> = {
  idle: 'looking around',
  read: 'reading with Claude',
  edit: 'typing with Claude',
  test: 'watching the tests',
  thinking: 'thinking with Claude',
}

export function doingOf(state: FamiliarState): string {
  if (state.isSleeping) {
    return 'asleep'
  }
  const { kind } = state.ambient
  if (kind !== 'look' && isAmbientAllowed(state)) {
    return AMBIENT_NOW[kind]
  }
  if (growthOf(state.lifetimeXp).form === 'egg') {
    return 'waiting to hatch'
  }
  return ACTIVITY_NOW[state.activity]
}

export function summaryOf(state: FamiliarState): string {
  const { stats } = state
  return [
    `${growthOf(state.lifetimeXp).title}, ${moodOf(state)}`,
    `fullness ${Math.round(stats.fullness)}`,
    `joy ${Math.round(stats.joy)}`,
    `energy ${Math.round(stats.energy)}`,
    doingOf(state),
  ].join('  ')
}

function statRow(options: { label: string; value: number }): string {
  return `${options.label.padEnd(9)}${meter({ value: options.value, max: 100, width: 16 })} ${String(Math.round(options.value)).padStart(3)}`
}

export function reportOf(state: FamiliarState): string[] {
  const { stats, lifetimeXp } = state
  const next = nextGrowthOf(lifetimeXp)
  const growthLine = next
    ? `XP ${lifetimeXp}. ${next.minimumXp - lifetimeXp} more to become a ${next.title}.`
    : `XP ${lifetimeXp}. Fully grown.`
  return [
    `Your familiar is a ${growthOf(lifetimeXp).title}, and it is ${moodOf(state)}.`,
    statRow({ label: 'fullness', value: stats.fullness }),
    statRow({ label: 'joy', value: stats.joy }),
    statRow({ label: 'energy', value: stats.energy }),
    growthLine,
    'It eats when your tests pass, cheers when a turn finishes, plays while you are quiet, and naps after five quiet minutes.',
  ]
}
