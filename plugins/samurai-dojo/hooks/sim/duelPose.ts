import { EXCHANGE_MS, IMPACT_PROGRESS, SLASH_MS } from './constants'
import { attackerOf } from './duel'
import { neutralPose, slashPose } from './pose'
import type { SamuraiPose } from './pose'
import type { Duel } from './types'

type Side = 'samurai' | 'rival'

const BLOCK_ANGLE = -78
const BOW_ANGLE = 70
const DROPPED_ANGLE = 62
const IMPACT_MS = SLASH_MS * IMPACT_PROGRESS
const RECOIL_MS = 140
const STEP_MS = 180

function walking(options: { duel: Duel; base: SamuraiPose }): SamuraiPose {
  const isUp = Math.floor(options.duel.phaseMs / STEP_MS) % 2 === 1
  return { ...options.base, offsetY: isUp ? -1 : 0 }
}

function exchangePose(options: { duel: Duel; side: Side; base: SamuraiPose }): SamuraiPose {
  const { duel, side, base } = options
  const intoMs = duel.phaseMs - duel.exchange * EXCHANGE_MS
  const variant = Math.floor(duel.exchange / 2) % 2 === 0 ? 'down' : 'up'
  if (attackerOf(duel) === side) {
    const progress = intoMs / SLASH_MS
    return progress <= 1 ? { ...slashPose({ variant, progress, base }), offsetX: 2 } : base
  }
  const isRecoiling = intoMs >= IMPACT_MS && intoMs < IMPACT_MS + RECOIL_MS
  return { ...base, isLowered: true, swordAngle: BLOCK_ANGLE, offsetX: isRecoiling ? -1 : 0, isSquinting: isRecoiling }
}

function finishPoses(options: { duel: Duel; base: SamuraiPose }): { samurai: SamuraiPose; rival: SamuraiPose } {
  const { duel, base } = options
  if (!duel.isWin) {
    const bow = { ...base, isLowered: true, swordAngle: BOW_ANGLE }
    return { samurai: bow, rival: bow }
  }
  const strike = slashPose({ variant: 'down', progress: Math.min(1, duel.phaseMs / SLASH_MS), base })
  const rival = duel.hasFinishStruck
    ? { ...base, isLowered: true, isSquinting: true, swordAngle: DROPPED_ANGLE, offsetY: 1 }
    : { ...base, isLowered: true, swordAngle: BLOCK_ANGLE }
  return { samurai: { ...strike, offsetX: 3 }, rival }
}

export function duelPoses(duel: Duel): { samurai: SamuraiPose; rival: SamuraiPose } {
  const base = neutralPose()
  if (duel.phase === 'enter') {
    return { samurai: base, rival: walking({ duel, base }) }
  }
  if (duel.phase === 'exchange') {
    return {
      samurai: exchangePose({ duel, side: 'samurai', base }),
      rival: exchangePose({ duel, side: 'rival', base }),
    }
  }
  if (duel.phase === 'finish') {
    return finishPoses({ duel, base })
  }
  const isBeaten = duel.isWin && !duel.isRetreat
  const rival = walking({ duel, base: isBeaten ? { ...base, isSquinting: true, swordAngle: DROPPED_ANGLE } : base })
  return { samurai: base, rival }
}
