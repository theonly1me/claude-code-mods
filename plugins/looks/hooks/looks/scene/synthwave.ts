import { setPixel } from '../../shared/pixel/bitmap'
import { blend, band, disc, hexColor, noise } from './paint'
import type { SceneInput } from './paint'

const HORIZON = 8
const SKY_TOP = hexColor('#12062b')
const SKY_LOW = hexColor('#8a1c9e')
const SUN_TOP = hexColor('#ffe66d')
const SUN_BOTTOM = hexColor('#ff2e88')
const GROUND = hexColor('#0c0420')
const CYAN = hexColor('#2de2e6')
const GRID = hexColor('#1b8f9c')
const MOUNTAIN = hexColor('#1a0840')

export function drawSynthwave(input: SceneInput): void {
  const { bitmap, ms } = input
  const width = bitmap.width
  const centerX = Math.floor(width / 2)
  for (let y = 0; y < HORIZON; y += 1) {
    band({ bitmap, y, height: 1, color: blend({ from: SKY_TOP, to: SKY_LOW, amount: y / (HORIZON - 1) }) })
  }
  band({ bitmap, y: HORIZON, height: bitmap.height - HORIZON, color: GROUND })
  for (let star = 0; star < Math.floor(width / 5); star += 1) {
    const x = Math.floor(noise(star + 1) * width)
    const y = Math.floor(noise(star + 77) * 4)
    if (Math.floor(ms / 400 + star) % 4 !== 0) {
      setPixel({ bitmap, x, y, color: hexColor('#ffd6f5') })
    }
  }
  const scroll = input.isWorking ? Math.floor(ms / 140) : 0
  disc({
    bitmap,
    cx: centerX,
    cy: HORIZON,
    radius: 8,
    colorAt: y => {
      if (y >= HORIZON) {
        return null
      }
      const isCut = y >= 4 && (y + scroll) % 3 === 0
      return isCut ? null : blend({ from: SUN_TOP, to: SUN_BOTTOM, amount: y / HORIZON })
    },
  })
  for (const side of [-1, 1]) {
    for (let step = 0; step < 16; step += 1) {
      const x = centerX + side * (13 + step)
      const peak = Math.max(0, 6 - Math.abs(step - 7) * 0.8 - (side === -1 ? 0 : 1))
      for (let y = HORIZON - Math.round(peak); y < HORIZON; y += 1) {
        setPixel({ bitmap, x, y, color: y === HORIZON - Math.round(peak) ? CYAN : MOUNTAIN })
      }
    }
  }
  band({ bitmap, y: HORIZON, height: 1, color: CYAN })
  const phase = input.isWorking ? (ms / 220) % 3 : 0
  for (let y = HORIZON + 1; y < bitmap.height; y += 1) {
    const depth = y - HORIZON
    for (let x = 0; x < width; x += 1) {
      const offset = (x - centerX) / (depth * 1.7)
      if (Math.abs(offset - Math.round(offset)) < 0.09) {
        setPixel({ bitmap, x, y, color: GRID })
      }
    }
    if (Math.floor(depth * 1.4 + phase) % 3 === 0) {
      band({ bitmap, y, height: 1, color: GRID })
    }
  }
}
