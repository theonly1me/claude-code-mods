import { FARMER_SPEED_PIXELS_PER_SECOND, HOE_MS } from './constants'
import type { Farmer, FarmerGoal, FarmerMode } from './types'

const CHEER_MS = 1600
const STROLL_AFTER_MS = 7000

export function createFarmer(): Farmer {
  return { x: 12, targetX: 12, goal: 'rest', mode: 'idle', modeMs: 0, clockMs: 0, isFacingLeft: false }
}

function enter(options: { farmer: Farmer; mode: FarmerMode }): void {
  options.farmer.mode = options.mode
  options.farmer.modeMs = 0
}

function walkTo(options: { farmer: Farmer; x: number; goal: FarmerGoal }): void {
  const { farmer } = options
  farmer.targetX = options.x
  farmer.goal = options.goal
  enter({ farmer, mode: 'walk' })
}

export function sendFarmer(options: { farmer: Farmer; x: number }): void {
  walkTo({ farmer: options.farmer, x: options.x, goal: 'hoe' })
}

export function cheerFarmer(farmer: Farmer): void {
  enter({ farmer, mode: 'cheer' })
}

function arrive(farmer: Farmer): void {
  farmer.x = farmer.targetX
  if (farmer.goal === 'hoe') {
    farmer.isFacingLeft = true
    enter({ farmer, mode: 'hoe' })
    return
  }
  enter({ farmer, mode: 'idle' })
}

export function advanceFarmer(options: { farmer: Farmer; dtMs: number; strollRange: number }): void {
  const { farmer, dtMs } = options
  farmer.clockMs += dtMs
  farmer.modeMs += dtMs
  if (farmer.mode === 'walk') {
    const step = (FARMER_SPEED_PIXELS_PER_SECOND * dtMs) / 1000
    const distance = farmer.targetX - farmer.x
    farmer.isFacingLeft = distance < 0
    if (Math.abs(distance) <= step) {
      arrive(farmer)
      return
    }
    farmer.x += Math.sign(distance) * step
    return
  }
  const limit = farmer.mode === 'hoe' ? HOE_MS : farmer.mode === 'cheer' ? CHEER_MS : STROLL_AFTER_MS
  if (farmer.modeMs < limit) {
    return
  }
  if (farmer.mode !== 'idle') {
    enter({ farmer, mode: 'idle' })
    return
  }
  const spot = 4 + ((Math.floor(farmer.clockMs / 997) * 37) % Math.max(1, options.strollRange))
  walkTo({ farmer, x: spot, goal: 'rest' })
}
