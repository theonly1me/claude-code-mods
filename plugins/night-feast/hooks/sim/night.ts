import { drawScene } from '../draw/scene'
import { clearBitmap, createBitmap } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { createDirector } from './ambient'
import { CASTLE_WIDTH, FEED_BLOOD, FEET_Y, GARLIC_BLOOD, HUNGER_MS, MAX_COLUMNS, MAX_QUEUED_FEEDS, STAGE_HEIGHT, VIAL_BOTTOM_Y, VIAL_DROP_X } from './constants'
import { createEffects } from './effects'
import { createJournal } from './journal'
import { ACTIVITY_LINES, describeDoing } from './moves'
import { createPopulation } from './population'
import { createScenery, VIGNETTE_LINES } from './scenery'
import { createSky } from './sky'
import type { MeasureOutcome, NightStats } from './types'
import { advanceVampire, createVampire, isAmbient, recoil } from './vampire'

const PERCH_OFFSET = 12

export function createNight(options: { seed?: number } = {}) {
  const seed = options.seed ?? 7
  const sky = createSky()
  const vampire = createVampire()
  const director = createDirector(seed)
  const scenery = createScenery(seed + 11)
  const journal = createJournal()
  const population = createPopulation()
  const effects = createEffects()
  let queuedLabels: string[] = []
  let isPerchRequested = false
  let blood = 50
  let feeds = 0
  let garlicHits = 0
  let lifetimeFeeds = 0
  let finishedFeeds = 0
  let hungerMs = 0
  let columns = MAX_COLUMNS
  let bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })

  function completeFeed(label: string | undefined): void {
    feeds += 1
    lifetimeFeeds += 1
    finishedFeeds += 1
    blood = Math.min(100, blood + FEED_BLOOD)
    journal.push(label ? `Fed on a villager after ${label}` : 'Fed on a villager')
  }

  function noteMeasure(outcome: MeasureOutcome): MeasureOutcome {
    if (outcome.isNewNight) {
      journal.push(`Night ${sky.state().night} begins after a compaction`)
    }
    return outcome
  }

  function runAmbient(dtMs: number): void {
    const isBusy = queuedLabels.length > 0 || isPerchRequested || !(vampire.mode === 'idle' || isAmbient(vampire))
    if (isBusy) {
      director.cancel(vampire)
      return
    }
    const step = director.advance({ vampire, dtMs, villagers: population.villagers(), width: columns })
    if (step.started) {
      journal.push(ACTIVITY_LINES[step.started])
    }
    if (step.didTransform) {
      effects.add({ kind: 'poof', x: Math.round(vampire.x) + 6, y: FEET_Y - 5 - Math.round(vampire.lift) })
    }
    if (step.wantsPrey) {
      const prey = population.prey({ width: columns, nearX: vampire.x })
      if (prey !== undefined) {
        director.setPrey(prey)
      }
    }
    const scared = step.scareId === undefined ? undefined : population.scare({ id: step.scareId, width: columns, fromX: vampire.x + 6 })
    if (scared) {
      effects.add({ kind: 'alarm', x: Math.round(scared.x) + 2, y: FEET_Y - 10 })
      journal.push('The vampire pounces and the lantern bearer runs')
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
      return noteMeasure(sky.measure(percent))
    },

    compacted(): void {
      const before = sky.state().night
      sky.compacted()
      if (sky.state().night !== before) {
        journal.push(`Night ${sky.state().night} begins after a compaction`)
      }
    },

    feed(label?: string): void {
      if (queuedLabels.length >= MAX_QUEUED_FEEDS) {
        completeFeed(label)
        return
      }
      queuedLabels = [...queuedLabels, label ?? '']
    },

    garlic(label?: string): void {
      garlicHits += 1
      blood = Math.max(0, blood - GARLIC_BLOOD)
      director.cancel(vampire)
      effects.add({ kind: 'fume', x: Math.round(vampire.x) + (vampire.facing === 1 ? 11 : -3), y: FEET_Y - 3 })
      effects.add({ kind: 'drop', x: VIAL_DROP_X, y: VIAL_BOTTOM_Y })
      recoil(vampire)
      journal.push(label ? `Garlic: ${label} failed` : 'Garlic: a tool call failed')
    },

    arrive(): void {
      population.spawn({ width: columns })
      journal.push('A villager arrives with your prompt')
    },

    celebrate(): void {
      isPerchRequested = true
      journal.push('Turn done: the vampire spreads its cape at the castle')
    },

    stats(): NightStats {
      const { percent, night } = sky.state()
      return { blood, feeds, garlic: garlicHits, lifetimeFeeds, night, percent }
    },

    summary(): string {
      const { percent, night } = sky.state()
      const skyText = percent === null ? 'dusk' : `context ${percent}%`
      return `Night ${night} · ${skyText} · blood ${blood}% · ${feeds} feeds · ${describeDoing({ activity: director.current(), vampire })}`
    },

    log(): readonly string[] {
      return journal.lines()
    },

    tick(tickOptions: { dtMs: number }): number {
      const { dtMs } = tickOptions
      hungerMs += dtMs
      if (hungerMs >= HUNGER_MS) {
        hungerMs = 0
        blood = Math.max(0, blood - 1)
      }
      population.keepAround({ dtMs, width: columns, wanted: queuedLabels.length })
      const target = queuedLabels.length > 0 ? population.nearestWalking(vampire.x) : undefined
      const perchX = isPerchRequested && queuedLabels.length === 0 ? columns - CASTLE_WIDTH - PERCH_OFFSET : undefined
      const step = advanceVampire({ vampire, dtMs, plan: { target, perchX }, target: population.find(vampire.targetId) })
      if (vampire.landsPerched) {
        isPerchRequested = false
      }
      if (step.didTransform) {
        effects.add({ kind: 'poof', x: Math.round(vampire.x) + 6, y: FEET_Y - 5 - Math.round(vampire.lift) })
      }
      const victim = step.bittenId === undefined ? undefined : population.bite({ id: step.bittenId, fromX: vampire.x })
      if (victim) {
        effects.add({ kind: 'spark', x: Math.round(victim.x) + 2, y: FEET_Y - 4 })
      }
      if (step.didFinishFeed) {
        const [label, ...rest] = queuedLabels
        queuedLabels = rest
        completeFeed(label === '' ? undefined : label)
      }
      runAmbient(dtMs)
      const vignette = scenery.advance({ dtMs, width: columns })
      if (vignette) {
        journal.push(VIGNETTE_LINES[vignette])
      }
      population.advance({ dtMs, width: columns }).forEach(door => {
        effects.add({ kind: 'light', x: door, y: FEET_Y - 3 })
        journal.push('The lantern bearer slams a door just in time')
      })
      effects.advance(dtMs)
      const finished = finishedFeeds
      finishedFeeds = 0
      return finished
    },

    frame(): Bitmap {
      clearBitmap(bitmap)
      drawScene({ bitmap, percent: sky.state().percent, blood, vampire, villagers: population.villagers(), effects: effects.list(), scenery: scenery.state() })
      return bitmap
    },
  }
}

export type Night = ReturnType<typeof createNight>
