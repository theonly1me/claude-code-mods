import { nextSeasonIn, seasonAt } from '../shared/pixel/seasons'
import type { Season } from '../shared/pixel/seasons'

export function createCalendar() {
  let epochMs = 0
  let elapsedMs = 0
  let season: Season = seasonAt(0)

  return {
    begin(startMs: number): void {
      epochMs = startMs
      elapsedMs = 0
      season = seasonAt(epochMs)
    },

    advance(dtMs: number): Season | undefined {
      elapsedMs += dtMs
      const next = seasonAt(epochMs + elapsedMs)
      const isNew = next.name !== season.name
      season = next
      return isNew ? next : undefined
    },

    season(): Season {
      return season
    },

    next(): { label: string; remainingMs: number } {
      return nextSeasonIn(epochMs + elapsedMs)
    },
  }
}
