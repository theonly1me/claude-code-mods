import {
  DUEL_FINISH_MS,
  EXCHANGE_MS,
  HOME_X,
  IMPACT_PROGRESS,
  RIVAL_RETREAT_PIXELS_PER_SECOND,
  RIVAL_STAND_OFFSET,
  RIVAL_WALK_PIXELS_PER_SECOND,
  SLASH_MS,
} from './constants'
import type { Duel, DuelPhase } from './types'

export type DuelStep = { didClash: boolean; didFinishStrike: boolean; didBow: boolean; isOver: boolean }

export const RIVAL_STAND_X = HOME_X + RIVAL_STAND_OFFSET
const IMPACT_MS = SLASH_MS * IMPACT_PROGRESS

export function createDuel(options: { columns: number; isWin: boolean; exchanges: number }): Duel {
  return {
    phase: 'enter',
    phaseMs: 0,
    rivalX: options.columns + 2,
    exchange: 0,
    exchanges: options.exchanges,
    isWin: options.isWin,
    isRetreat: false,
    struckExchange: -1,
    hasFinishStruck: false,
  }
}

function enter(options: { duel: Duel; phase: DuelPhase }): void {
  options.duel.phase = options.phase
  options.duel.phaseMs = 0
}

export function retreat(duel: Duel): void {
  duel.isRetreat = true
  if (duel.phase !== 'leave') {
    enter({ duel, phase: 'leave' })
  }
}

export function advanceDuel(options: { duel: Duel; dtMs: number; columns: number }): DuelStep {
  const { duel, dtMs } = options
  const step: DuelStep = { didClash: false, didFinishStrike: false, didBow: false, isOver: false }
  duel.phaseMs += dtMs
  const seconds = dtMs / 1000
  if (duel.phase === 'enter') {
    duel.rivalX = Math.max(RIVAL_STAND_X, duel.rivalX - RIVAL_WALK_PIXELS_PER_SECOND * seconds)
    if (duel.rivalX <= RIVAL_STAND_X) {
      enter({ duel, phase: 'exchange' })
    }
  } else if (duel.phase === 'exchange') {
    duel.exchange = Math.floor(duel.phaseMs / EXCHANGE_MS)
    const intoExchangeMs = duel.phaseMs - duel.exchange * EXCHANGE_MS
    if (duel.exchange >= duel.exchanges) {
      enter({ duel, phase: 'finish' })
    } else if (intoExchangeMs >= IMPACT_MS && duel.struckExchange < duel.exchange) {
      duel.struckExchange = duel.exchange
      step.didClash = true
    }
  } else if (duel.phase === 'finish') {
    if (duel.isWin && !duel.hasFinishStruck && duel.phaseMs >= IMPACT_MS) {
      duel.hasFinishStruck = true
      step.didFinishStrike = true
    }
    if (duel.phaseMs >= DUEL_FINISH_MS) {
      step.didBow = !duel.isWin
      enter({ duel, phase: 'leave' })
    }
  } else {
    const speed = duel.isRetreat ? RIVAL_RETREAT_PIXELS_PER_SECOND : RIVAL_WALK_PIXELS_PER_SECOND
    duel.rivalX += speed * seconds
    step.isOver = duel.rivalX > options.columns + 2
  }
  return step
}

export function attackerOf(duel: Duel): 'samurai' | 'rival' {
  return duel.exchange % 2 === 0 ? 'samurai' : 'rival'
}
