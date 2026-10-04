import { createRandom } from './random'
import type { Cat, Chicken, Crow } from './types'

const CHICKEN_SPEED = 7
const CAT_SPEED = 4
const CROW_FLIGHT_MS = 1600
const CROW_PERCH_Y = 9

function lerp(options: { from: number; to: number; amount: number }): number {
  return options.from + (options.to - options.from) * Math.min(1, Math.max(0, options.amount))
}

export function createCritters(seed: number) {
  const random = createRandom(seed)
  const chickens: Chicken[] = [0, 1, 2].map(index => ({
    x: 3 + index * 5,
    targetX: 3 + index * 5,
    mode: 'stand',
    modeMs: 0,
    limitMs: 300 + index * 400,
    isFacingLeft: index % 2 === 0,
    isBrown: index === 1,
  }))
  const crow: Crow = { mode: 'away', modeMs: 0, limitMs: 6000, fromX: 0, fromY: 0, x: -10, y: -10, perchX: 0 }
  const cat: Cat = { x: 30, targetX: 30, mode: 'nap', modeMs: 0, limitMs: 9000, isFacingLeft: true }
  let feed: { x: number; ms: number } | undefined

  function moveChicken(options: { chicken: Chicken; dtMs: number; yard: { min: number; max: number } }): void {
    const { chicken, dtMs, yard } = options
    chicken.modeMs += dtMs
    if (chicken.mode === 'walk') {
      const travel = (CHICKEN_SPEED * dtMs) / 1000
      const distance = chicken.targetX - chicken.x
      chicken.isFacingLeft = distance < 0
      if (Math.abs(distance) > travel) {
        chicken.x += Math.sign(distance) * travel
        return
      }
      chicken.x = chicken.targetX
      chicken.mode = 'peck'
      chicken.modeMs = 0
      chicken.limitMs = random.between({ min: 700, max: 1800 })
      return
    }
    if (chicken.modeMs < chicken.limitMs) {
      return
    }
    const center = feed ? feed.x : chicken.x
    const spread = feed ? 5 : 9
    chicken.targetX = Math.round(Math.min(yard.max, Math.max(yard.min, center + random.between({ min: -spread, max: spread }))))
    chicken.mode = random.next() < 0.75 || feed ? 'walk' : 'stand'
    chicken.modeMs = 0
    chicken.limitMs = random.between({ min: 400, max: 1200 })
  }

  function moveCrow(options: { dtMs: number; columns: number; perchSpots: readonly number[] }): void {
    crow.modeMs += options.dtMs
    const progress = crow.modeMs / CROW_FLIGHT_MS
    if (crow.mode === 'arrive') {
      crow.x = lerp({ from: crow.fromX, to: crow.perchX, amount: progress })
      crow.y = lerp({ from: crow.fromY, to: CROW_PERCH_Y, amount: progress }) - Math.sin(Math.PI * Math.min(1, progress)) * 2
    }
    if (crow.mode === 'leave') {
      crow.x = lerp({ from: crow.fromX, to: crow.fromX + 40, amount: progress })
      crow.y = lerp({ from: crow.fromY, to: -6, amount: progress })
    }
    if (crow.modeMs < crow.limitMs) {
      return
    }
    crow.modeMs = 0
    if (crow.mode === 'away') {
      const [first, ...rest] = options.perchSpots
      crow.perchX = first === undefined ? Math.round(options.columns / 2) : random.pick([first, ...rest])
      crow.fromX = options.columns + 4
      crow.fromY = 0
      crow.mode = 'arrive'
      crow.limitMs = CROW_FLIGHT_MS
      return
    }
    if (crow.mode === 'arrive') {
      crow.mode = 'perch'
      crow.x = crow.perchX
      crow.y = CROW_PERCH_Y
      crow.limitMs = random.between({ min: 6000, max: 9000 })
      return
    }
    if (crow.mode === 'perch') {
      crow.fromX = crow.x
      crow.fromY = crow.y
      crow.mode = 'leave'
      crow.limitMs = CROW_FLIGHT_MS
      return
    }
    crow.mode = 'away'
    crow.limitMs = random.between({ min: 9000, max: 16000 })
  }

  function moveCat(options: { dtMs: number; fence: { min: number; max: number } }): void {
    cat.modeMs += options.dtMs
    if (cat.mode === 'walk') {
      const travel = (CAT_SPEED * options.dtMs) / 1000
      const distance = cat.targetX - cat.x
      cat.isFacingLeft = distance < 0
      if (Math.abs(distance) > travel) {
        cat.x += Math.sign(distance) * travel
        return
      }
      cat.x = cat.targetX
      cat.mode = 'nap'
      cat.modeMs = 0
      cat.limitMs = random.between({ min: 9000, max: 16000 })
      return
    }
    if (cat.modeMs < cat.limitMs) {
      return
    }
    cat.modeMs = 0
    if (cat.mode === 'nap') {
      cat.mode = 'stretch'
      cat.limitMs = 1400
      return
    }
    cat.mode = 'walk'
    cat.targetX = Math.round(random.between({ min: options.fence.min, max: Math.max(options.fence.min, options.fence.max) }))
    cat.limitMs = 0
  }

  return {
    advance(options: { dtMs: number; columns: number; barnX: number; fieldLeft: number; perchSpots: readonly number[] }): void {
      const { dtMs } = options
      feed = feed && feed.ms > dtMs ? { ...feed, ms: feed.ms - dtMs } : undefined
      chickens.forEach(chicken => moveChicken({ chicken, dtMs, yard: { min: 1, max: options.barnX - 6 } }))
      moveCrow({ dtMs, columns: options.columns, perchSpots: options.perchSpots })
      moveCat({ dtMs, fence: { min: options.fieldLeft, max: options.barnX - 9 } })
      cat.x = Math.min(cat.x, Math.max(options.fieldLeft, options.barnX - 9))
    },

    scatterFeed(options: { x: number; durationMs: number }): void {
      feed = { x: options.x, ms: options.durationMs }
      chickens.forEach(chicken => {
        chicken.modeMs = chicken.limitMs
      })
    },

    perchedCrowX(): number | undefined {
      return crow.mode === 'perch' ? crow.perchX : undefined
    },

    shooCrow(): void {
      if (crow.mode === 'perch' || crow.mode === 'arrive') {
        crow.mode = 'perch'
        crow.modeMs = crow.limitMs
      }
    },

    chickensX(): number {
      return Math.round(chickens.reduce((sum, chicken) => sum + chicken.x, 0) / chickens.length)
    },

    chickens(): readonly Chicken[] {
      return chickens
    },

    crow(): Crow {
      return crow
    },

    cat(): Cat {
      return cat
    },
  }
}

export type Critters = ReturnType<typeof createCritters>
