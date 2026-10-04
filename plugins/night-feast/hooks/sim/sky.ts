import { DAWN_PERCENT, MOON_LEFT, MOON_RIGHT_MARGIN, NEW_NIGHT_DROP, WARM_PERCENT } from './constants'
import type { MeasureOutcome, SkyState } from './types'

const WARM_TOAST = `The sky is turning: context ${WARM_PERCENT}% full.`
const DAWN_TOAST = `Dawn is near: context ${DAWN_PERCENT}% full. Run /compact soon.`

export function createSky() {
  let percent: number | null = null
  let hasReading = false
  let night = 1
  let isWarmWarned = false
  let isDawnWarned = false

  function beginNight(): void {
    night += 1
    percent = null
    hasReading = false
    isWarmWarned = false
    isDawnWarned = false
  }

  function warningFor(value: number): string | undefined {
    if (value >= DAWN_PERCENT && !isDawnWarned) {
      isDawnWarned = true
      isWarmWarned = true
      return DAWN_TOAST
    }
    if (value >= WARM_PERCENT && !isWarmWarned) {
      isWarmWarned = true
      return WARM_TOAST
    }
    return undefined
  }

  return {
    state(): SkyState {
      return { percent, night }
    },

    restoreNight(saved: number): void {
      night = Math.max(1, saved)
    },

    measure(next: number | null): MeasureOutcome {
      const previous = percent
      const isCompacted =
        hasReading && (next === null || (previous !== null && next < previous - NEW_NIGHT_DROP))
      if (isCompacted) {
        beginNight()
        percent = next
        hasReading = next !== null
        return { toast: undefined, isNewNight: true }
      }
      percent = next
      if (next === null) {
        return { toast: undefined, isNewNight: false }
      }
      hasReading = true
      return { toast: warningFor(next), isNewNight: false }
    },

    compacted(): void {
      if (hasReading) {
        beginNight()
      }
    },
  }
}

export type Sky = ReturnType<typeof createSky>

export function dawnAmount(percent: number | null): number {
  if (percent === null) {
    return 0
  }
  return Math.min(1, Math.max(0, (percent - 70) / 30))
}

export function moonPosition(options: { percent: number | null; width: number }): { x: number; y: number } {
  const progress = (options.percent ?? 0) / 100
  const right = Math.max(MOON_LEFT, options.width - MOON_RIGHT_MARGIN)
  return {
    x: Math.round(MOON_LEFT + (right - MOON_LEFT) * progress),
    y: Math.round(2 - 2 * Math.sin(Math.PI * progress)),
  }
}
