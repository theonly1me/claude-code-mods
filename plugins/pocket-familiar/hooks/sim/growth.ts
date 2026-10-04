import type { Growth } from './types'

const STAGES: readonly [Growth, ...Growth[]] = [
  { form: 'egg', tails: 0, title: 'speckled egg', minimumXp: 0 },
  { form: 'kit', tails: 1, title: 'fox kit', minimumXp: 20 },
  { form: 'fox', tails: 1, title: 'fox spirit', minimumXp: 120 },
  { form: 'fox', tails: 2, title: 'two-tailed fox', minimumXp: 300 },
  { form: 'fox', tails: 3, title: 'three-tailed fox', minimumXp: 600 },
  { form: 'fox', tails: 4, title: 'four-tailed fox', minimumXp: 1000 },
  { form: 'fox', tails: 5, title: 'five-tailed fox', minimumXp: 1500 },
  { form: 'fox', tails: 6, title: 'six-tailed fox', minimumXp: 2200 },
  { form: 'fox', tails: 7, title: 'seven-tailed fox', minimumXp: 3000 },
  { form: 'fox', tails: 8, title: 'eight-tailed fox', minimumXp: 4000 },
  { form: 'fox', tails: 9, title: 'nine-tailed kitsune', minimumXp: 5500 },
]

export function growthOf(lifetimeXp: number): Growth {
  return STAGES.reduce<Growth>((current, stage) => (lifetimeXp >= stage.minimumXp ? stage : current), STAGES[0])
}

export function nextGrowthOf(lifetimeXp: number): Growth | undefined {
  return STAGES.find(stage => stage.minimumXp > lifetimeXp)
}

export function hatchProgress(lifetimeXp: number): number {
  const kit = STAGES[1]
  return kit ? Math.min(1, lifetimeXp / kit.minimumXp) : 1
}
