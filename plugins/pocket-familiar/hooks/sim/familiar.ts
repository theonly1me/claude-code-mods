import { drawScene } from '../draw/scene'
import { clearBitmap, createBitmap } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { advance, createState, noteToolEnd, noteToolStart, noteTurnEnd, noteTurnStart, noteUserActive } from './care'
import { MAX_COLUMNS, STAGE_HEIGHT } from './constants'
import { growthOf, nextGrowthOf } from './growth'
import { afterAway, moodOf } from './stats'
import type { Growth, Mood, SavedFamiliar, ToolKind } from './types'

export function createFamiliar() {
  const state = createState()
  let columns = MAX_COLUMNS
  let bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })

  return {
    restore(options: { saved: SavedFamiliar; now: number }): void {
      state.stats = afterAway(options)
      state.lifetimeXp = options.saved.lifetimeXp
    },

    snapshot(now: number): SavedFamiliar {
      return { ...state.stats, lifetimeXp: state.lifetimeXp, lastSeenAt: now }
    },

    setHour(hour: number): void {
      state.hour = hour
    },

    toolStarted(kind: ToolKind): void {
      noteToolStart({ state, kind })
    },

    toolFinished(options: { kind: ToolKind; isFailure: boolean; isCreation: boolean }): void {
      noteToolEnd({ state, ...options })
    },

    turnStarted(): void {
      noteTurnStart(state)
    },

    turnCompleted(options: { isSuccess: boolean }): void {
      noteTurnEnd({ state, ...options })
    },

    userActive(): void {
      noteUserActive(state)
    },

    tick(options: { dtMs: number }): void {
      advance({ state, dtMs: options.dtMs })
    },

    takeEvolutions(): Growth[] {
      return state.evolutions.splice(0, state.evolutions.length)
    },

    view() {
      return state
    },

    mood(): Mood {
      return moodOf(state)
    },

    growth(): Growth {
      return growthOf(state.lifetimeXp)
    },

    nextGrowth(): Growth | undefined {
      return nextGrowthOf(state.lifetimeXp)
    },

    resize(nextColumns: number): void {
      if (nextColumns === columns) {
        return
      }
      columns = nextColumns
      bitmap = createBitmap({ width: columns, height: STAGE_HEIGHT })
    },

    frame(): Bitmap {
      clearBitmap(bitmap)
      drawScene({ bitmap, state })
      return bitmap
    },
  }
}

export type Familiar = ReturnType<typeof createFamiliar>
