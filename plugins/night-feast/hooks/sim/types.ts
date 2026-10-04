export type Palette = 0 | 1 | 2

export type VillagerState = 'walking' | 'bitten' | 'dizzy'

export type Villager = {
  id: number
  x: number
  direction: 1 | -1
  palette: Palette
  state: VillagerState
  stateMs: number
  walkMs: number
}

export type VampireMode = 'idle' | 'flying' | 'feeding' | 'returning' | 'recoil' | 'perched'

export type Vampire = {
  x: number
  lift: number
  mode: VampireMode
  modeMs: number
  facing: 1 | -1
  targetId: number | undefined
  clockMs: number
  destinationX: number
  landsPerched: boolean
}

export type EffectKind = 'poof' | 'spark' | 'fume' | 'drop'

export type Effect = { kind: EffectKind; x: number; y: number; ageMs: number; seed: number }

export type SkyState = { percent: number | null; night: number }

export type MeasureOutcome = { toast: string | undefined; isNewNight: boolean }

export type NightStats = {
  blood: number
  feeds: number
  garlic: number
  lifetimeFeeds: number
  night: number
  percent: number | null
}
