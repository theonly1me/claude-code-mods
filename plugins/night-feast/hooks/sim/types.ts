export type Palette = 0 | 1 | 2

export type VillagerState = 'walking' | 'bitten' | 'dizzy' | 'fleeing' | 'inside'

export type Villager = {
  id: number
  x: number
  direction: 1 | -1
  palette: Palette
  state: VillagerState
  stateMs: number
  walkMs: number
  doorX: number
}

export type VampireMode =
  | 'idle'
  | 'flying'
  | 'feeding'
  | 'returning'
  | 'recoil'
  | 'perched'
  | 'stalking'
  | 'hiding'
  | 'cruising'
  | 'roosting'

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

export type ActivityKind = 'stalk' | 'perch' | 'swoop' | 'shadow' | 'chase'

export type Activity = {
  kind: ActivityKind
  stage: number
  stageMs: number
  originX: number
  goalX: number
  preyId: number | undefined
}

export type VignetteKind = 'owl' | 'moonbats' | 'cat'

export type Vignette = { kind: VignetteKind; ageMs: number; lengthMs: number }

export type Cloud = { x: number; y: number; width: number; speed: number }

export type Scenery = {
  clockMs: number
  vignette: Vignette | undefined
  restMs: number
  clouds: Cloud[]
}

export type EffectKind = 'poof' | 'spark' | 'fume' | 'drop' | 'alarm' | 'light'

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
