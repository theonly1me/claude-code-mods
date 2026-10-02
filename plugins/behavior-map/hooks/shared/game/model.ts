export type Platform = { x: number; y: number; width: number }
export type Game = { x: number; y: number; velocity: number; direction: number; movingUntil: number; grounded: boolean; meals: number; humans: number[]; feeding: { x: number; startedAt: number } | null; platforms: Platform[]; clock: number; passedChecks: number; failedChecks: number; builds: number }

export function createGame(): Game {
  return { x: 4, y: 16, velocity: 0, direction: 1, movingUntil: 0, grounded: true, meals: 0, humans: [45, 95], feeding: null, platforms: [{ x: 28, y: 12, width: 14 }, { x: 64, y: 9, width: 16 }], clock: 0, passedChecks: 0, failedChecks: 0, builds: 0 }
}

export function moveGame(options: { game: Game; direction: number }): void {
  options.game.direction = options.direction
  options.game.movingUntil = options.game.clock + 300
}

export function jumpGame(game: Game): void {
  if (!game.grounded) return
  game.velocity = -18
  game.grounded = false
}

export function advanceGame(options: { game: Game; milliseconds: number; automatic: boolean }): void {
  const { game } = options
  const delta = Math.min(100, options.milliseconds) / 1000
  game.clock += options.milliseconds
  if (game.feeding !== null) {
    if (game.clock - game.feeding.startedAt < 600) return
    game.feeding = null
  }
  if (game.humans.length === 0) game.humans.push(game.x + 30, game.x + 60)
  if (options.automatic || game.clock < game.movingUntil) game.x = Math.max(0, game.x + game.direction * delta * 14)
  if (options.automatic && game.grounded && game.x % 28 < 2) jumpGame(game)
  const previousY = game.y
  game.velocity += delta * 30
  game.y += game.velocity * delta
  game.grounded = false
  const floor = [{ x: -1000, y: 16, width: 100000 }, ...game.platforms]
  for (const platform of floor) {
    if (game.velocity >= 0 && previousY <= platform.y && game.y >= platform.y && game.x + 6 > platform.x && game.x < platform.x + platform.width) {
      game.y = platform.y
      game.velocity = 0
      game.grounded = true
    }
  }
  const humanIndex = game.humans.findIndex(position => Math.abs(position - game.x) <= 5 && game.y >= 12)
  if (humanIndex >= 0) eatHuman({ game, humanIndex })
}

function eatHuman(options: { game: Game; humanIndex: number }): void {
  const [position] = options.game.humans.splice(options.humanIndex, 1)
  if (position === undefined) return
  options.game.meals += 1
  options.game.feeding = { x: position, startedAt: options.game.clock }
}

export function gameTestResult(options: { game: Game; passed: boolean }): void {
  if (options.passed) {
    options.game.passedChecks += 1
    eatHuman({ game: options.game, humanIndex: 0 })
  } else { options.game.failedChecks += 1; options.game.humans.push(options.game.x + 30) }
}

export function buildPlatform(game: Game): void {
  game.builds += 1
  game.platforms.push({ x: game.x + 20, y: 11, width: 16 })
  game.platforms = game.platforms.slice(-16)
}
