import type { Season } from '../shared/pixel/seasons'
import { FLOOR_TOP, HOME_X, KI_INTERVAL_MS, SAMURAI_TOP, WAVE_DOOM_DELAY_MS, WAVE_STAGGER_MS } from './constants'
import { advanceDuel, attackerOf, createDuel, retreat } from './duel'
import { describeWave, MEDITATION_LINES, pickWave } from './waves'
import type { Activity, Duel, Effect, Monster, MonsterKind, Samurai } from './types'

type AmbientKind = 'kata' | 'meditate' | 'duel' | 'wave' | 'rest'

export type AmbientWorld = {
  samurai: Samurai
  monsters: readonly Monster[]
  effects: Effect[]
  columns: number
  season: Season
  spawn: (plan: { kind: MonsterKind; isElite: boolean; x: number }) => number
  doom: (id: number) => void
  note: (line: string) => void
}

const WEIGHTS: readonly { kind: AmbientKind; weight: number }[] = [
  { kind: 'duel', weight: 3 },
  { kind: 'wave', weight: 3 },
  { kind: 'meditate', weight: 2 },
  { kind: 'kata', weight: 2 },
]

const ACTIVITY: Record<AmbientKind, Activity> = {
  kata: 'kata',
  meditate: 'meditate',
  duel: 'duel',
  wave: 'guard',
  rest: 'guard',
}

const KATA_LINES = ['Practices kata', 'Drills the rising cut', 'Drills the falling cut']

function seeded(seed: number): () => number {
  let state = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0 || 7
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function createAmbient(options: { seed: number }) {
  let random = seeded(options.seed)
  let current: { kind: AmbientKind; ms: number; durationMs: number } = { kind: 'rest', ms: 0, durationMs: 600 }
  let previous: AmbientKind = 'rest'
  let duel: Duel | undefined
  let dooms: { id: number; atMs: number }[] = []
  let sinceKiMs = 0

  function choose(): AmbientKind {
    const choices = WEIGHTS.filter(entry => entry.kind !== previous)
    const total = choices.reduce((sum, entry) => sum + entry.weight, 0)
    let roll = random() * total
    for (const entry of choices) {
      roll -= entry.weight
      if (roll < 0) {
        return entry.kind
      }
    }
    return 'kata'
  }

  function begin(world: AmbientWorld): void {
    const nextKind = current.kind === 'rest' ? choose() : 'rest'
    if (current.kind !== 'rest') {
      previous = current.kind
    }
    current = { kind: nextKind, ms: 0, durationMs: 0 }
    world.samurai.activity = ACTIVITY[nextKind]
    world.samurai.trainingMs = 0
    if (nextKind === 'rest') {
      current.durationMs = 500 + random() * 600
    } else if (nextKind === 'kata') {
      current.durationMs = 5000 + random() * 2500
      world.note(KATA_LINES[Math.floor(random() * KATA_LINES.length)] ?? 'Practices kata')
    } else if (nextKind === 'meditate') {
      current.durationMs = 7000 + random() * 3000
      world.note(MEDITATION_LINES[world.season.name])
    } else if (nextKind === 'duel') {
      duel = createDuel({ columns: world.columns, isWin: random() < 0.7, exchanges: 3 + Math.floor(random() * 4) })
      world.note('A wandering ronin challenges the samurai')
    } else {
      const wave = pickWave(random)
      dooms = wave.map((plan, index) => ({
        id: world.spawn({ ...plan, x: world.columns + 2 + index * 15 }),
        atMs: WAVE_DOOM_DELAY_MS + index * WAVE_STAGGER_MS,
      }))
      world.note(describeWave(wave))
    }
  }

  function advanceDuelIn(step: { world: AmbientWorld; dtMs: number }): boolean {
    const { world, dtMs } = step
    if (!duel) {
      return true
    }
    const outcome = advanceDuel({ duel, dtMs, columns: world.columns })
    if (outcome.didClash) {
      const lean = attackerOf(duel) === 'samurai' ? 1 : -1
      world.effects.push({ kind: 'clang', x: HOME_X + 20 + lean, y: FLOOR_TOP - 8, ageMs: 0 })
    }
    if (outcome.didFinishStrike) {
      world.effects.push({ kind: 'hit', x: duel.rivalX + 4, y: FLOOR_TOP - 7, ageMs: 0 })
      world.note('One clean cut ends the duel')
    }
    if (outcome.didBow) {
      world.note('The duel ends in a bow')
    }
    if (outcome.isOver) {
      duel = undefined
      return true
    }
    return false
  }

  return {
    reseed(seed: number): void {
      random = seeded(seed)
    },

    duel(): Duel | undefined {
      return duel
    },

    interrupt(world: AmbientWorld): void {
      if (duel && !duel.isRetreat && duel.phase !== 'leave' && !duel.hasFinishStruck) {
        retreat(duel)
        world.note('The ronin flees: real work arrives')
      }
      dooms.forEach(entry => world.doom(entry.id))
      dooms = []
      if (current.kind !== 'rest') {
        previous = current.kind
        current = { kind: 'rest', ms: 0, durationMs: 400 }
        world.samurai.activity = 'guard'
      }
    },

    advance(step: { world: AmbientWorld; dtMs: number; hasWork: boolean }): void {
      const { world, dtMs, hasWork } = step
      const isDuelDone = advanceDuelIn({ world, dtMs })
      if (hasWork || world.samurai.mode !== 'train') {
        return
      }
      current.ms += dtMs
      dooms = dooms.filter(entry => {
        if (current.ms < entry.atMs) {
          return true
        }
        world.doom(entry.id)
        return false
      })
      if (current.kind === 'meditate') {
        sinceKiMs += dtMs
        if (sinceKiMs >= KI_INTERVAL_MS) {
          sinceKiMs = 0
          world.effects.push({ kind: 'ki', x: world.samurai.x + 3 + random() * 9, y: SAMURAI_TOP + 6, ageMs: 0 })
        }
      }
      const isWaveDone =
        current.kind === 'wave' && dooms.length === 0 && !world.monsters.some(monster => monster.isAmbient && monster.phase === 'alive')
      const isDone =
        current.kind === 'duel'
          ? isDuelDone
          : current.kind === 'wave'
            ? isWaveDone && current.ms > 1000
            : current.ms >= current.durationMs
      if (isDone) {
        begin(world)
      }
    },
  }
}

export type Ambient = ReturnType<typeof createAmbient>
