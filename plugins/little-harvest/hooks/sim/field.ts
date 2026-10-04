import { BARN_MARGIN, BARN_WIDTH, FIELD_LEFT, PLOT_WIDTH } from './constants'
import { cropForPath, stageForLines } from './crops'
import type { FarmSummary, Plot, PlotView } from './types'

export function createField() {
  const plots = new Map<string, Plot>()
  let order = 0
  let sessionBushels = 0
  let lifetimeBushels = 0
  let hasPassedThisTurn = false

  function slotCount(columns: number): number {
    return Math.max(1, Math.floor((columns - BARN_WIDTH - BARN_MARGIN - FIELD_LEFT) / PLOT_WIDTH))
  }

  function visible(columns: number): PlotView[] {
    const newest = [...plots.values()].sort((first, second) => second.touchedOrder - first.touchedOrder)
    return newest
      .slice(0, slotCount(columns))
      .sort((first, second) => first.plantedOrder - second.plantedOrder)
      .map((plot, index) => ({ plot, x: FIELD_LEFT + index * PLOT_WIDTH }))
  }

  return {
    visible,

    scarecrowX(columns: number): number | undefined {
      const used = visible(columns).length
      return used < slotCount(columns) ? FIELD_LEFT + used * PLOT_WIDTH + 1 : undefined
    },

    restore(saved: { lifetimeBushels: number }): void {
      lifetimeBushels = saved.lifetimeBushels
    },

    tend(options: { path: string; lines: number; columns: number }): { plot: Plot; x: number | undefined; didRipen: boolean } {
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
      const x = visible(options.columns).find(view => view.plot === plot)?.x
      return { plot, x, didRipen: !wasRipe && stageForLines(plot.lines) === 'ripe' }
    },

    testRan(options: { isPassing: boolean }): void {
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

    harvest(columns: number): { plot: Plot; x: number | undefined }[] {
      const views = visible(columns)
      const ripe = [...plots.values()].filter(plot => !plot.isWilted && stageForLines(plot.lines) === 'ripe')
      if (!hasPassedThisTurn || ripe.length === 0) {
        return []
      }
      hasPassedThisTurn = false
      sessionBushels += ripe.length
      lifetimeBushels += ripe.length
      return ripe.map(plot => {
        plot.lines = 0
        return { plot, x: views.find(view => view.plot === plot)?.x }
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
  }
}

export type Field = ReturnType<typeof createField>
