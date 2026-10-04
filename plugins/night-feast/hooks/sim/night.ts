import { drawScene } from '../draw/scene'
import { clearBitmap, createBitmap } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import {
  CASTLE_WIDTH,
  FEED_BLOOD,
  FEET_Y,
  GARLIC_BLOOD,
  HUNGER_MS,
  MAX_COLUMNS,
  MAX_QUEUED_FEEDS,
  MAX_VILLAGERS,
  MIN_VILLAGERS,
  STAGE_HEIGHT,
  VIAL_BOTTOM_Y,
  VIAL_DROP_X,
} from './constants'
import { advanceEffects } from './effects'
import { createSky } from './sky'
import type { Effect, EffectKind, MeasureOutcome, NightStats, Villager } from './types'
import { advanceVampire, createVampire, recoil } from './vampire'
import { advanceVillagers, biteVillager, createVillager, nearestWalking } from './villagers'

const SPAWN_COOLDOWN_MS = 1500
const PERCH_OFFSET = 12

export function createNight() {
  const sky = createSky()
  const vampire = createVampire()
  let villagers: Villager[] = []
  let effects: Effect[] = []
  let nextId = 1
  let queuedFeeds = 0
  let isPerchRequested = false
  let blood = 50
  let feeds = 0
  let garlicHits = 0
  let lifetimeFeeds = 0
  let finishedFeeds = 0
  let hungerMs = 0
  let spawnCooldownMs = 0
  let columns = MAX_COLUMNS
  let bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })

  function addEffect(options: { kind: EffectKind; x: number; y: number }): void {
    effects.push({ ...options, ageMs: 0, seed: (effects.length * 1.37 + nextId) % 6.28 })
  }

  function spawnVillager(): void {
    if (villagers.length < MAX_VILLAGERS) {
      villagers.push(createVillager({ id: nextId, width: columns }))
      nextId += 1
    }
  }

  function completeFeed(): void {
    feeds += 1
    lifetimeFeeds += 1
    finishedFeeds += 1
    blood = Math.min(100, blood + FEED_BLOOD)
  }

  function keepVillagersAround(dtMs: number): void {
    spawnCooldownMs = Math.max(0, spawnCooldownMs - dtMs)
    const walking = villagers.filter(villager => villager.state === 'walking').length
    if (spawnCooldownMs === 0 && (walking < MIN_VILLAGERS || walking < queuedFeeds)) {
      spawnVillager()
      spawnCooldownMs = SPAWN_COOLDOWN_MS
    }
  }

  return {
    resize(nextColumns: number): void {
      if (nextColumns !== columns) {
        columns = nextColumns
        bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
      }
    },

    restore(saved: { lifetimeFeeds: number; feeds: number; garlic: number; night: number }): void {
      lifetimeFeeds = saved.lifetimeFeeds
      feeds = saved.feeds
      garlicHits = saved.garlic
      sky.restoreNight(saved.night)
    },

    measure(percent: number | null): MeasureOutcome {
      return sky.measure(percent)
    },

    compacted(): void {
      sky.compacted()
    },

    feed(): void {
      if (queuedFeeds >= MAX_QUEUED_FEEDS) {
        completeFeed()
        return
      }
      queuedFeeds += 1
    },

    garlic(): void {
      garlicHits += 1
      blood = Math.max(0, blood - GARLIC_BLOOD)
      addEffect({ kind: 'fume', x: Math.round(vampire.x) + (vampire.facing === 1 ? 11 : -3), y: FEET_Y - 3 })
      addEffect({ kind: 'drop', x: VIAL_DROP_X, y: VIAL_BOTTOM_Y })
      recoil(vampire)
    },

    arrive(): void {
      spawnVillager()
    },

    celebrate(): void {
      isPerchRequested = true
    },

    stats(): NightStats {
      const { percent, night } = sky.state()
      return { blood, feeds, garlic: garlicHits, lifetimeFeeds, night, percent }
    },

    tick(options: { dtMs: number }): number {
      const { dtMs } = options
      hungerMs += dtMs
      if (hungerMs >= HUNGER_MS) {
        hungerMs = 0
        blood = Math.max(0, blood - 1)
      }
      keepVillagersAround(dtMs)
      const target = queuedFeeds > 0 ? nearestWalking({ villagers, x: vampire.x }) : undefined
      const perchX = isPerchRequested && queuedFeeds === 0 ? columns - CASTLE_WIDTH - PERCH_OFFSET : undefined
      const current = villagers.find(villager => villager.id === vampire.targetId)
      const step = advanceVampire({ vampire, dtMs, plan: { target, perchX }, target: current })
      if (vampire.landsPerched) {
        isPerchRequested = false
      }
      if (step.didTransform) {
        addEffect({ kind: 'poof', x: Math.round(vampire.x) + 6, y: FEET_Y - 5 - Math.round(vampire.lift) })
      }
      const victim = villagers.find(villager => villager.id === step.bittenId)
      if (victim) {
        biteVillager({ villager: victim, fromX: vampire.x })
        addEffect({ kind: 'spark', x: Math.round(victim.x) + 2, y: FEET_Y - 4 })
      }
      if (step.didFinishFeed) {
        queuedFeeds = Math.max(0, queuedFeeds - 1)
        completeFeed()
      }
      villagers = advanceVillagers({ villagers, dtMs, width: columns })
      effects = advanceEffects({ effects, dtMs })
      const finished = finishedFeeds
      finishedFeeds = 0
      return finished
    },

    frame(): Bitmap {
      clearBitmap(bitmap)
      drawScene({ bitmap, percent: sky.state().percent, blood, vampire, villagers, effects })
      return bitmap
    },
  }
}

export type Night = ReturnType<typeof createNight>
