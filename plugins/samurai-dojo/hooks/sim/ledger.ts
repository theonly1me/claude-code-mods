import { FLURRY_KILLS, FLURRY_WINDOW_MS, LOG_LIMIT } from './constants'
import type { KillEvent, KillTally, MonsterPlan } from './types'
import { nameOf } from './waves'

export function createLedger() {
  const pendingKills: KillEvent[] = []
  let tally: KillTally = { codex: 0, gemini: 0, chatgpt: 0 }
  let lifetimeKills = 0
  let recentKillTimes: number[] = []
  let flurries = 0
  let lines: string[] = []

  function note(line: string): void {
    lines = [line, ...lines].slice(0, LOG_LIMIT)
  }

  return {
    note,

    lines(): readonly string[] {
      return lines
    },

    restore(saved: { tally: KillTally; lifetimeKills: number }): void {
      tally = { ...saved.tally }
      lifetimeKills = saved.lifetimeKills
    },

    tally(): KillTally {
      return tally
    },

    slain(): number {
      return tally.codex + tally.gemini + tally.chatgpt
    },

    lifetimeKills(): number {
      return lifetimeKills
    },

    flurries(): number {
      return flurries
    },

    recordKill(kill: { plan: MonsterPlan; clockMs: number }): { isFlurry: boolean } {
      const { plan, clockMs } = kill
      tally = { ...tally, [plan.kind]: tally[plan.kind] + 1 }
      lifetimeKills += 1
      pendingKills.push({ kind: plan.kind, isElite: plan.isElite })
      note(`${plan.label}: cut down ${nameOf({ kind: plan.kind, count: 1 })}${plan.isElite ? ', an elite' : ''}`)
      recentKillTimes = [...recentKillTimes, clockMs].filter(time => clockMs - time <= FLURRY_WINDOW_MS)
      if (recentKillTimes.length < FLURRY_KILLS) {
        return { isFlurry: false }
      }
      recentKillTimes = []
      flurries += 1
      note('Flurry: three cuts in one breath')
      return { isFlurry: true }
    },

    takeKills(): KillEvent[] {
      return pendingKills.splice(0, pendingKills.length)
    },
  }
}
