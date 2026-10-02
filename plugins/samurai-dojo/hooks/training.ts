import type { Bitmap } from './shared/render/bitmap'
import { stampScaled } from './shared/render/bitmap'
import { samuraiBodyFor } from './art/samuraiBody'
import { landscape, rectangle } from './shared/art'
import type { World } from './shared/world'

export function drawTraining(options: { bitmap: Bitmap; world: World }): void {
  const { bitmap, world } = options
  landscape({ bitmap, night: world.activity === 'reading' || world.activity === 'idle', tick: world.tick })
  const ground = bitmap.height - 3
  const scale = Math.max(1, Math.floor((bitmap.height - 3) / 14))
  const fighter = Math.max(1, Math.floor(bitmap.width * 0.26) - 7 * scale)
  const resting = world.activity === 'reading' || world.activity === 'thinking'
  const body = samuraiBodyFor({ isLowered: resting, isSquinting: resting }).bitmap
  const hop = world.celebration > 0 ? Math.round(Math.abs(Math.sin(world.tick / 3)) * 3) : 0
  stampScaled({ target: bitmap, source: body, x: fighter, y: ground - body.height * scale - hop, scale })
  const target = Math.min(bitmap.width - 14 * scale, fighter + 26 * scale)
  const swing = world.tick % 24
  if (resting) rectangle({ bitmap, x: fighter - scale, y: ground - scale, width: 16 * scale, height: scale, color: 0x7c899e })
  if (world.activity === 'editing') {
    for (let column = target; column < bitmap.width - 4; column += 10 * scale) {
      const cut = swing > 16 && column === target
      rectangle({ bitmap, x: column, y: ground - (cut ? 4 : 10) * scale, width: scale, height: (cut ? 4 : 10) * scale, color: 0x65b891 })
      rectangle({ bitmap, x: column + scale, y: ground - 3 * scale, width: 3 * scale, height: scale, color: 0xa7d973 })
    }
  }
  if (world.activity === 'testing') {
    rectangle({ bitmap, x: target + 3 * scale, y: ground - 10 * scale, width: 2 * scale, height: 10 * scale, color: 0x9b6b43 })
    rectangle({ bitmap, x: target + (swing > 16 ? 2 : 0) * scale, y: ground - 6 * scale, width: 8 * scale, height: scale, color: 0xf4a261 })
  }
  if (world.activity === 'working') {
    if (world.tick % 64 < 44) stampScaled({ target: bitmap, source: body, x: target + Math.round(Math.sin(world.tick / 4) * 2 * scale), y: ground - body.height * scale, scale, flipped: true, tint: color => color === 0xd8372e ? 0xb393de : color })
    else rectangle({ bitmap, x: target, y: ground - 2 * scale, width: 14 * scale, height: scale, color: 0xb393de })
  }
  if (!resting) {
    const sharpening = world.activity === 'idle' && world.celebration === 0
    if (sharpening) rectangle({ bitmap, x: fighter + 15 * scale, y: ground - 2 * scale, width: 6 * scale, height: 2 * scale, color: 0x7c899e })
    rectangle({ bitmap, x: fighter + 12 * scale, y: ground - (sharpening ? 3 : 8 + swing % 4) * scale, width: (swing > 12 ? 18 : 12) * scale, height: scale, color: 0xf5ead3 })
  }
}
