import { setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import type { Stats } from '../sim/types'

const BAR_WIDTH = 12
const TRACK: Color = 0x14162a

const BARS: readonly { key: keyof Stats; color: Color }[] = [
  { key: 'fullness', color: 0xf4a261 },
  { key: 'joy', color: 0xf28ab2 },
  { key: 'energy', color: 0x5ad1e6 },
]

export function drawHud(options: { bitmap: Bitmap; stats: Stats }): void {
  const { bitmap, stats } = options
  const startX = bitmap.width - BAR_WIDTH - 4
  BARS.forEach((bar, index) => {
    const y = 1 + index * 2
    const filled = Math.round((stats[bar.key] / 100) * BAR_WIDTH)
    setPixel({ bitmap, x: startX - 2, y, color: bar.color })
    for (let step = 0; step < BAR_WIDTH; step += 1) {
      const color = step < filled ? bar.color : mixColors({ from: bar.color, to: TRACK, amount: 0.72 })
      setPixel({ bitmap, x: startX + step, y, color })
    }
  })
}
