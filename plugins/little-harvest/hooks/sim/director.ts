import { createRandom } from './random'
import type { FarmerStep, FarmerTask } from './types'

export type Activity = 'hoe' | 'water' | 'weed' | 'hay' | 'feed' | 'shoo' | 'rest' | 'inspect'

export type SceneFacts = {
  plots: readonly { x: number; label: string }[]
  fieldLeft: number
  fieldRight: number
  barnX: number
  treeX: number
  chickensX: number
  crowX: number | undefined
  scarecrowX: number | undefined
}

export type Plan = { step: FarmerStep; activity?: Activity; line?: string }

const WEIGHTS: Record<Activity, number> = {
  hoe: 2,
  water: 3,
  weed: 2,
  hay: 2,
  feed: 3,
  shoo: 8,
  rest: 2,
  inspect: 2,
}

const ACTIVITIES: readonly Activity[] = ['hoe', 'water', 'weed', 'hay', 'feed', 'shoo', 'rest', 'inspect']

function ambient(options: { task: FarmerTask; x: number; durationMs: number; isCarrying?: boolean; isFacingLeft?: boolean }): FarmerStep {
  return {
    task: options.task,
    x: options.x,
    durationMs: options.durationMs,
    isCarrying: options.isCarrying ?? false,
    isWork: false,
    isFacingLeft: options.isFacingLeft,
  }
}

export function createDirector(seed: number) {
  const random = createRandom(seed)
  let queue: FarmerStep[] = []
  let last: Activity | undefined

  function isAvailable(options: { activity: Activity; facts: SceneFacts }): boolean {
    const { activity, facts } = options
    if (activity === 'shoo') {
      return facts.crowX !== undefined
    }
    if (activity === 'inspect') {
      return facts.scarecrowX !== undefined
    }
    return activity !== last
  }

  function choose(facts: SceneFacts): Activity {
    const options = ACTIVITIES.filter(activity => isAvailable({ activity, facts }))
    const total = options.reduce((sum, activity) => sum + WEIGHTS[activity], 0)
    let roll = random.next() * total
    for (const activity of options) {
      roll -= WEIGHTS[activity]
      if (roll < 0) {
        return activity
      }
    }
    return 'hoe'
  }

  function fieldSpot(facts: SceneFacts): number {
    return Math.round(random.between({ min: facts.fieldLeft, max: Math.max(facts.fieldLeft, facts.fieldRight - 7) }))
  }

  function plan(options: { activity: Activity; facts: SceneFacts }): { steps: FarmerStep[]; line: string } {
    const { activity, facts } = options
    const [firstPlot, ...otherPlots] = facts.plots
    const plot = firstPlot ? random.pick([firstPlot, ...otherPlots]) : undefined
    if (activity === 'water') {
      const x = plot ? plot.x + 6 : fieldSpot(facts)
      return { steps: [ambient({ task: 'water', x, durationMs: 2600, isFacingLeft: true })], line: plot ? `Watering the ${plot.label}` : 'Watering the empty field' }
    }
    if (activity === 'weed') {
      const x = plot ? plot.x - 5 : fieldSpot(facts)
      return { steps: [ambient({ task: 'weed', x, durationMs: 2200, isFacingLeft: false })], line: plot ? `Pulling weeds by the ${plot.label}` : 'Pulling weeds' }
    }
    if (activity === 'hay') {
      return {
        steps: [
          ambient({ task: 'lift', x: facts.barnX - 6, durationMs: 600, isFacingLeft: false }),
          ambient({ task: 'drop', x: facts.chickensX + 4, durationMs: 800, isCarrying: true, isFacingLeft: true }),
        ],
        line: 'Carrying hay from the barn',
      }
    }
    if (activity === 'feed') {
      return { steps: [ambient({ task: 'feed', x: facts.chickensX, durationMs: 3200 })], line: 'Feeding the chickens' }
    }
    if (activity === 'shoo') {
      const crowX = facts.crowX ?? fieldSpot(facts)
      return { steps: [ambient({ task: 'shoo', x: Math.max(1, crowX - 8), durationMs: 1400, isFacingLeft: false })], line: 'Shooing a crow off the field' }
    }
    if (activity === 'rest') {
      return { steps: [ambient({ task: 'rest', x: facts.treeX + 2, durationMs: 4200, isFacingLeft: true })], line: 'Resting under the tree' }
    }
    if (activity === 'inspect') {
      const x = (facts.scarecrowX ?? fieldSpot(facts)) - 7
      return { steps: [ambient({ task: 'inspect', x, durationMs: 2000, isFacingLeft: false })], line: 'Fixing the scarecrow' }
    }
    return { steps: [ambient({ task: 'hoe', x: fieldSpot(facts), durationMs: 2400, isFacingLeft: true })], line: 'Hoeing a new row' }
  }

  return {
    next(facts: SceneFacts): Plan {
      const [queued, ...rest] = queue
      if (queued) {
        queue = rest
        return { step: queued }
      }
      const activity = choose(facts)
      last = activity
      const { steps, line } = plan({ activity, facts })
      const [first, ...later] = steps
      queue = later
      return { step: first ?? ambient({ task: 'hoe', x: fieldSpot(facts), durationMs: 2400 }), activity, line }
    },

    clear(): void {
      queue = []
    },
  }
}

export type Director = ReturnType<typeof createDirector>
