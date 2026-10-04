import { setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { lerp, toRadians } from '../shared/pixel/colors'

const GRIP: Color = 0x5a3a22
const GUARD: Color = 0xf2c14e
const BLADE: Color = 0xf4f8fc
const BLADE_SHADE: Color = 0x9fb3cc
const ARC_TRAIL: Color = 0x3b7dd8
const ARC_MIDDLE: Color = 0x6fe3f5
const ARC_HEAD: Color = 0xffffff

export const BLADE_LENGTH = 8
export const KATANA_REACH = 3 + BLADE_LENGTH

type Point = { x: number; y: number }

function pointAlong(options: {
  handX: number
  handY: number
  angleDegrees: number
  distance: number
  sideways: number
}): Point {
  const radians = toRadians(options.angleDegrees)
  const directionX = Math.cos(radians)
  const directionY = Math.sin(radians)
  return {
    x: options.handX + directionX * options.distance - directionY * options.sideways,
    y: options.handY + directionY * options.distance + directionX * options.sideways,
  }
}

export function drawKatana(options: {
  bitmap: Bitmap
  handX: number
  handY: number
  angleDegrees: number
}): void {
  const { bitmap, handX, handY, angleDegrees } = options
  const paint = (distance: number, sideways: number, color: Color): void => {
    const point = pointAlong({ handX, handY, angleDegrees, distance, sideways })
    setPixel({ bitmap, x: point.x, y: point.y, color })
  }
  for (let step = 0; step <= (BLADE_LENGTH + 1) / 0.6; step += 1) {
    const distance = 3 + step * 0.6
    if (distance > KATANA_REACH) {
      break
    }
    paint(distance, 0.8, BLADE_SHADE)
    paint(distance, 0, BLADE)
  }
  paint(0, 0, GRIP)
  paint(1, 0, GRIP)
  paint(2, 0, GUARD)
  paint(2, -1, GUARD)
  paint(2, 1, GUARD)
}

function arcColor(fraction: number): Color {
  if (fraction < 0.4) {
    return ARC_TRAIL
  }
  return fraction < 0.75 ? ARC_MIDDLE : ARC_HEAD
}

export function drawSweepArc(options: {
  bitmap: Bitmap
  handX: number
  handY: number
  fromDegrees: number
  toDegrees: number
}): void {
  const { bitmap, handX, handY } = options
  const steps = Math.max(2, Math.ceil(Math.abs(options.toDegrees - options.fromDegrees) / 4))
  for (let step = 0; step <= steps; step += 1) {
    const fraction = step / steps
    const angleDegrees = lerp({ from: options.fromDegrees, to: options.toDegrees, amount: fraction })
    const color = arcColor(fraction)
    const radii = [KATANA_REACH + 1]
    if (fraction > 0.3) {
      radii.push(KATANA_REACH)
    }
    if (fraction > 0.65) {
      radii.push(KATANA_REACH - 1)
    }
    radii.forEach(distance => {
      const point = pointAlong({ handX, handY, angleDegrees, distance, sideways: 0 })
      setPixel({ bitmap, x: point.x, y: point.y, color })
    })
  }
}
