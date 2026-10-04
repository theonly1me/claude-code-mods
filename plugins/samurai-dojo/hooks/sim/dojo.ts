import { clearBitmap, createBitmap } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { drawScene } from '../draw/scene'
import {
  FLOOR_TOP,
  FLURRY_KILLS,
  FLURRY_WINDOW_MS,
  HURT_MS,
  MAX_ALIVE_MONSTERS,
  MAX_COLUMNS,
  STAGE_HEIGHT,
} from './constants'
import { advanceEffects } from './effects'
import { advanceMonsters, applyStrike, createMonster, nearestDoomed } from './monsters'
import { rankOf } from './rank'
import type { Rank } from './rank'
import { advanceSamurai, createSamurai } from './samurai'
import type { Effect, KillEvent, KillTally, Monster, MonsterPlan } from './types'

export function createDojo() {
  const samurai = createSamurai()
  const overflowPlans = new Map<number, MonsterPlan>()
  const pendingKills: KillEvent[] = []
  let monsters: Monster[] = []
  let effects: Effect[] = []
  let tally: KillTally = { codex: 0, gemini: 0 }
  let lifetimeKills = 0
  let recentKillTimes: number[] = []
  let flurries = 0
  let nextId = 1
  let columns = MAX_COLUMNS
  let bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })

  function noteFlurry(): void {
    recentKillTimes = [...recentKillTimes, samurai.clockMs].filter(
      time => samurai.clockMs - time <= FLURRY_WINDOW_MS,
    )
    if (recentKillTimes.length < FLURRY_KILLS) {
      return
    }
    recentKillTimes = []
    flurries += 1
    effects.push({ kind: 'flurry', x: samurai.x + 14, y: FLOOR_TOP - 6, ageMs: 0 })
  }

  function recordKill(plan: MonsterPlan): void {
    tally = { ...tally, [plan.kind]: tally[plan.kind] + 1 }
    lifetimeKills += 1
    pendingKills.push({ kind: plan.kind, isElite: plan.isElite })
    noteFlurry()
  }

  function resolveImpact(target: Monster): void {
    const outcome = applyStrike(target)
    const impact = { x: target.x + 1, y: FLOOR_TOP - 6, ageMs: 0 }
    if (outcome === 'killed') {
      effects.push({ ...impact, kind: 'hit' })
      recordKill(target)
      return
    }
    effects.push({ ...impact, kind: 'clang' })
    samurai.hurtMs = HURT_MS
  }

  return {
    resize(nextColumns: number): void {
      if (nextColumns === columns) {
        return
      }
      columns = nextColumns
      bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
    },

    restore(saved: { tally: KillTally; lifetimeKills: number }): void {
      tally = { codex: saved.tally.codex, gemini: saved.tally.gemini }
      lifetimeKills = saved.lifetimeKills
    },

    tally(): KillTally {
      return tally
    },

    lifetimeKills(): number {
      return lifetimeKills
    },

    flurries(): number {
      return flurries
    },

    rank(): Rank {
      return rankOf(lifetimeKills)
    },

    spawn(options: { isElite: boolean }): number {
      const id = nextId
      nextId += 1
      const kind = id % 2 === 1 ? 'codex' : 'gemini'
      const aliveCount = monsters.filter(monster => monster.phase === 'alive').length
      if (aliveCount >= MAX_ALIVE_MONSTERS) {
        overflowPlans.set(id, { kind, isElite: options.isElite })
        return id
      }
      monsters.push(createMonster({ id, kind, isElite: options.isElite, x: columns }))
      return id
    },

    defeat(options: { id: number; isFailure: boolean }): void {
      const monster = monsters.find(candidate => candidate.id === options.id)
      if (monster) {
        monster.isDoomed = true
        monster.hitsRemaining = (monster.isElite ? 2 : 1) + (options.isFailure ? 1 : 0)
        return
      }
      const plan = overflowPlans.get(options.id)
      if (plan) {
        overflowPlans.delete(options.id)
        recordKill(plan)
      }
    },

    celebrate(): void {
      samurai.isCheerRequested = true
    },

    tick(options: { dtMs: number }): KillEvent[] {
      const { dtMs } = options
      const target = nearestDoomed(monsters)
      const step = advanceSamurai({ samurai, dtMs, target })
      if (step.didStartDash) {
        effects.push({ kind: 'dust', x: samurai.x + 2, y: FLOOR_TOP - 1, ageMs: 0 })
      }
      if (step.didImpact && target) {
        resolveImpact(target)
      }
      monsters = advanceMonsters({ monsters, dtMs })
      effects = advanceEffects({ effects, dtMs })
      return pendingKills.splice(0, pendingKills.length)
    },

    frame(): Bitmap {
      clearBitmap(bitmap)
      drawScene({
        bitmap,
        monsters,
        effects,
        samurai,
        totalKills: tally.codex + tally.gemini,
        rank: rankOf(lifetimeKills),
      })
      return bitmap
    },
  }
}

export type Dojo = ReturnType<typeof createDojo>
