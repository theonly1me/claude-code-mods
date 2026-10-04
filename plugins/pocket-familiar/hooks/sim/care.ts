import { BUBBLE_MS, FAILURES_FOR_DUCK, HOP_MS, IDLE_SLEEP_MS, WORRY_MS } from './constants'
import { growthOf } from './growth'
import { addStats, drift, STARTING_STATS } from './stats'
import type { BubbleGlyph, FamiliarState, ToolKind } from './types'

const XP = { tool: 1, test: 5, turn: 3 } as const

export function createState(): FamiliarState {
  return {
    stats: STARTING_STATS,
    lifetimeXp: 0,
    activity: 'idle',
    runningTools: 0,
    isTurnRunning: false,
    idleMs: 0,
    isSleeping: false,
    failureStreak: 0,
    hasDuck: false,
    worriedMs: 0,
    hopMs: 0,
    bubble: undefined,
    clockMs: 0,
    hour: 21,
    evolutions: [],
  }
}

function react(options: { state: FamiliarState; glyph: BubbleGlyph }): void {
  options.state.bubble = { glyph: options.glyph, ageMs: 0 }
}

function wake(state: FamiliarState): void {
  state.idleMs = 0
  state.isSleeping = false
}

function gainXp(options: { state: FamiliarState; amount: number }): void {
  const { state } = options
  const before = growthOf(state.lifetimeXp)
  state.lifetimeXp += options.amount
  const after = growthOf(state.lifetimeXp)
  if (after.minimumXp !== before.minimumXp) {
    state.evolutions.push(after)
    state.hopMs = HOP_MS
    react({ state, glyph: 'alert' })
  }
}

export function noteToolStart(options: { state: FamiliarState; kind: ToolKind }): void {
  const { state, kind } = options
  wake(state)
  state.runningTools += 1
  if (kind !== 'other') {
    state.activity = kind
  }
}

export function noteToolEnd(options: { state: FamiliarState; kind: ToolKind; isFailure: boolean; isCreation: boolean }): void {
  const { state, kind } = options
  wake(state)
  state.runningTools = Math.max(0, state.runningTools - 1)
  if (state.runningTools === 0) {
    state.activity = state.isTurnRunning ? 'thinking' : 'idle'
  }
  if (options.isFailure) {
    state.failureStreak += 1
    state.worriedMs = WORRY_MS
    const isDuckArriving = state.failureStreak >= FAILURES_FOR_DUCK && !state.hasDuck
    state.hasDuck = state.hasDuck || isDuckArriving
    react({ state, glyph: isDuckArriving ? 'alert' : 'question' })
    return
  }
  const hadDuck = state.hasDuck
  state.failureStreak = 0
  state.hasDuck = false
  if (kind === 'test') {
    state.stats = addStats({ stats: state.stats, change: { fullness: 12, joy: 2 } })
    react({ state, glyph: 'heart' })
  } else if (options.isCreation) {
    state.stats = addStats({ stats: state.stats, change: { joy: 6 } })
    react({ state, glyph: 'note' })
  } else if (hadDuck) {
    react({ state, glyph: 'heart' })
  }
  gainXp({ state, amount: kind === 'test' ? XP.test : XP.tool })
}

export function noteTurnStart(state: FamiliarState): void {
  wake(state)
  state.isTurnRunning = true
  if (state.runningTools === 0) {
    state.activity = 'thinking'
  }
}

export function noteTurnEnd(options: { state: FamiliarState; isSuccess: boolean }): void {
  const { state } = options
  state.isTurnRunning = false
  state.idleMs = 0
  if (state.runningTools === 0) {
    state.activity = 'idle'
  }
  if (!options.isSuccess) {
    return
  }
  state.stats = addStats({ stats: state.stats, change: { joy: 4 } })
  state.hopMs = HOP_MS
  gainXp({ state, amount: XP.turn })
}

export function noteUserActive(state: FamiliarState): void {
  wake(state)
}

export function advance(options: { state: FamiliarState; dtMs: number }): void {
  const { state, dtMs } = options
  state.clockMs += dtMs
  const isBusy = state.isTurnRunning || state.runningTools > 0
  state.idleMs = isBusy ? 0 : state.idleMs + dtMs
  if (!state.isSleeping && state.idleMs >= IDLE_SLEEP_MS) {
    state.isSleeping = true
    state.activity = 'idle'
  }
  state.stats = drift({ stats: state.stats, dtMs, isSleeping: state.isSleeping })
  state.worriedMs = Math.max(0, state.worriedMs - dtMs)
  state.hopMs = Math.max(0, state.hopMs - dtMs)
  if (state.bubble) {
    state.bubble.ageMs += dtMs
    if (state.bubble.ageMs >= BUBBLE_MS) {
      state.bubble = undefined
    }
  }
}
