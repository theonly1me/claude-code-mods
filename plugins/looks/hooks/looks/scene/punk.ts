import { drawGlyphRows, drawText, textWidth } from '../../shared/pixel/font'
import { setPixel } from '../../shared/pixel/bitmap'
import { band, hexColor, noise } from './paint'
import type { SceneInput } from './paint'

const DARK_BACKGROUND = hexColor('#0d0208')
const LIGHT_BACKGROUND = hexColor('#fde4f0')
const PINK = hexColor('#ff2e88')
const YELLOW = hexColor('#f5ff3b')
const LIGHT_YELLOW = hexColor('#c9a400')
const BLACK = hexColor('#111111')
const BOLT = ['..##', '.##.', '###.', '.###', '..#.', '.#..', '#...']
const BOLT_ROWS = BOLT.map(row => row.padEnd(4, '.'))

export function drawPunk(input: SceneInput): void {
  const { bitmap, ms, isLight } = input
  const background = isLight ? LIGHT_BACKGROUND : DARK_BACKGROUND
  const yellow = isLight ? LIGHT_YELLOW : YELLOW
  band({ bitmap, y: 0, height: bitmap.height, color: background })
  for (let x = 0; x < bitmap.width; x += 1) {
    const tooth = (x % 6) < 3 ? x % 3 : 5 - (x % 6)
    for (let y = 0; y <= tooth; y += 1) {
      setPixel({ bitmap, x, y, color: Math.floor(x / 6) % 2 === 0 ? PINK : yellow })
    }
  }
  const shift = input.isWorking ? Math.floor(ms / 90) : 0
  for (let x = 0; x < bitmap.width; x += 1) {
    const isOn = Math.floor((x + shift) / 3) % 2 === 0
    for (const y of [bitmap.height - 2, bitmap.height - 1]) {
      setPixel({ bitmap, x, y, color: (y + Math.floor((x + shift) / 3)) % 2 === 0 && isOn ? PINK : BLACK })
    }
  }
  const text = 'LOUD'
  const left = Math.floor((bitmap.width - textWidth(text)) / 2)
  drawText({ bitmap, text, x: left + 1, y: 4, color: PINK })
  drawText({ bitmap, text, x: left, y: 3, color: yellow })
  const isFlash = input.isWorking ? Math.floor(ms / 120) % 2 === 0 : Math.floor(ms / 700) % 3 === 0
  for (const side of [-1, 1]) {
    const x = side === -1 ? left - 12 : left + textWidth(text) + 8
    if (isFlash || side === (Math.floor(ms / 500) % 2 === 0 ? -1 : 1)) {
      drawGlyphRows({ bitmap, rows: BOLT_ROWS, x, y: 3, color: yellow })
    }
  }
  for (let spark = 0; spark < 6; spark += 1) {
    const x = Math.floor(noise(spark + 5) * bitmap.width)
    const y = 3 + Math.floor(noise(spark + 40 + Math.floor(ms / 300)) * 5)
    if (Math.floor(ms / 250 + spark) % 3 === 0) {
      setPixel({ bitmap, x, y, color: spark % 2 === 0 ? PINK : yellow })
    }
  }
}
