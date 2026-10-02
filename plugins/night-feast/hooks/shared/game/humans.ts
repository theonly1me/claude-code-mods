import type { Bitmap } from '../render/bitmap'
import { drawSprite } from '../art'
import type { Sprite } from '../art'
import type { Game } from './model'

const villager: Sprite = ['..dd..', '.daad.', '.aaba.', '..aa..', '.cccc.', 'a.cc.a', '..bb..', '.b..b.']
const neighbor: Sprite = villager.map(row => row.replaceAll('c', 'y').replaceAll('d', 'b'))
const mealSpark: Sprite = ['.e.e.', 'eeeee', '.eee.', '..e..']

export function drawHumans(options: { bitmap: Bitmap; game: Game; camera: number; ground: number; scale: number }): void {
  const { bitmap, game, camera, ground, scale } = options
  for (const [index, position] of game.humans.entries()) {
    drawSprite({ bitmap, sprite: index % 2 === 0 ? villager : neighbor, x: (position - camera) * scale, y: ground - villager.length * scale, scale })
  }
  if (game.feeding === null) return
  const fraction = Math.max(0, Math.min(1, (game.clock - game.feeding.startedAt) / 600))
  const position = game.feeding.x + (game.x + 5 - game.feeding.x) * fraction
  if (fraction < 0.7) drawSprite({ bitmap, sprite: villager, x: (position - camera) * scale, y: ground - (villager.length + fraction * 2) * scale, scale })
  drawSprite({ bitmap, sprite: mealSpark, x: (game.x - camera + 2) * scale, y: ground - (12 + fraction * 3) * scale, scale })
}
