import type { Bitmap } from './render/bitmap'
import { drawSprite, egg, familiar, landscape, rectangle } from './art'
import { petStage } from './progress'
import type { World } from './world'

export function drawPet(options: { bitmap: Bitmap; world: World }): void {
  const { bitmap, world } = options
  landscape({ bitmap, night: world.activity === 'idle', tick: world.tick })
  const stage = petStage(world.completed)
  const scale = Math.max(1, Math.min(stage === 'adult' ? 4 : stage === 'juvenile' ? 3 : 2, Math.floor((bitmap.height - 3) / 9)))
  const hop = world.celebration > 0 || world.activity === 'testing' ? Math.round(Math.abs(Math.sin(world.tick / 3)) * 3) : 0
  const center = Math.floor(bitmap.width / 2) - 4 * scale
  drawSprite({ bitmap, sprite: stage === 'egg' ? egg : familiar, x: center, y: bitmap.height - 3 - 8 * scale - hop, scale })
  if (world.activity === 'reading' || world.activity === 'thinking') rectangle({ bitmap, x: center + 6 * scale, y: bitmap.height - 5, width: 6, height: 2, color: 0xf5ead3 })
  if (world.activity === 'editing') rectangle({ bitmap, x: center + 9 * scale, y: bitmap.height - 7, width: 5, height: 4, color: 0x7cc9d4 })
  if (world.activity === 'idle' && stage !== 'egg') {
    rectangle({ bitmap, x: center + 10 * scale, y: 2, width: 3, height: 1, color: 0xb393de })
  }
}
