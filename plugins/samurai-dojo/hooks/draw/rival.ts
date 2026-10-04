import { drawKatana, drawSweepArc } from '../art/katana'
import { SAMURAI_WIDTH, samuraiBodyFor } from '../art/samuraiBody'
import { stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Color, Tint } from '../shared/pixel/bitmap'
import { SAMURAI_TOP } from '../sim/constants'
import { duelPoses } from '../sim/duelPose'
import type { Duel } from '../sim/types'
import { drawHeadbandTails, HEADBAND_ROW } from './samurai'

const RIVAL_BRIGHT: Color = 0x2fc4a8
const RIVAL_DARK: Color = 0x17786a

const RIVAL_COLORS: ReadonlyMap<Color, Color> = new Map([
  [0xd8372e, RIVAL_BRIGHT],
  [0xf2c14e, 0xc7ccd6],
  [0x3f4a5e, 0x24242c],
  [0x8c9bb5, 0x5e6272],
  [0xd97757, 0x8f98ab],
  [0xb65a3e, 0x646c80],
])

const rivalTint: Tint = color => RIVAL_COLORS.get(color) ?? color

export function drawRival(options: { bitmap: Bitmap; duel: Duel; clockMs: number }): void {
  const { bitmap, duel } = options
  const pose = duelPoses(duel).rival
  const body = samuraiBodyFor({ isLowered: pose.isLowered, isSquinting: pose.isSquinting })
  const x = Math.round(duel.rivalX - pose.offsetX)
  const y = SAMURAI_TOP + pose.offsetY
  drawHeadbandTails({
    bitmap,
    x: x + SAMURAI_WIDTH,
    y: y + HEADBAND_ROW + (pose.isLowered ? 1 : 0),
    clockMs: options.clockMs + 400,
    bright: RIVAL_BRIGHT,
    dark: RIVAL_DARK,
    direction: 1,
  })
  stamp({ target: bitmap, source: body.bitmap, x, y, isFlipped: true, tint: rivalTint })
  const handX = x + SAMURAI_WIDTH - 1 - body.handX
  const handY = y + body.handY
  drawKatana({ bitmap, handX, handY, angleDegrees: 180 - pose.swordAngle })
  if (pose.arc) {
    drawSweepArc({ bitmap, handX, handY, fromDegrees: 180 - pose.arc.from, toDegrees: 180 - pose.arc.to })
  }
}
