import { HOUR_MS, MINUTE_MS } from './constants'
import type { FamiliarState, Mood, SavedFamiliar, Stats } from './types'

export const STARTING_STATS: Stats = { fullness: 70, joy: 70, energy: 80 }

const AWAY_PER_HOUR = { fullness: -4, joy: -2, energy: 10 }
const ACTIVE_PER_MINUTE = { fullness: -0.1, joy: -1 / 15, energy: -0.2 }
const SLEEP_ENERGY_PER_MINUTE = 2

export function clampStat(value: number): number {
  return Math.min(100, Math.max(0, value))
}

export function clampStats(stats: Stats): Stats {
  return { fullness: clampStat(stats.fullness), joy: clampStat(stats.joy), energy: clampStat(stats.energy) }
}

export function addStats(options: { stats: Stats; change: Partial<Stats> }): Stats {
  const { stats, change } = options
  return clampStats({
    fullness: stats.fullness + (change.fullness ?? 0),
    joy: stats.joy + (change.joy ?? 0),
    energy: stats.energy + (change.energy ?? 0),
  })
}

export function afterAway(options: { saved: SavedFamiliar; now: number }): Stats {
  const hours = Math.max(0, options.now - options.saved.lastSeenAt) / HOUR_MS
  return addStats({
    stats: options.saved,
    change: {
      fullness: AWAY_PER_HOUR.fullness * hours,
      joy: AWAY_PER_HOUR.joy * hours,
      energy: AWAY_PER_HOUR.energy * hours,
    },
  })
}

export function drift(options: { stats: Stats; dtMs: number; isSleeping: boolean }): Stats {
  const minutes = options.dtMs / MINUTE_MS
  if (options.isSleeping) {
    return addStats({ stats: options.stats, change: { energy: SLEEP_ENERGY_PER_MINUTE * minutes } })
  }
  return addStats({
    stats: options.stats,
    change: {
      fullness: ACTIVE_PER_MINUTE.fullness * minutes,
      joy: ACTIVE_PER_MINUTE.joy * minutes,
      energy: ACTIVE_PER_MINUTE.energy * minutes,
    },
  })
}

export function moodOf(state: FamiliarState): Mood {
  if (state.isSleeping) {
    return 'asleep'
  }
  if (state.hasDuck) {
    return 'needs a break'
  }
  if (state.worriedMs > 0) {
    return 'worried'
  }
  if (state.stats.fullness < 25) {
    return 'hungry'
  }
  if (state.stats.energy < 20) {
    return 'tired'
  }
  return state.stats.joy >= 70 ? 'happy' : 'content'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function savedFrom(value: unknown): SavedFamiliar | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const fields = ['fullness', 'joy', 'energy', 'lifetimeXp', 'lastSeenAt'] as const
  const record = Object.fromEntries(Object.entries(value))
  if (!fields.every(field => isNumber(record[field]))) {
    return undefined
  }
  return {
    fullness: Number(record.fullness),
    joy: Number(record.joy),
    energy: Number(record.energy),
    lifetimeXp: Number(record.lifetimeXp),
    lastSeenAt: Number(record.lastSeenAt),
  }
}
