import { createGame } from './model'
import type { Game } from './model'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function restoreGame(value: unknown): Game {
  const game = createGame()
  if (!isRecord(value)) return game
  for (const key of ['x', 'y', 'velocity', 'direction', 'movingUntil', 'meals', 'clock', 'passedChecks', 'failedChecks', 'builds'] as const) {
    const number = value[key]
    if (isFiniteNumber(number)) game[key] = number
  }
  if (typeof value.grounded === 'boolean') game.grounded = value.grounded
  const humans = Array.isArray(value.humans) ? value.humans : value.bugs
  if (Array.isArray(humans)) game.humans = humans.filter(isFiniteNumber)
  if (Array.isArray(value.platforms)) game.platforms = value.platforms.flatMap((platform: unknown) => {
    if (!isRecord(platform) || !isFiniteNumber(platform.x) || !isFiniteNumber(platform.y) || !isFiniteNumber(platform.width)) return []
    return [{ x: platform.x, y: platform.y, width: platform.width }]
  })
  if (isRecord(value.feeding) && isFiniteNumber(value.feeding.x) && isFiniteNumber(value.feeding.startedAt)) {
    game.feeding = { x: value.feeding.x, startedAt: value.feeding.startedAt }
  }
  return game
}
