import { HARVEST_MS, POP_MS, STORM_MS, SUN_RAYS_MS } from './constants'
import type { Cloud, Harvest, Pop, TestWeather } from './types'

export function createEffects() {
  const clouds: Cloud[] = [
    { x: 6, y: 2, width: 9, speed: 1.1 },
    { x: 34, y: 4, width: 7, speed: 0.7 },
    { x: 58, y: 1, width: 11, speed: 0.9 },
  ]
  let testWeather: TestWeather = { kind: 'clear', ms: 0 }
  let pops: Pop[] = []
  let harvest: Harvest | undefined

  return {
    testRan(options: { isPassing: boolean }): void {
      testWeather = { kind: options.isPassing ? 'sunny' : 'storm', ms: 0 }
    },

    pop(pop: Pop): void {
      pops.push(pop)
    },

    harvested(count: number): void {
      harvest = { count, ageMs: 0 }
    },

    advance(options: { dtMs: number; columns: number }): void {
      const { dtMs } = options
      testWeather = testWeather.kind === 'clear' ? testWeather : { ...testWeather, ms: testWeather.ms + dtMs }
      const limit = testWeather.kind === 'storm' ? STORM_MS : SUN_RAYS_MS
      if (testWeather.kind !== 'clear' && testWeather.ms >= limit) {
        testWeather = { kind: 'clear', ms: 0 }
      }
      pops = pops.map(pop => ({ ...pop, ageMs: pop.ageMs + dtMs })).filter(pop => pop.ageMs < POP_MS)
      harvest = harvest && harvest.ageMs + dtMs < HARVEST_MS ? { ...harvest, ageMs: harvest.ageMs + dtMs } : undefined
      clouds.forEach(cloud => {
        cloud.x += (cloud.speed * dtMs) / 1000
        if (cloud.x > options.columns + 2) {
          cloud.x = -cloud.width - 2
        }
      })
    },

    view(): { clouds: readonly Cloud[]; testWeather: TestWeather; pops: readonly Pop[]; harvest: Harvest | undefined } {
      return { clouds, testWeather, pops, harvest }
    },
  }
}

export type Effects = ReturnType<typeof createEffects>
