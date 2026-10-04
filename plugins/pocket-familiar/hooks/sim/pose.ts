import { isAmbientAllowed } from './ambient'
import { progressOf } from './ambientPaths'
import type { EyeState, FamiliarState } from './types'

export type Mouth = 'none' | 'tongue' | 'yawn'

export type FoxPose = {
  x: number
  lift: number
  eyes: EyeState | undefined
  tailSpin: number
  mouth: Mouth
  isNapping: boolean
}

function hop(options: { ms: number; periodMs: number; height: number }): number {
  const phase = (options.ms % options.periodMs) / options.periodMs
  return phase < 0.3 ? -Math.round(Math.sin((phase / 0.3) * Math.PI) * options.height) : 0
}

function jitter(options: { ms: number; stepMs: number }): number {
  return Math.floor(options.ms / options.stepMs) % 2 === 0 ? 1 : -1
}

function ambientPose(options: { state: FamiliarState; base: FoxPose }): FoxPose {
  const { state, base } = options
  const ambient = state.ambient
  const progress = progressOf(ambient)
  const { ms } = ambient
  if (ambient.kind === 'butterfly') {
    return { ...base, lift: hop({ ms, periodMs: 1100, height: 1 }) }
  }
  if (ambient.kind === 'leaf') {
    if (progress < 0.45) {
      return { ...base, lift: 1, eyes: 'open' }
    }
    if (progress < 0.65) {
      return { ...base, lift: -Math.round(Math.sin(((progress - 0.45) / 0.2) * Math.PI) * 2) }
    }
    return { ...base, eyes: 'happy', mouth: progress < 0.85 ? 'tongue' : 'none' }
  }
  if (ambient.kind === 'yarn') {
    const isBatting = ms % 1400 < 220
    return { ...base, lift: isBatting ? -1 : 0, eyes: isBatting ? 'happy' : undefined }
  }
  if (ambient.kind === 'tail') {
    const isDizzy = progress > 0.85
    return {
      ...base,
      x: isDizzy ? base.x : base.x + jitter({ ms, stepMs: 140 }),
      tailSpin: isDizzy ? 0 : Math.sin(ms / 90) * 60,
      eyes: isDizzy ? 'shut' : 'happy',
    }
  }
  if (ambient.kind === 'groom') {
    const phase = Math.floor(ms / 320) % 4
    return { ...base, lift: phase % 2, eyes: phase < 2 ? 'shut' : 'happy', mouth: phase % 2 === 1 ? 'tongue' : 'none' }
  }
  if (ambient.kind === 'dig') {
    if (progress < 0.3) {
      return base
    }
    if (progress < 0.75) {
      return { ...base, lift: 1, x: base.x + (Math.floor(ms / 90) % 2) }
    }
    return { ...base, eyes: 'happy', lift: hop({ ms, periodMs: 700, height: 1 }) }
  }
  if (ambient.kind === 'stretch') {
    if (progress < 0.4) {
      return { ...base, lift: 1, eyes: 'shut' }
    }
    return progress < 0.75 ? { ...base, eyes: 'shut', mouth: 'yawn' } : { ...base, eyes: 'happy' }
  }
  if (ambient.kind === 'nap') {
    return progress < 0.85 ? { ...base, eyes: 'shut', isNapping: true } : { ...base, eyes: 'happy', lift: 1 }
  }
  return base
}

export function foxPoseOf(state: FamiliarState): FoxPose {
  const base: FoxPose = {
    x: Math.round(state.ambient.foxX),
    lift: 0,
    eyes: undefined,
    tailSpin: 0,
    mouth: 'none',
    isNapping: false,
  }
  if (state.isSleeping) {
    return base
  }
  if (state.activity === 'thinking' && state.runningTools === 0) {
    return { ...base, x: Math.max(2, Math.round(state.ambient.foxX + Math.sin(state.clockMs / 650) * 3)) }
  }
  return isAmbientAllowed(state) ? ambientPose({ state, base }) : base
}
