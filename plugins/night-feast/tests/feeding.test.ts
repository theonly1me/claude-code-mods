import { expect, test } from 'claude-code/testing'
import { createGame, advanceGame, gameTestResult } from '../hooks/shared/game/model'
import { restoreGame } from '../hooks/shared/game/restore'
import { createWorld, snapshotWorld, restoreWorld } from '../hooks/shared/world'

test('contact eats one human and pauses for the feeding animation', () => {
  const game = createGame()
  game.x = 45
  advanceGame({ game, milliseconds: 80, automatic: false })
  expect(game.meals).toBe(1)
  expect(game.humans).toEqual([95])
  expect(game.feeding?.x).toBe(45)
  const position = game.x
  for (let frame = 0; frame < 6; frame += 1) advanceGame({ game, milliseconds: 80, automatic: true })
  expect(game.x).toBe(position)
  expect(game.meals).toBe(1)
  advanceGame({ game, milliseconds: 100, automatic: true })
  advanceGame({ game, milliseconds: 80, automatic: true })
  expect(game.feeding).toBeNull()
  expect(game.x).toBeGreaterThan(position)
})

test('a passing check cannot count a meal when there is nobody to eat', () => {
  const game = createGame()
  game.humans = []
  gameTestResult({ game, passed: true })
  expect(game.meals).toBe(0)
  expect(game.passedChecks).toBe(1)
  expect(game.feeding).toBeNull()
  advanceGame({ game, milliseconds: 80, automatic: false })
  expect(game.humans.length).toBe(2)
  expect(game.meals).toBe(0)
})

test('an upgrade preserves positions without turning old bug scores into meals', () => {
  const game = restoreGame({ x: 20, y: 12, bugs: [38, 76], score: 17, passedChecks: 2, platforms: [{ x: 15, y: 12, width: 14 }] })
  expect(game.x).toBe(20)
  expect(game.humans).toEqual([38, 76])
  expect(game.meals).toBe(0)
  expect(game.passedChecks).toBe(2)
  expect(game.feeding).toBeNull()
})

test('a reload preserves the meal count and copies an active feeding animation', () => {
  const world = createWorld()
  gameTestResult({ game: world.game, passed: true })
  const snapshot = snapshotWorld(world)
  const restored = createWorld()
  restoreWorld({ world: restored, snapshot })
  expect(restored.game.meals).toBe(1)
  expect(restored.game.feeding).toEqual({ x: 45, startedAt: 0 })
  if (restored.game.feeding !== null) restored.game.feeding.x = 30
  restored.game.humans.push(120)
  expect(world.game.feeding?.x).toBe(45)
  expect(world.game.humans).toEqual([95])
})
