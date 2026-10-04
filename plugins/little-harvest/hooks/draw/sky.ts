import { fillRect, setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import { BARN_WIDTH, HORIZON_Y } from '../sim/constants'
import type { Cloud } from '../sim/types'
import type { Light } from './light'
import { skyRow } from './light'

const SUN: Color = 0xffdf6e
const SUN_CORE: Color = 0xfff4c2
const MOON: Color = 0xf0ead2
const MOON_SHADE: Color = 0xc9c2a6
const STARS = [
  { x: 9, y: 1 },
  { x: 17, y: 4 },
  { x: 26, y: 2 },
  { x: 41, y: 1 },
  { x: 47, y: 5 },
  { x: 53, y: 3 },
  { x: 33, y: 6 },
  { x: 3, y: 6 },
]

export function celestialPosition(options: { hour: number; width: number }): { x: number; y: number; isSun: boolean } {
  const isSun = options.hour >= 6 && options.hour < 19
  const progress = isSun ? (options.hour - 6) / 13 : ((options.hour - 19 + 24) % 24) / 11
  const left = 14
  const right = Math.max(left + 4, options.width - BARN_WIDTH - 8)
  return {
    x: Math.round(left + progress * (right - left)),
    y: Math.round(5 - 4 * Math.sin(Math.PI * progress)),
    isSun,
  }
}

function drawDisc(options: { bitmap: Bitmap; x: number; y: number; color: Color }): void {
  const { bitmap, x, y, color } = options
  fillRect({ bitmap, x: x + 1, y, width: 2, height: 4, color })
  fillRect({ bitmap, x, y: y + 1, width: 4, height: 2, color })
}

function drawCelestial(options: { bitmap: Bitmap; hour: number; light: Light }): void {
  const { bitmap } = options
  const spot = celestialPosition({ hour: options.hour, width: bitmap.width })
  if (spot.isSun) {
    const glow = mixColors({ from: skyRow({ light: options.light, y: spot.y, height: HORIZON_Y }), to: SUN, amount: 0.35 })
    drawDisc({ bitmap, x: spot.x - 1, y: spot.y - 1, color: glow })
    drawDisc({ bitmap, x: spot.x + 1, y: spot.y + 1, color: glow })
    drawDisc({ bitmap, x: spot.x, y: spot.y, color: SUN })
    setPixel({ bitmap, x: spot.x + 1, y: spot.y + 1, color: SUN_CORE })
    return
  }
  drawDisc({ bitmap, x: spot.x, y: spot.y, color: MOON })
  setPixel({ bitmap, x: spot.x + 3, y: spot.y + 1, color: MOON_SHADE })
  setPixel({ bitmap, x: spot.x + 2, y: spot.y + 2, color: MOON_SHADE })
}

function drawStars(options: { bitmap: Bitmap; light: Light; clockMs: number }): void {
  if (options.light.darkness < 0.4) {
    return
  }
  STARS.filter(star => star.x < options.bitmap.width - BARN_WIDTH).forEach((star, index) => {
    const isBright = Math.floor(options.clockMs / 700 + index * 1.7) % 4 !== 0
    const color = mixColors({ from: 0x6a74a8, to: 0xf4f1ff, amount: isBright ? options.light.darkness : 0.2 })
    setPixel({ bitmap: options.bitmap, x: star.x, y: star.y, color })
  })
}

function drawHills(options: { bitmap: Bitmap; light: Light }): void {
  const { bitmap, light } = options
  const near = light.tint(0x3f7a3a)
  const far = mixColors({ from: light.bottom, to: near, amount: 0.45 })
  for (let x = 0; x < bitmap.width; x += 1) {
    const farTop = Math.round(7.4 + Math.sin(x / 9) * 1.3 + Math.sin(x / 3.7) * 0.5)
    const nearTop = Math.round(9.2 + Math.sin(x / 6 + 2) * 0.9)
    fillRect({ bitmap, x, y: farTop, width: 1, height: HORIZON_Y - farTop, color: far })
    fillRect({ bitmap, x, y: nearTop, width: 1, height: HORIZON_Y - nearTop, color: mixColors({ from: far, to: near, amount: 0.6 }) })
  }
}

export function drawClouds(options: { bitmap: Bitmap; clouds: readonly Cloud[]; light: Light; isStormy: boolean }): void {
  const base = options.isStormy ? 0x8a93a6 : 0xffffff
  const color = mixColors({ from: base, to: 0x4e5880, amount: options.light.darkness * 0.75 })
  const shade = mixColors({ from: color, to: options.light.middle, amount: 0.35 })
  options.clouds.forEach(cloud => {
    const x = Math.round(cloud.x)
    fillRect({ bitmap: options.bitmap, x: x + 2, y: cloud.y, width: cloud.width - 4, height: 1, color })
    fillRect({ bitmap: options.bitmap, x, y: cloud.y + 1, width: cloud.width, height: 1, color })
    fillRect({ bitmap: options.bitmap, x: x + 1, y: cloud.y + 2, width: cloud.width - 2, height: 1, color: shade })
  })
}

export function drawSky(options: { bitmap: Bitmap; light: Light; hour: number; clockMs: number }): void {
  const { bitmap, light } = options
  for (let y = 0; y < HORIZON_Y; y += 1) {
    fillRect({ bitmap, x: 0, y, width: bitmap.width, height: 1, color: skyRow({ light, y, height: HORIZON_Y }) })
  }
  drawStars({ bitmap, light, clockMs: options.clockMs })
  drawCelestial({ bitmap, hour: options.hour, light })
  drawHills({ bitmap, light })
}
