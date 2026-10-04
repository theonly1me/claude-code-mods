import { stepActivity } from './activities'
import { CASTLE_WIDTH, HOME_X, IDLE_BETWEEN_MS, VILLAGE_LEFT } from './constants'
import { quietStep } from './moves'
import type { AmbientStep } from './moves'
import { seededRandom, shuffled } from './random'
import type { Activity, ActivityKind, Vampire, Villager } from './types'
import { enter, isAmbient, isBat, returnTo } from './vampire'

const KINDS: readonly ActivityKind[] = ['stalk', 'perch', 'swoop', 'shadow', 'chase']

export function createDirector(seed: number) {
  const random = seededRandom(seed)
  let queue: ActivityKind[] = []
  let activity: Activity | undefined
  let last: ActivityKind | undefined
  let idleMs = 0

  function nextKind(): ActivityKind {
    if (queue.length === 0) {
      queue = shuffled({ items: KINDS, random, avoidFirst: last })
    }
    const [kind = 'stalk', ...rest] = queue
    queue = rest
    last = kind
    return kind
  }

  function goalFor(options: { kind: ActivityKind; width: number }): number {
    const streetEnd = options.width - CASTLE_WIDTH - 16
    if (options.kind === 'stalk') {
      return Math.max(HOME_X + 4, Math.min(streetEnd, HOME_X + 12 + Math.floor(random() * 8)))
    }
    if (options.kind === 'shadow') {
      return Math.max(HOME_X + 4, Math.min(streetEnd, VILLAGE_LEFT + 6))
    }
    return options.kind === 'perch' ? options.width - CASTLE_WIDTH - 3 : HOME_X
  }

  function run(options: { vampire: Vampire; current: Activity; dtMs: number; villagers: readonly Villager[]; width: number }): AmbientStep {
    const result = stepActivity({ ...options, activity: options.current })
    if (result.isDone) {
      activity = undefined
      idleMs = 0
    }
    return result.step
  }

  return {
    current(): Activity | undefined {
      return activity
    },

    setPrey(id: number): void {
      if (activity) {
        activity.preyId = id
      }
    },

    cancel(vampire: Vampire): void {
      if (!activity) {
        return
      }
      activity = undefined
      idleMs = 0
      if (!isAmbient(vampire)) {
        return
      }
      if (isBat(vampire)) {
        returnTo({ vampire, x: HOME_X, landsPerched: false })
      } else {
        enter({ vampire, mode: 'idle' })
      }
    },

    advance(options: { vampire: Vampire; dtMs: number; villagers: readonly Villager[]; width: number }): AmbientStep {
      const { vampire, dtMs, width } = options
      if (activity) {
        activity.stageMs += dtMs
        return run({ ...options, current: activity })
      }
      idleMs += dtMs
      if (vampire.mode !== 'idle' || idleMs < IDLE_BETWEEN_MS) {
        return quietStep()
      }
      const kind = nextKind()
      const current: Activity = { kind, stage: 0, stageMs: 0, originX: vampire.x, goalX: goalFor({ kind, width }), preyId: undefined }
      activity = current
      return { ...run({ ...options, current }), started: kind }
    },
  }
}

export type Director = ReturnType<typeof createDirector>
