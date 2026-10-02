import { expect, test } from 'claude-code/testing'
import { createBitmap } from '../hooks/shared/render/bitmap'
import { drawGame } from '../hooks/shared/game/draw'
import { createGame, advanceGame, moveGame, jumpGame, gameTestResult, buildPlatform } from '../hooks/shared/game/model'

test('a jump lands on a raised platform without falling through', () => {
  const game = createGame()
  game.x = 30
  jumpGame(game)
  for (let frame = 0; frame < 30; frame += 1) advanceGame({ game, milliseconds: 80, automatic: false })
  expect(game.y).toBe(12)
  expect(game.grounded).toBe(true)
})

test('left input cannot move the vampire outside the world', () => {
  const game = createGame()
  game.x = 0
  moveGame({ game, direction: -1 })
  advanceGame({ game, milliseconds: 80, automatic: false })
  expect(game.x).toBe(0)
})

test('test failures add humans and successful checks trigger feeding', () => {
  const game = createGame()
  gameTestResult({ game, passed: false })
  expect(game.humans.length).toBe(3)
  gameTestResult({ game, passed: true })
  expect(game.humans.length).toBe(2)
  expect(game.meals).toBe(1)
  expect(game.feeding).not.toBeNull()
  buildPlatform(game)
  expect(game.platforms.length).toBe(3)
})

test('the vampire keeps its full head and feet in a six-row scene', () => {
  const bitmap = createBitmap({ width: 64, height: 12 })
  const game = createGame()
  game.x = 6
  drawGame({ bitmap, game, tick: 4 })
  expect(bitmap.pixels[64 + 7]).toBe(0x283042)
  expect(bitmap.pixels[64 * 8 + 6]).toBe(0x283042)
})
