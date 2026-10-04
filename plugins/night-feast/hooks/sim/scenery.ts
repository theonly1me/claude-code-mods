import { seededRandom, shuffled } from './random'
import type { Cloud, Scenery, VignetteKind } from './types'

const VIGNETTES: readonly VignetteKind[] = ['owl', 'moonbats', 'cat']
const LENGTHS: Record<VignetteKind, number> = { owl: 6400, moonbats: 6000, cat: 9000 }
const CLOUD_COUNT = 2

export const VIGNETTE_LINES: Record<VignetteKind, string> = {
  owl: 'An owl on the dead tree turns its head',
  moonbats: 'Bats circle the moon',
  cat: 'A black cat prowls the rooftops',
}

export function createScenery(seed: number) {
  const random = seededRandom(seed)
  let queue: VignetteKind[] = []
  let last: VignetteKind | undefined
  const state: Scenery = { clockMs: 0, vignette: undefined, restMs: 1200, clouds: [] }

  function cloud(options: { width: number; x?: number }): Cloud {
    return {
      x: options.x ?? options.width + random() * 10,
      y: Math.floor(random() * 4),
      width: 7 + Math.floor(random() * 5),
      speed: 1.2 + random() * 1.4,
    }
  }

  function nextKind(): VignetteKind {
    if (queue.length === 0) {
      queue = shuffled({ items: VIGNETTES, random, avoidFirst: last })
    }
    const [kind = 'owl', ...rest] = queue
    queue = rest
    last = kind
    return kind
  }

  return {
    state(): Scenery {
      return state
    },

    advance(options: { dtMs: number; width: number }): VignetteKind | undefined {
      const { dtMs, width } = options
      state.clockMs += dtMs
      if (state.clouds.length < CLOUD_COUNT) {
        state.clouds = Array.from({ length: CLOUD_COUNT }, (_, index) =>
          cloud({ width, x: (width * (index + 0.6)) / CLOUD_COUNT }),
        )
      }
      state.clouds = state.clouds.map(current => {
        const moved = { ...current, x: current.x - (current.speed * dtMs) / 1000 }
        return moved.x + moved.width < 0 ? cloud({ width }) : moved
      })
      if (state.vignette) {
        state.vignette.ageMs += dtMs
        if (state.vignette.ageMs >= state.vignette.lengthMs) {
          state.vignette = undefined
          state.restMs = 1500 + random() * 1500
        }
        return undefined
      }
      state.restMs -= dtMs
      if (state.restMs > 0) {
        return undefined
      }
      const kind = nextKind()
      state.vignette = { kind, ageMs: 0, lengthMs: LENGTHS[kind] }
      return kind
    },
  }
}

export type SceneryDirector = ReturnType<typeof createScenery>
