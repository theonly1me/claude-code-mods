export type SlayerName = 'tanjiro' | 'nezuko' | 'zenitsu' | 'inosuke' | 'hashira'

export type AttackKind = 'water' | 'flame' | 'thunder' | 'beast' | 'blaze' | 'sun'

export type MoveStyle = 'hit' | 'clash' | 'feint' | 'form' | 'dodge' | 'doze'

export type Attack = { attacker: SlayerName; kind: AttackKind; damage: number; style: MoveStyle; source: string }

export type ActorMode = 'home' | 'dash' | 'strike' | 'return' | 'stagger' | 'offstage' | 'hop' | 'doze'

export type Actor = {
  name: SlayerName
  homeX: number
  x: number
  lift: number
  mode: ActorMode
  modeMs: number
  attack: Attack | undefined
  hasStruck: boolean
}

export type DemonShape = 'brute' | 'lantern' | 'spider' | 'lanky' | 'vase' | 'moon' | 'muzan'

export type Backdrop = 'snow' | 'market' | 'hall' | 'forest' | 'train' | 'town' | 'castle'

export type ParticleKind = 'water' | 'ember' | 'spark' | 'ash' | 'blade' | 'snow' | 'claw' | 'parry'

export type Particle = {
  kind: ParticleKind
  x: number
  y: number
  velocityX: number
  velocityY: number
  ageMs: number
  lifeMs: number
  color: number
}

export type StoryEvent =
  | { kind: 'defeated'; chapter: number }
  | { kind: 'chapter'; chapter: number }
  | { kind: 'dawn' }
  | { kind: 'regroup' }

export type Progress = {
  cycle: number
  chapter: number
  demonHp: number
  attacks: number
  defeated: number
  dawns: number
}

export type BattlePhase = 'fighting' | 'dying' | 'arriving' | 'dawn'
