import type { AmbientState } from './types'

export type Point = { x: number; y: number }

export function progressOf(ambient: AmbientState): number {
  return ambient.durationMs <= 0 ? 1 : Math.min(1, ambient.ms / ambient.durationMs)
}

export function butterflyAt(options: { ambient: AmbientState; width: number }): Point {
  const { ambient, width } = options
  const progress = progressOf(ambient)
  const wander = ambient.fromX + 16 + Math.sin(ambient.ms / 1300) * 12 + Math.sin(ambient.ms / 470) * 2
  const away = progress > 0.85 ? (progress - 0.85) * 70 : 0
  return {
    x: Math.min(width - 20, Math.max(2, wander + away * 0.6)),
    y: 4 + Math.sin(ambient.ms / 370) * 2 - away,
  }
}

export function leafAt(ambient: AmbientState): Point & { isCaught: boolean } {
  const progress = progressOf(ambient)
  const fall = Math.min(1, progress / 0.6)
  return {
    x: ambient.targetX + 5 + Math.sin(ambient.ms / 260) * 2,
    y: -2 + fall * 9,
    isCaught: progress >= 0.6,
  }
}

export function yarnAt(ambient: AmbientState): { x: number; roll: number } {
  const progress = progressOf(ambient)
  return {
    x: ambient.fromX + 15 + Math.sin(ambient.ms / 1100) * 8 + progress * 6,
    roll: Math.floor(ambient.ms / 110),
  }
}

export function shootingStarAt(options: { ambient: AmbientState; width: number }): Point | undefined {
  const progress = progressOf(options.ambient)
  const windows = [
    { start: 0.12, end: 0.42, originX: options.width - 24 },
    { start: 0.55, end: 0.85, originX: options.width - 38 },
  ]
  const active = windows.find(window => progress >= window.start && progress < window.end)
  if (!active) {
    return undefined
  }
  const amount = (progress - active.start) / (active.end - active.start)
  return { x: active.originX - amount * 12, y: amount * 7 }
}

export function birdAt(options: { ambient: AmbientState; width: number }): Point {
  const progress = progressOf(options.ambient)
  return { x: options.width + 3 - progress * (options.width + 8), y: 3 + Math.sin(options.ambient.ms / 500) }
}
