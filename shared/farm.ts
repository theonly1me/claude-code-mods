import type { Bitmap } from './render/bitmap'
import { drawSprite, farmer, landscape, rectangle } from './art'
import type { World } from './world'

export function drawFarm(options: { bitmap: Bitmap; world: World }): void {
  const { bitmap, world } = options
  landscape({ bitmap, tick: world.tick })
  const ground = bitmap.height - 4
  const stage = Math.floor(world.crops)
  for (let column = 12; column < bitmap.width - 5; column += 14) {
    rectangle({ bitmap, x: column - 2, y: ground + 1, width: 7, height: 2, color: 0x9b6b43 })
    if (stage === 0) continue
    rectangle({ bitmap, x: column, y: ground - stage * 2, width: 1, height: stage * 2 + 1, color: 0x65b891 })
    if (stage >= 2) {
      rectangle({ bitmap, x: column - 2, y: ground - 3, width: 5, height: 1, color: 0xa7d973 })
      rectangle({ bitmap, x: column + 1, y: ground - 5, width: 3, height: 1, color: 0x65b891 })
    }
    if (stage >= 3) {
      const color = [0xe76f51, 0xf4a261, 0xffd166, 0xb393de][Math.floor(column / 14) % 4] ?? 0xe76f51
      rectangle({ bitmap, x: column - 2, y: ground - 6, width: 3, height: stage === 4 ? 3 : 1, color })
      rectangle({ bitmap, x: column + 2, y: ground - 4, width: 3, height: stage === 4 ? 3 : 1, color })
    }
  }
  drawSprite({ bitmap, sprite: farmer, x: world.working ? (world.tick * 0.7) % Math.max(8, bitmap.width - 8) : 2, y: ground - 6 })
  if (world.working && world.tick % 3 !== 0) {
    rectangle({ bitmap, x: (world.tick * 0.7 + 7) % Math.max(8, bitmap.width - 8), y: ground - 2, width: 1, height: 2, color: 0x7cc9d4 })
  }
  world.beds.forEach((bed, index) => {
    if (bed < 4) { rectangle({ bitmap, x: bitmap.width - (index + 1) * 8, y: 1, width: 2, height: 3, color: 0x65b891 }); return }
    rectangle({ bitmap, x: bitmap.width - (index + 1) * 8, y: 2, width: 5, height: 3, color: 0x9b6b43 })
    rectangle({ bitmap, x: bitmap.width - (index + 1) * 8, y: 1, width: 5, height: 1, color: 0xffd166 })
  })
}
