import { getPixel, setPixel } from '../../shared/pixel/bitmap'
import { drawText } from '../../shared/pixel/font'
import { blend, band, hexColor } from './paint'
import type { SceneInput } from './paint'

const DARK_BACKGROUND = hexColor('#031208')
const LIGHT_BACKGROUND = hexColor('#e3f4e8')
const SCANLINE = hexColor('#020d06')
const LIGHT_SCANLINE = hexColor('#d3e9d9')
const PHOSPHOR = hexColor('#39ff7a')
const LIGHT_PHOSPHOR = hexColor('#0f8a3c')
const AMBER = hexColor('#ffb000')

export function drawRetro(input: SceneInput): void {
  const { bitmap, ms, isLight } = input
  const background = isLight ? LIGHT_BACKGROUND : DARK_BACKGROUND
  const ink = isLight ? LIGHT_PHOSPHOR : PHOSPHOR
  band({ bitmap, y: 0, height: bitmap.height, color: background })
  for (let y = 1; y < bitmap.height; y += 2) {
    band({ bitmap, y, height: 1, color: isLight ? LIGHT_SCANLINE : SCANLINE })
  }
  const left = 2
  drawText({ bitmap, text: 'READY', x: left, y: 1, color: ink })
  drawText({ bitmap, text: input.isWorking ? 'WORKING' : 'IDLE', x: left, y: 7, color: AMBER })
  if (Math.floor(ms / 500) % 2 === 0) {
    for (let y = 1; y < 6; y += 1) {
      for (let x = left + 22; x < left + 25; x += 1) {
        setPixel({ bitmap, x, y, color: ink })
      }
    }
  }
  const barsLeft = Math.max(left + 40, bitmap.width - 34)
  for (let bar = 0; bar < 8; bar += 1) {
    const level = input.isWorking ? 2 + Math.round((Math.sin(ms / 160 + bar * 1.3) + 1) * 3) : 1 + (bar % 2)
    for (let height = 0; height < Math.min(8, level); height += 1) {
      const x = barsLeft + bar * 4
      const y = bitmap.height - 1 - height
      const color = height > 5 ? AMBER : ink
      setPixel({ bitmap, x, y, color })
      setPixel({ bitmap, x: x + 1, y, color })
      setPixel({ bitmap, x: x + 2, y, color })
    }
  }
  const sweep = Math.floor((ms / 70) % (bitmap.height + 8)) - 4
  for (let y = sweep; y < sweep + 2; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      const current = getPixel({ bitmap, x, y })
      if (y >= 0 && y < bitmap.height && (current === background || current === (isLight ? LIGHT_SCANLINE : SCANLINE))) {
        setPixel({ bitmap, x, y, color: blend({ from: background, to: ink, amount: 0.22 }) })
      }
    }
  }
}
