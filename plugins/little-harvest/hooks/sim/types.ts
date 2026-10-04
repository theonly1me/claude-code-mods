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

export type FarmerMode = 'idle' | 'walk' | 'hoe' | 'cheer'

export type FarmerGoal = 'hoe' | 'rest'

export type Farmer = {
  x: number
  targetX: number
  goal: FarmerGoal
  mode: FarmerMode
  modeMs: number
  clockMs: number
  isFacingLeft: boolean
}

export type WeatherKind = 'clear' | 'storm' | 'sunny'

export type Weather = { kind: WeatherKind; ms: number }

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
