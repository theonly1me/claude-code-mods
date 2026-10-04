import type { Progress } from '../sim/types'
import { CHAPTERS, maxHpFor } from './campaign'

export function freshProgress(): Progress {
  return { cycle: 1, chapter: 0, demonHp: maxHpFor({ chapter: 0, cycle: 1 }), attacks: 0, defeated: 0, dawns: 0 }
}

function numberIn(options: { value: unknown; minimum: number; fallback: number }): number {
  return typeof options.value === 'number' && Number.isFinite(options.value) && options.value >= options.minimum
    ? Math.floor(options.value)
    : options.fallback
}

export function progressFromStore(value: unknown): Progress {
  const fresh = freshProgress()
  if (typeof value !== 'object' || value === null) {
    return fresh
  }
  const read = (key: string): unknown => (key in value ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined)
  const cycle = numberIn({ value: read('cycle'), minimum: 1, fallback: 1 })
  const chapter = Math.min(CHAPTERS.length - 1, numberIn({ value: read('chapter'), minimum: 0, fallback: 0 }))
  const maxHp = maxHpFor({ chapter, cycle })
  return {
    cycle,
    chapter,
    demonHp: Math.min(maxHp, numberIn({ value: read('demonHp'), minimum: 1, fallback: maxHp })),
    attacks: numberIn({ value: read('attacks'), minimum: 0, fallback: 0 }),
    defeated: numberIn({ value: read('defeated'), minimum: 0, fallback: 0 }),
    dawns: numberIn({ value: read('dawns'), minimum: 0, fallback: 0 }),
  }
}

export function nextChapter(progress: Progress): { progress: Progress; isDawn: boolean } {
  const isDawn = progress.chapter >= CHAPTERS.length - 1
  const cycle = isDawn ? progress.cycle + 1 : progress.cycle
  const chapter = isDawn ? 0 : progress.chapter + 1
  return {
    isDawn,
    progress: {
      ...progress,
      cycle,
      chapter,
      demonHp: maxHpFor({ chapter, cycle }),
      defeated: progress.defeated + 1,
      dawns: progress.dawns + (isDawn ? 1 : 0),
    },
  }
}
