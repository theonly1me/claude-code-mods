import { FARMER_SPEED_PIXELS_PER_SECOND } from './constants'
import type { Farmer, FarmerMode, FarmerStep } from './types'

export function createFarmer(): Farmer {
  return { x: 22, mode: 'idle', modeMs: 0, clockMs: 0, isFacingLeft: false, isCarrying: false, step: undefined }
}

function enter(options: { farmer: Farmer; mode: FarmerMode }): void {
  options.farmer.mode = options.mode
  options.farmer.modeMs = 0
}

function begin(farmer: Farmer): void {
  const { step } = farmer
  if (!step) {
    enter({ farmer, mode: 'idle' })
    return
  }
  if (step.isFacingLeft !== undefined) {
    farmer.isFacingLeft = step.isFacingLeft
  }
  enter({ farmer, mode: step.task })
}

export function assignStep(options: { farmer: Farmer; step: FarmerStep }): void {
  const { farmer, step } = options
  farmer.step = step
  farmer.isCarrying = step.isCarrying
  if (Math.abs(step.x - farmer.x) < 0.5) {
    farmer.x = step.x
    begin(farmer)
    return
  }
  enter({ farmer, mode: 'walk' })
}

export function isOnWork(farmer: Farmer): boolean {
  return farmer.step?.isWork === true
}

export function isFree(farmer: Farmer): boolean {
  return farmer.step === undefined
}

export function advanceFarmer(options: { farmer: Farmer; dtMs: number }): FarmerStep | undefined {
  const { farmer, dtMs } = options
  farmer.clockMs += dtMs
  farmer.modeMs += dtMs
  const { step } = farmer
  if (!step) {
    return undefined
  }
  if (farmer.mode === 'walk') {
    const travel = (FARMER_SPEED_PIXELS_PER_SECOND * dtMs) / 1000
    const distance = step.x - farmer.x
    farmer.isFacingLeft = distance < 0
    if (Math.abs(distance) <= travel) {
      farmer.x = step.x
      begin(farmer)
      return undefined
    }
    farmer.x += Math.sign(distance) * travel
    return undefined
  }
  if (farmer.modeMs < step.durationMs) {
    return undefined
  }
  farmer.step = undefined
  farmer.isCarrying = false
  enter({ farmer, mode: 'idle' })
  return step
}
