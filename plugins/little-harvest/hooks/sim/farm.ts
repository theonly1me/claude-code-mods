import { BARN_DOOR_X } from '../art/barn'
import { drawScene } from '../draw/scene'
import { clearBitmap, createBitmap } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import {
  BARN_MARGIN,
  BARN_WIDTH,
  FIELD_LEFT,
  HARVEST_MS,
  MAX_COLUMNS,
  PLOT_WIDTH,
  POP_MS,
  STAGE_HEIGHT,
  STORM_MS,
  SUN_RAYS_MS,
} from './constants'
import { cropForPath, stageForLines } from './crops'
import { advanceFarmer, cheerFarmer, createFarmer, sendFarmer } from './farmer'
import type { CropKind, Cloud, FarmSummary, Harvest, Plot, PlotView, Pop, Weather } from './types'

const PRODUCE: Record<CropKind, number> = {
  pumpkin: 0xf08a24,
  corn: 0xf7d038,
  sunflower: 0xffd23f,
  tulip: 0xe2435c,
  wheat: 0xf0d277,
  carrot: 0xff8c2a,
}

export function createFarm() {
  const plots = new Map<string, Plot>()
  const farmer = createFarmer()
  const clouds: Cloud[] = [
    { x: 6, y: 2, width: 9, speed: 1.1 },
    { x: 34, y: 4, width: 7, speed: 0.7 },
    { x: 58, y: 1, width: 11, speed: 0.9 },
  ]
  let order = 0
  let weather: Weather = { kind: 'clear', ms: 0 }
  let pops: Pop[] = []
  let harvest: Harvest | undefined
  let hour = 12
  let columns = MAX_COLUMNS
  let bitmap: Bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
  let sessionBushels = 0
  let lifetimeBushels = 0
  let hasPassedThisTurn = false

  function slotCount(): number {
    return Math.max(1, Math.floor((columns - BARN_WIDTH - BARN_MARGIN - FIELD_LEFT) / PLOT_WIDTH))
  }

  function visible(): PlotView[] {
    const newest = [...plots.values()].sort((first, second) => second.touchedOrder - first.touchedOrder)
    return newest
      .slice(0, slotCount())
      .sort((first, second) => first.plantedOrder - second.plantedOrder)
      .map((plot, index) => ({ plot, x: FIELD_LEFT + index * PLOT_WIDTH }))
  }

  function popAt(options: { plot: Plot; isToBarn: boolean; delayMs: number }): void {
    const view = visible().find(candidate => candidate.plot === options.plot)
    if (!view) {
      return
    }
    const fromX = view.x + 2
    const toX = options.isToBarn ? columns - BARN_WIDTH + BARN_DOOR_X : fromX
    pops.push({ fromX, toX, ageMs: -options.delayMs, color: PRODUCE[options.plot.crop] })
  }

  return {
    resize(nextColumns: number): void {
      if (nextColumns !== columns) {
        columns = nextColumns
        bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
      }
    },

    setHour(nextHour: number): void {
      hour = ((nextHour % 24) + 24) % 24
    },

    restore(saved: { lifetimeBushels: number }): void {
      lifetimeBushels = saved.lifetimeBushels
    },

    tend(options: { path: string; lines: number }): void {
      order += 1
      const plot = plots.get(options.path) ?? {
        path: options.path,
        crop: cropForPath(options.path),
        lines: 0,
        isWilted: false,
        plantedOrder: order,
        touchedOrder: order,
      }
      const wasRipe = stageForLines(plot.lines) === 'ripe'
      plot.lines += Math.max(0, options.lines)
      plot.touchedOrder = order
      plots.set(options.path, plot)
      const view = visible().find(candidate => candidate.plot === plot)
      if (view) {
        sendFarmer({ farmer, x: view.x + PLOT_WIDTH - 1 })
      }
      if (!wasRipe && stageForLines(plot.lines) === 'ripe') {
        popAt({ plot, isToBarn: false, delayMs: 0 })
      }
    },

    testRan(options: { isPassing: boolean }): void {
      weather = { kind: options.isPassing ? 'sunny' : 'storm', ms: 0 }
      plots.forEach(plot => {
        if (options.isPassing) {
          plot.isWilted = false
        } else if (plot.crop === 'pumpkin') {
          plot.isWilted = true
        }
      })
      hasPassedThisTurn = hasPassedThisTurn || options.isPassing
    },

    beginTurn(): void {
      hasPassedThisTurn = false
    },

    endTurn(): number {
      const ripe = [...plots.values()].filter(plot => !plot.isWilted && stageForLines(plot.lines) === 'ripe')
      if (!hasPassedThisTurn || ripe.length === 0) {
        return 0
      }
      hasPassedThisTurn = false
      ripe.forEach((plot, index) => {
        popAt({ plot, isToBarn: true, delayMs: index * 120 })
        plot.lines = 0
      })
      sessionBushels += ripe.length
      lifetimeBushels += ripe.length
      harvest = { count: ripe.length, ageMs: 0 }
      cheerFarmer(farmer)
      return ripe.length
    },

    tick(dtMs: number): void {
      advanceFarmer({ farmer, dtMs, strollRange: Math.max(8, columns - BARN_WIDTH - 12) })
      weather = weather.kind === 'clear' ? weather : { ...weather, ms: weather.ms + dtMs }
      const limit = weather.kind === 'storm' ? STORM_MS : SUN_RAYS_MS
      if (weather.kind !== 'clear' && weather.ms >= limit) {
        weather = { kind: 'clear', ms: 0 }
      }
      pops = pops.map(pop => ({ ...pop, ageMs: pop.ageMs + dtMs })).filter(pop => pop.ageMs < POP_MS)
      harvest = harvest && harvest.ageMs + dtMs < HARVEST_MS ? { ...harvest, ageMs: harvest.ageMs + dtMs } : undefined
      clouds.forEach(cloud => {
        cloud.x += (cloud.speed * dtMs) / 1000
        if (cloud.x > columns + 2) {
          cloud.x = -cloud.width - 2
        }
      })
    },

    plots(): Plot[] {
      return [...plots.values()].sort((first, second) => first.plantedOrder - second.plantedOrder)
    },

    summary(): FarmSummary {
      const all = [...plots.values()]
      return {
        plots: all.length,
        ripe: all.filter(plot => stageForLines(plot.lines) === 'ripe').length,
        sessionBushels,
        lifetimeBushels,
      }
    },

    frame(): Bitmap {
      clearBitmap(bitmap)
      drawScene({ bitmap, hour, clouds, weather, views: visible(), farmer, pops, harvest, bushels: lifetimeBushels })
      return bitmap
    },
  }
}

export type Farm = ReturnType<typeof createFarm>
