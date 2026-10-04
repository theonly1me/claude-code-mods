import { BARN_DOOR_X } from '../art/barn'
import { PRODUCE_COLORS } from '../art/crops'
import { drawScene } from '../draw/scene'
import { clearBitmap, createBitmap } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { createWeather } from '../shared/pixel/weather'
import {
  BARN_MARGIN,
  BARN_WIDTH,
  CHEER_MS,
  FIELD_LEFT,
  HOE_MS,
  LOG_LIMIT,
  MAX_COLUMNS,
  PLOT_WIDTH,
  STAGE_HEIGHT,
  TREE_CROWN,
  TREE_X,
} from './constants'
import { createCalendar } from './calendar'
import { createCritters } from './critters'
import { CROP_LABELS } from './crops'
import { createDirector } from './director'
import { createEffects } from './effects'
import { advanceFarmer, assignStep, createFarmer, isFree } from './farmer'
import { createField } from './field'
import type { FarmerTask, Plot } from './types'

export function createFarm(options: { seed?: number } = {}) {
  const seed = options.seed ?? 7
  const field = createField()
  const farmer = createFarmer()
  const director = createDirector(seed)
  const critters = createCritters(seed + 1)
  const weather = createWeather({ seed: seed + 2 })
  const effects = createEffects()
  let hour = 12
  let columns = MAX_COLUMNS
  let bitmap: Bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
  const calendar = createCalendar()
  let lines: string[] = []

  function note(line: string): void {
    lines = [line, ...lines].slice(0, LOG_LIMIT)
  }

  function barnX(): number {
    return columns - BARN_WIDTH
  }

  function work(step: { task: FarmerTask; x: number; durationMs: number }): void {
    director.clear()
    assignStep({ farmer, step: { ...step, isCarrying: false, isWork: true, isFacingLeft: true } })
  }

  function popFor(popOptions: { plot: Plot; x: number | undefined; isToBarn: boolean; delayMs: number }): void {
    if (popOptions.x === undefined) {
      return
    }
    const fromX = popOptions.x + 2
    const toX = popOptions.isToBarn ? barnX() + BARN_DOOR_X : fromX
    effects.pop({ fromX, toX, ageMs: -popOptions.delayMs, color: PRODUCE_COLORS[popOptions.plot.crop] })
  }

  function planAmbient(): void {
    const plan = director.next({
      plots: field.visible(columns).map(view => ({ x: view.x, label: CROP_LABELS[view.plot.crop] })),
      fieldLeft: FIELD_LEFT,
      fieldRight: barnX() - BARN_MARGIN,
      barnX: barnX(),
      treeX: TREE_X,
      chickensX: critters.chickensX(),
      crowX: critters.perchedCrowX(),
      scarecrowX: field.scarecrowX(columns),
    })
    assignStep({ farmer, step: plan.step })
    if (plan.line) {
      note(plan.line)
    }
    if (plan.step.task === 'feed') {
      critters.scatterFeed({ x: plan.step.x, durationMs: 6000 })
    }
  }

  return {
    resize(nextColumns: number): void {
      if (nextColumns !== columns) {
        columns = nextColumns
        bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
      }
    },

    begin(startMs: number): void {
      calendar.begin(startMs)
    },

    setHour(nextHour: number): void {
      hour = ((nextHour % 24) + 24) % 24
    },

    restore(saved: { lifetimeBushels: number }): void {
      field.restore(saved)
    },

    tend(change: { path: string; lines: number; by?: 'claude' | 'you' }): void {
      const { plot, x, didRipen } = field.tend({ ...change, columns })
      if (x !== undefined) {
        work({ task: 'hoe', x: x + PLOT_WIDTH - 1, durationMs: HOE_MS })
      }
      if (didRipen) {
        popFor({ plot, x, isToBarn: false, delayMs: 0 })
      }
      note(`${change.by === 'you' ? 'You changed' : 'Claude tended'} ${change.path}, ${change.lines} ${change.lines === 1 ? 'line' : 'lines'}`)
    },

    testRan(result: { isPassing: boolean }): void {
      effects.testRan(result)
      field.testRan(result)
      note(result.isPassing ? 'Tests passed: sun on the field' : 'Tests failed: a storm wilts the pumpkins')
    },

    beginTurn(): void {
      field.beginTurn()
    },

    endTurn(): number {
      const ripe = field.harvest(columns)
      if (ripe.length === 0) {
        return 0
      }
      ripe.forEach((entry, index) => popFor({ ...entry, isToBarn: true, delayMs: index * 120 }))
      effects.harvested(ripe.length)
      work({ task: 'cheer', x: farmer.x, durationMs: CHEER_MS })
      note(`Harvested ${ripe.length} ${ripe.length === 1 ? 'crop' : 'crops'} into the barn`)
      return ripe.length
    },

    tick(dtMs: number): void {
      const newSeason = calendar.advance(dtMs)
      if (newSeason) {
        note(`${newSeason.label} comes to the farm`)
      }
      const season = calendar.season()
      advanceFarmer({ farmer, dtMs })
      if (isFree(farmer)) {
        planAmbient()
      }
      if (farmer.mode === 'shoo' && farmer.modeMs > 300) {
        critters.shooCrow()
      }
      critters.advance({
        dtMs,
        columns,
        barnX: barnX(),
        fieldLeft: FIELD_LEFT,
        perchSpots: field.visible(columns).map(view => view.x + 1),
      })
      weather.advance({ dtMs, season, width: columns, groundY: STAGE_HEIGHT, sources: [TREE_CROWN] })
      effects.advance({ dtMs, columns })
    },

    plots(): Plot[] {
      return field.plots()
    },

    summary() {
      return field.summary()
    },

    calendar,

    activity(): { task: FarmerTask; isWork: boolean } {
      return { task: farmer.step?.task ?? 'idle', isWork: farmer.step?.isWork === true }
    },

    log(): readonly string[] {
      return lines
    },

    frame(): Bitmap {
      clearBitmap(bitmap)
      drawScene({
        bitmap,
        hour,
        season: calendar.season(),
        effects: effects.view(),
        views: field.visible(columns),
        scarecrowX: field.scarecrowX(columns),
        farmer,
        critters,
        weather,
        bushels: field.summary().lifetimeBushels,
      })
      return bitmap
    },
  }
}

export type Farm = ReturnType<typeof createFarm>
