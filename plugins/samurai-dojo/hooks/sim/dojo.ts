import { clearBitmap, createBitmap } from '../render/bitmap'
import type { Bitmap } from '../render/bitmap'
import { drawScene } from '../draw/scene'
import {
  FLOOR_TOP,
  HURT_MS,
  MAX_ALIVE_MONSTERS,
  MAX_COLUMNS,
  STAGE_HEIGHT,
} from './constants'
import { advanceEffects } from './effects'
import { advanceMonsters, applyStrike, createMonster, nearestDoomed } from './monsters'
import { advanceSamurai, createSamurai } from './samurai'
import type { Effect, KillEvent, KillTally, Monster, MonsterPlan } from './types'

export function createDojo() {
  const samurai = createSamurai()
  const overflowPlans = new Map<number, MonsterPlan>()
  const pendingKills: KillEvent[] = []
  let monsters: Monster[] = []
  let effects: Effect[] = []
  let tally: KillTally = { codex: 0, gemini: 0 }
  let nextId = 1
  let columns = MAX_COLUMNS
  let bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })

  function recordKill(plan: MonsterPlan): void {
    tally = { ...tally, [plan.kind]: tally[plan.kind] + 1 }
    pendingKills.push({ kind: plan.kind, isElite: plan.isElite })
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
    hasCombat(): boolean { return monsters.length > 0 },

    resize(nextColumns: number): void {
      if (nextColumns === columns) {
        return
      }
      columns = nextColumns
      bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
    },

    restore(saved: KillTally): void {
      tally = { codex: saved.codex, gemini: saved.gemini }
    },

    tally(): KillTally {
      return tally
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
      })
      return bitmap
    },
  }
}

export type Dojo = ReturnType<typeof createDojo>
