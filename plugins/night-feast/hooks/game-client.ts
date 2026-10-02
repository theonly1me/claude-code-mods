import type { ClientModule } from 'claude-code'
import { advanceGame, moveGame, jumpGame, gameTestResult, buildPlatform } from './shared/game/model'
import { restoreGame } from './shared/game/restore'
import type { Game } from './shared/game/model'
import { createBitmap } from './shared/render/bitmap'
import { drawGame } from './shared/game/draw'
import { colorText } from './shared/client-render'

const GameClient: ClientModule<{ activity: string; passedChecks: number; failedChecks: number; builds: number }, { game: Game }> = (props, surface) => {
  const previousGame = surface.state?.game
  const game = previousGame !== undefined && 'humans' in previousGame ? previousGame : restoreGame(previousGame)
  while (game.passedChecks < props.passedChecks) gameTestResult({ game, passed: true })
  while (game.failedChecks < props.failedChecks) gameTestResult({ game, passed: false })
  while (game.builds < props.builds) buildPlatform(game)
  if (surface.state === undefined || previousGame !== game) {
    surface.setState({ game })
    surface.every(80, () => {
      advanceGame({ game, milliseconds: 80, automatic: false })
      surface.setState({ game })
    })
    surface.onKey(event => {
      if (event.key === 'left' || event.key === 'a') moveGame({ game, direction: -1 })
      if (event.key === 'right' || event.key === 'd') moveGame({ game, direction: 1 })
      if (event.key === ' ' || event.key === 'up' || event.key === 'w') jumpGame(game)
      surface.setState({ game })
    })
    surface.onPointer(event => {
      if (event.type !== 'down') return
      moveGame({ game, direction: event.x < surface.columns / 2 ? -1 : 1 })
      jumpGame(game)
      surface.setState({ game })
    })
  }
  const bitmap = createBitmap({ width: Math.max(1, Math.min(512, surface.columns)), height: Math.max(2, surface.rows - 1) * 2 })
  drawGame({ bitmap, game, tick: Math.floor(game.clock / 80) })
  const { Box, Button, Text } = surface.elements
  return Box({ flexDirection: 'column', children: [
    colorText({ elements: surface.elements, bitmap }),
    Box({ flexDirection: 'row', columnGap: 2, children: [
      Button({ key: 'left', label: 'Left', onPress: () => moveGame({ game, direction: -1 }) }),
      Button({ key: 'jump', label: 'Jump', onPress: () => jumpGame(game) }),
      Button({ key: 'right', label: 'Right', onPress: () => moveGame({ game, direction: 1 }) }),
      Text({ children: [`${game.meals} humans eaten · ${props.activity} · Esc returns to prompt`] }),
    ] }),
  ] })
}

export default GameClient
