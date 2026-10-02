import type { Bitmap } from '../render/bitmap'
import { landscape, rectangle } from '../art'
import { drawVampire } from './character'
import { drawHumans } from './humans'
import type { Game } from './model'

export function drawGame(options: { bitmap: Bitmap; game: Game; tick: number }): void {
  const { bitmap, game } = options
  landscape({ bitmap, night: true, tick: options.tick })
  const scale = Math.max(1, Math.floor((bitmap.height - 2) / 20))
  const camera = Math.max(0, game.x - bitmap.width / scale / 3)
  const ground = bitmap.height - 3
  for (const platform of game.platforms) {
    rectangle({ bitmap, x: (platform.x - camera) * scale, y: ground - (16 - platform.y) * scale, width: platform.width * scale, height: scale, color: 0x7cc9d4 })
  }
  drawHumans({ bitmap, game, camera, ground, scale })
  drawVampire({ bitmap, game, tick: options.tick, camera, ground, scale })
}
