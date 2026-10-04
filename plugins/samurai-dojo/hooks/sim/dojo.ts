import { clearBitmap, createBitmap } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { nextSeasonIn, seasonAt } from '../shared/pixel/seasons'
import type { Season } from '../shared/pixel/seasons'
import { createWeather } from '../shared/pixel/weather'
import { drawScene, treeCenterOf } from '../draw/scene'
import { createAmbient } from './ambient'
import type { AmbientWorld } from './ambient'
import { FLOOR_TOP, HURT_MS, MAX_ALIVE_MONSTERS, MAX_COLUMNS, STAGE_HEIGHT } from './constants'
import { advanceEffects } from './effects'
import { createLedger } from './ledger'
import { advanceMonsters, applyStrike, createMonster, nearestDoomed } from './monsters'
import { rankOf } from './rank'
import type { Rank } from './rank'
import { advanceSamurai, createSamurai } from './samurai'
import type { Effect, KillEvent, KillTally, Monster, MonsterKind, MonsterPlan } from './types'
import { singularOf } from './waves'

const KIND_ORDER: readonly [MonsterKind, ...MonsterKind[]] = ['codex', 'gemini', 'chatgpt']

export function createDojo(options: { seed?: number } = {}) {
  const seed = options.seed ?? 11
  const samurai = createSamurai()
  const ambient = createAmbient({ seed })
  const weather = createWeather({ seed: seed + 5 })
  const ledger = createLedger()
  const overflowPlans = new Map<number, MonsterPlan>()
  let monsters: Monster[] = []
  let effects: Effect[] = []
  let nextId = 1
  let columns = MAX_COLUMNS
  let bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
  let epochMs = 0
  let season: Season = seasonAt(0)

  function recordKill(plan: MonsterPlan): void {
    if (ledger.recordKill({ plan, clockMs: samurai.clockMs }).isFlurry) {
      effects.push({ kind: 'flurry', x: samurai.x + 14, y: FLOOR_TOP - 6, ageMs: 0 })
    }
  }

  function resolveImpact(target: Monster): void {
    const outcome = applyStrike(target)
    const impact = { x: target.x + 1, y: FLOOR_TOP - 6, ageMs: 0 }
    if (outcome === 'parried') {
      effects.push({ ...impact, kind: 'clang' })
      samurai.hurtMs = HURT_MS
      return
    }
    effects.push({ ...impact, kind: 'hit' })
    if (!target.isAmbient) {
      recordKill(target)
    }
  }

  function takeId(): number {
    const id = nextId
    nextId += 1
    return id
  }

  const world: AmbientWorld = {
    samurai,
    monsters,
    effects,
    columns,
    season,
    spawn: plan => {
      const id = takeId()
      monsters.push(createMonster({ ...plan, id, isAmbient: true, label: 'Ambient' }))
      return id
    },
    doom: id => {
      const monster = monsters.find(candidate => candidate.id === id)
      if (monster && !monster.isDoomed) {
        monster.isDoomed = true
        monster.hitsRemaining = monster.isElite ? 2 : 1
      }
    },
    note: ledger.note,
  }

  return {
    begin(startMs: number): void {
      epochMs = startMs
      season = seasonAt(epochMs)
      ambient.reseed(seed + Math.floor(startMs / 1000))
    },

    resize(nextColumns: number): void {
      if (nextColumns !== columns) {
        columns = nextColumns
        bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
      }
    },

    restore: ledger.restore,
    tally: (): KillTally => ledger.tally(),
    lifetimeKills: (): number => ledger.lifetimeKills(),
    flurries: (): number => ledger.flurries(),
    rank: (): Rank => rankOf(ledger.lifetimeKills()),
    season: (): Season => season,
    log: (): readonly string[] => ledger.lines(),

    summary(): string {
      const upcoming = nextSeasonIn(epochMs + samurai.clockMs)
      const minutes = Math.max(1, Math.ceil(upcoming.remainingMs / 60000))
      const lifetime = ledger.lifetimeKills()
      return `${rankOf(lifetime).title}  ${ledger.slain()} slain  ${lifetime} lifetime  ${season.label}, ${upcoming.label} in ${minutes}m`
    },

    spawn(plan: { isElite: boolean; label: string }): number {
      const id = takeId()
      const kind = KIND_ORDER[(id - 1) % KIND_ORDER.length] ?? 'codex'
      const aliveCount = monsters.filter(monster => monster.phase === 'alive').length
      if (aliveCount >= MAX_ALIVE_MONSTERS) {
        overflowPlans.set(id, { kind, isElite: plan.isElite, label: plan.label })
        return id
      }
      monsters.push(createMonster({ id, kind, isElite: plan.isElite, isAmbient: false, label: plan.label, x: columns }))
      return id
    },

    defeat(outcome: { id: number; isFailure: boolean }): void {
      const monster = monsters.find(candidate => candidate.id === outcome.id)
      if (monster) {
        monster.isDoomed = true
        monster.hitsRemaining = (monster.isElite ? 2 : 1) + (outcome.isFailure ? 1 : 0)
        if (outcome.isFailure) {
          ledger.note(`${monster.label} failed: the ${singularOf(monster.kind)} parries once`)
        }
        return
      }
      const plan = overflowPlans.get(outcome.id)
      if (plan) {
        overflowPlans.delete(outcome.id)
        recordKill(plan)
      }
    },

    celebrate(): void {
      samurai.isCheerRequested = true
      ledger.note('Turn complete: the samurai salutes')
    },

    tick(step: { dtMs: number }): KillEvent[] {
      const { dtMs } = step
      const nextSeason = seasonAt(epochMs + samurai.clockMs + dtMs)
      if (nextSeason.name !== season.name) {
        ledger.note(`${nextSeason.label} begins`)
      }
      season = nextSeason
      const hasWork =
        monsters.some(monster => !monster.isAmbient && monster.phase === 'alive') ||
        overflowPlans.size > 0 ||
        samurai.isCheerRequested
      Object.assign(world, { monsters, effects, columns, season })
      if (hasWork) {
        ambient.interrupt(world)
      }
      ambient.advance({ world, dtMs, hasWork })
      const target = nearestDoomed(monsters)
      const samuraiStep = advanceSamurai({ samurai, dtMs, target })
      if (samuraiStep.didStartDash) {
        effects.push({ kind: 'dust', x: samurai.x + 2, y: FLOOR_TOP - 1, ageMs: 0 })
      }
      if (samuraiStep.didImpact && target) {
        resolveImpact(target)
      }
      monsters = advanceMonsters({ monsters, dtMs })
      effects = advanceEffects({ effects, dtMs })
      const crown = { x: treeCenterOf(columns) - 7, y: 1, width: 15, height: 8 }
      weather.advance({ dtMs, season, width: columns, groundY: FLOOR_TOP, sources: [crown] })
      return ledger.takeKills()
    },

    frame(): Bitmap {
      clearBitmap(bitmap)
      drawScene({
        bitmap,
        monsters,
        effects,
        samurai,
        duel: ambient.duel(),
        totalKills: ledger.slain(),
        rank: rankOf(ledger.lifetimeKills()),
        season,
        weather,
      })
      return bitmap
    },
  }
}

export type Dojo = ReturnType<typeof createDojo>
