import { setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import { GROUND_Y, STAGE_HEIGHT } from '../sim/constants'
import { drawSkyLights } from './sky'

const SKY = {
  nightTop: 0x0b1026,
  nightHorizon: 0x2b2d5c,
  dayTop: 0x5aa9e6,
  dayHorizon: 0xbfe3f7,
  warmTop: 0x3d3b7a,
  warmHorizon: 0xf39c6b,
} as const

const GRASS = {
  dayEdge: 0x9be07a,
  dayFill: 0x5fae4a,
  dayDeep: 0x3f8a38,
  nightEdge: 0x4b7a52,
  nightFill: 0x2e5a3f,
  nightDeep: 0x23452f,
} as const

const FLOWERS: readonly { x: number; color: Color }[] = [
  { x: 3, color: 0xff8fb1 },
  { x: 27, color: 0xffe066 },
  { x: 33, color: 0xffffff },
  { x: 40, color: 0xc9a7ff },
  { x: 47, color: 0xff8fb1 },
  { x: 54, color: 0xffe066 },
  { x: 61, color: 0xffffff },
  { x: 67, color: 0xc9a7ff },
]

export type Daylight = { light: number; warmth: number }

export function daylightOf(hour: number): Daylight {
  const light =
    hour >= 7 && hour < 17 ? 1 : hour >= 5 && hour < 7 ? (hour - 5) / 2 : hour >= 17 && hour < 19.5 ? 1 - (hour - 17) / 2.5 : 0
  const warmth = Math.max(0, 1 - Math.abs(hour - 6.5) / 1.5, 1 - Math.abs(hour - 18.5) / 1.5)
  return { light, warmth }
}

export function hillTop(x: number): number {
  return GROUND_Y - Math.round(2.2 * Math.exp(-(((x - 15) / 16) ** 2)))
}

function skyColor(options: { y: number; daylight: Daylight }): Color {
  const { light, warmth } = options.daylight
  const top = mixColors({ from: mixColors({ from: SKY.nightTop, to: SKY.dayTop, amount: light }), to: SKY.warmTop, amount: warmth * 0.5 })
  const horizon = mixColors({
    from: mixColors({ from: SKY.nightHorizon, to: SKY.dayHorizon, amount: light }),
    to: SKY.warmHorizon,
    amount: warmth * 0.8,
  })
  return mixColors({ from: top, to: horizon, amount: options.y / GROUND_Y })
}

function grassColor(options: { depth: number; light: number }): Color {
  const { depth, light } = options
  if (depth === 0) {
    return mixColors({ from: GRASS.nightEdge, to: GRASS.dayEdge, amount: light })
  }
  return depth >= 3
    ? mixColors({ from: GRASS.nightDeep, to: GRASS.dayDeep, amount: light })
    : mixColors({ from: GRASS.nightFill, to: GRASS.dayFill, amount: light })
}

export function drawBackdrop(options: { bitmap: Bitmap; hour: number; clockMs: number }): Daylight {
  const { bitmap } = options
  const daylight = daylightOf(options.hour)
  for (let y = 0; y < STAGE_HEIGHT; y += 1) {
    const color = skyColor({ y, daylight })
    for (let x = 0; x < bitmap.width; x += 1) {
      setPixel({ bitmap, x, y, color })
    }
  }
  drawSkyLights({ bitmap, daylight, clockMs: options.clockMs })
  for (let x = 0; x < bitmap.width; x += 1) {
    const top = hillTop(x)
    for (let y = top; y < STAGE_HEIGHT; y += 1) {
      setPixel({ bitmap, x, y, color: grassColor({ depth: y - top, light: daylight.light }) })
    }
    if ((x * 7) % 5 === 0) {
      setPixel({ bitmap, x, y: top - 1, color: grassColor({ depth: 0, light: daylight.light }) })
    }
  }
  if (daylight.light > 0.4) {
    FLOWERS.filter(flower => flower.x < bitmap.width).forEach(flower => {
      setPixel({ bitmap, x: flower.x, y: hillTop(flower.x) - 1, color: flower.color })
    })
  }
  return daylight
}
