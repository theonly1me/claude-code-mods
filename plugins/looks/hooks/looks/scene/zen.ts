import { setPixel } from '../../shared/pixel/bitmap'
import { hexColor, noise } from './paint'
import type { SceneInput } from './paint'

const DARK_INK = hexColor('#d8cfc0')
const LIGHT_INK = hexColor('#3d3a35')
const DARK_SAND = hexColor('#4a463f')
const LIGHT_SAND = hexColor('#c9c0ac')
const SEAL = hexColor('#c0392b')
const MOSS = hexColor('#a3b18a')

export function drawZen(input: SceneInput): void {
  const { bitmap, ms, isLight } = input
  const ink = isLight ? LIGHT_INK : DARK_INK
  const sand = isLight ? LIGHT_SAND : DARK_SAND
  const centerX = Math.floor(bitmap.width / 2)
  const centerY = 5
  const gap = (input.isWorking ? ms / 2600 : ms / 14000) * Math.PI * 2
  for (let step = 0; step < 90; step += 1) {
    const angle = (step / 90) * Math.PI * 2
    const delta = Math.abs(((angle - gap + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
    if (delta < 0.35) {
      continue
    }
    const thickness = delta < 0.9 ? 1 : 2
    for (let part = 0; part < thickness; part += 1) {
      const radius = 4.2 - part * 0.8
      setPixel({ bitmap, x: centerX + Math.cos(angle) * radius * 1.7, y: centerY + Math.sin(angle) * radius, color: ink })
    }
  }
  for (let row = 9; row < bitmap.height; row += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      const wave = Math.sin(x / 3 + row * 1.6 + (input.isWorking ? ms / 700 : 0))
      if (wave > 0.55) {
        setPixel({ bitmap, x, y: row, color: sand })
      }
    }
  }
  const stoneX = centerX + 17
  for (const [dx, dy, width] of [[0, 8, 6], [1, 7, 4], [2, 6, 2], [3, 5, 1]] as const) {
    for (let x = 0; x < width; x += 1) {
      setPixel({ bitmap, x: stoneX + dx + x, y: dy, color: ink })
    }
  }
  for (const [dx, dy] of [[0, 4], [1, 4], [0, 5], [1, 5]] as const) {
    setPixel({ bitmap, x: centerX - 13 + dx, y: dy, color: SEAL })
  }
  const petalX = (centerX - 30 + ((ms / (input.isWorking ? 120 : 600)) % 24) + noise(Math.floor(ms / 7000)) * 6)
  setPixel({ bitmap, x: petalX, y: 1 + Math.floor((ms / 500) % 6), color: MOSS })
}
