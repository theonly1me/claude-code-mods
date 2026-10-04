import { fillRect, setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import {
  COTTAGE,
  DAWN_HIGH,
  DAWN_LOW,
  GROUND_EDGE,
  MOON,
  MOON_LIGHT,
  MORTAR,
  SILHOUETTE,
  SKY_HORIZON,
  SKY_TOP,
  STAR_BRIGHT,
  STAR_DIM,
  STONE,
  TOWNHOUSE,
  WINDOW,
  WINDOW_DIM,
} from '../art/scenery'
import { CASTLE_WIDTH, FLOOR_TOP, STAGE_HEIGHT, VILLAGE_LEFT } from '../sim/constants'
import { moonPosition } from '../sim/sky'

const STAR_COUNT = 18
const HUD_RIGHT = 22
const LAMP = 0xffd479
const POLE = 0x2b2340
const GATE = 0x0a0614

export function skyColor(options: { y: number; dawn: number }): Color {
  const { y, dawn } = options
  const base = mixColors({ from: SKY_TOP, to: SKY_HORIZON, amount: y / (FLOOR_TOP - 1) })
  const reach = Math.min(1, Math.max(0, (y - 3) / (FLOOR_TOP - 4)))
  return mixColors({ from: base, to: y >= FLOOR_TOP - 3 ? DAWN_LOW : DAWN_HIGH, amount: dawn * reach * 0.9 })
}

function drawSky(options: { bitmap: Bitmap; dawn: number }): void {
  for (let y = 0; y < FLOOR_TOP; y += 1) {
    fillRect({ bitmap: options.bitmap, x: 0, y, width: options.bitmap.width, height: 1, color: skyColor({ y, dawn: options.dawn }) })
  }
}

function drawStars(options: { bitmap: Bitmap; clockMs: number; dawn: number }): void {
  const { bitmap, clockMs, dawn } = options
  if (dawn > 0.75) {
    return
  }
  for (let index = 0; index < STAR_COUNT; index += 1) {
    const x = (index * 37 + 11) % bitmap.width
    const y = (index * 5 + ((index * index) % 7)) % 9
    const isHidden = (x < HUD_RIGHT && y < 12) || x > bitmap.width - CASTLE_WIDTH - 1
    const twinkle = Math.sin(clockMs / 650 + index * 1.7)
    if (isHidden || twinkle < -0.8) {
      continue
    }
    const dim = mixColors({ from: STAR_DIM, to: skyColor({ y, dawn }), amount: dawn })
    setPixel({ bitmap, x, y, color: twinkle > 0.55 && dawn < 0.4 ? STAR_BRIGHT : dim })
  }
}

function drawMoon(options: { bitmap: Bitmap; percent: number | null; dawn: number }): void {
  const { bitmap, dawn } = options
  const { x, y } = moonPosition({ percent: options.percent, width: bitmap.width })
  for (let row = -2; row < 8; row += 1) {
    for (let column = -2; column < 8; column += 1) {
      const distance = Math.hypot(column - 2.5, row - 2.5)
      if (distance > 3.1 && distance <= 4.4) {
        const sky = skyColor({ y: y + row, dawn })
        setPixel({ bitmap, x: x + column, y: y + row, color: mixColors({ from: sky, to: MOON_LIGHT, amount: 0.2 }) })
      }
    }
  }
  stamp({ target: bitmap, source: MOON, x, y })
}

function drawCastle(options: { bitmap: Bitmap; clockMs: number }): void {
  const { bitmap } = options
  const right = bitmap.width
  const towerLeft = right - CASTLE_WIDTH + 1
  fillRect({ bitmap, x: towerLeft, y: 6, width: 4, height: FLOOR_TOP - 6, color: SILHOUETTE })
  fillRect({ bitmap, x: towerLeft + 4, y: 9, width: 8, height: FLOOR_TOP - 9, color: SILHOUETTE })
  fillRect({ bitmap, x: right - 6, y: 4, width: 5, height: FLOOR_TOP - 4, color: SILHOUETTE })
  ;[0, 2].forEach(offset => setPixel({ bitmap, x: towerLeft + offset + 1, y: 5, color: SILHOUETTE }))
  ;[0, 2, 4, 6].forEach(offset => setPixel({ bitmap, x: towerLeft + 4 + offset, y: 8, color: SILHOUETTE }))
  setPixel({ bitmap, x: right - 4, y: 0, color: SILHOUETTE })
  fillRect({ bitmap, x: right - 5, y: 1, width: 3, height: 1, color: SILHOUETTE })
  fillRect({ bitmap, x: right - 6, y: 2, width: 5, height: 2, color: SILHOUETTE })
  fillRect({ bitmap, x: towerLeft + 6, y: 10, width: 3, height: 3, color: GATE })
  setPixel({ bitmap, x: towerLeft + 7, y: 9, color: GATE })
  const flicker = Math.sin(options.clockMs / 300) > -0.7 ? WINDOW : WINDOW_DIM
  setPixel({ bitmap, x: right - 4, y: 6, color: flicker })
  setPixel({ bitmap, x: right - 4, y: 7, color: flicker })
  setPixel({ bitmap, x: towerLeft + 1, y: 8, color: WINDOW_DIM })
}

function drawVillage(options: { bitmap: Bitmap; clockMs: number }): void {
  const { bitmap } = options
  const limit = bitmap.width - CASTLE_WIDTH - 4
  const houses = [
    { sprite: COTTAGE, x: VILLAGE_LEFT + 1 },
    { sprite: TOWNHOUSE, x: VILLAGE_LEFT + 10 },
    { sprite: COTTAGE, x: VILLAGE_LEFT + 21 },
  ]
  houses
    .filter(house => house.x + house.sprite.width <= limit)
    .forEach((house, index) => {
      const top = FLOOR_TOP - house.sprite.height
      stamp({ target: bitmap, source: house.sprite, x: house.x, y: top })
      const isDimmed = Math.floor(options.clockMs / 4000 + index) % 3 === 0
      if (isDimmed) {
        setPixel({ bitmap, x: house.x + 2, y: top + house.sprite.height - 3, color: WINDOW_DIM })
      }
    })
  const lampX = limit + 1
  fillRect({ bitmap, x: lampX, y: 6, width: 1, height: FLOOR_TOP - 6, color: POLE })
  setPixel({ bitmap, x: lampX, y: 5, color: LAMP })
  ;[-1, 1].forEach(side => {
    const glow = mixColors({ from: skyColor({ y: 5, dawn: 0 }), to: LAMP, amount: 0.3 })
    setPixel({ bitmap, x: lampX + side, y: 5, color: glow })
  })
}

function drawGround(bitmap: Bitmap): void {
  fillRect({ bitmap, x: 0, y: FLOOR_TOP, width: bitmap.width, height: 1, color: GROUND_EDGE })
  for (let y = FLOOR_TOP + 1; y < STAGE_HEIGHT; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      setPixel({ bitmap, x, y, color: (x + (y % 2) * 2) % 4 === 0 ? MORTAR : STONE })
    }
  }
}

export function drawBackdrop(options: { bitmap: Bitmap; percent: number | null; dawn: number; clockMs: number }): void {
  const { bitmap, dawn, clockMs } = options
  drawSky({ bitmap, dawn })
  drawStars({ bitmap, clockMs, dawn })
  drawMoon({ bitmap, percent: options.percent, dawn })
  drawCastle({ bitmap, clockMs })
  drawVillage({ bitmap, clockMs })
  drawGround(bitmap)
}
