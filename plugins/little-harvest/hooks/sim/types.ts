export type CropKind = 'pumpkin' | 'corn' | 'sunflower' | 'tulip' | 'wheat' | 'carrot'

export type GrowthStage = 'seed' | 'sprout' | 'growing' | 'ripe'

export type Plot = {
  path: string
  crop: CropKind
  lines: number
  isWilted: boolean
  plantedOrder: number
  touchedOrder: number
}

export type FarmerTask =
  | 'idle'
  | 'hoe'
  | 'water'
  | 'weed'
  | 'lift'
  | 'drop'
  | 'feed'
  | 'shoo'
  | 'rest'
  | 'inspect'
  | 'cheer'

export type FarmerMode = 'walk' | FarmerTask

export type FarmerStep = {
  task: FarmerTask
  x: number
  durationMs: number
  isCarrying: boolean
  isWork: boolean
  isFacingLeft?: boolean
}

export type Farmer = {
  x: number
  mode: FarmerMode
  modeMs: number
  clockMs: number
  isFacingLeft: boolean
  isCarrying: boolean
  step: FarmerStep | undefined
}

export type ChickenMode = 'walk' | 'peck' | 'stand'

export type Chicken = {
  x: number
  targetX: number
  mode: ChickenMode
  modeMs: number
  limitMs: number
  isFacingLeft: boolean
  isBrown: boolean
}

export type CrowMode = 'away' | 'arrive' | 'perch' | 'leave'

export type Crow = {
  mode: CrowMode
  modeMs: number
  limitMs: number
  fromX: number
  fromY: number
  x: number
  y: number
  perchX: number
}

export type CatMode = 'nap' | 'stretch' | 'walk'

export type Cat = { x: number; targetX: number; mode: CatMode; modeMs: number; limitMs: number; isFacingLeft: boolean }

export type WeatherKind = 'clear' | 'storm' | 'sunny'

export type TestWeather = { kind: WeatherKind; ms: number }

export type Pop = { fromX: number; toX: number; ageMs: number; color: number }

export type Harvest = { count: number; ageMs: number }

export type Cloud = { x: number; y: number; width: number; speed: number }

export type PlotView = { plot: Plot; x: number }

export type FarmSummary = {
  plots: number
  ripe: number
  sessionBushels: number
  lifetimeBushels: number
}
