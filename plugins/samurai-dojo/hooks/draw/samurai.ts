import { drawKatana, drawSweepArc } from '../art/katana'
import { samuraiBodyFor } from '../art/samuraiBody'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { SAMURAI_TOP } from '../sim/constants'
import { samuraiPoseOf } from '../sim/pose'
import { BASE_SASH } from '../sim/rank'
import type { Rank } from '../sim/rank'
import type { Samurai } from '../sim/types'

const TAIL_LENGTH = 4
const HEADBAND_ROW = 5

function drawHeadbandTails(options: {
  bitmap: Bitmap
  x: number
  y: number
  clockMs: number
  rank: Rank
}): void {
  for (let step = 0; step < TAIL_LENGTH; step += 1) {
    const sway = Math.round(Math.sin(options.clockMs / 140 + step * 0.9) * 0.9 + step * 0.35)
    setPixel({
      bitmap: options.bitmap,
      x: options.x - step,
      y: options.y + sway,
      color: step < 2 ? options.rank.bright : options.rank.dark,
    })
  }
}

export function drawSamurai(options: { bitmap: Bitmap; samurai: Samurai; rank: Rank }): void {
  const { bitmap, samurai, rank } = options
  const pose = samuraiPoseOf(samurai)
  const body = samuraiBodyFor({ isLowered: pose.isLowered, isSquinting: pose.isSquinting })
  const x = Math.round(samurai.x + pose.offsetX)
  const y = SAMURAI_TOP + pose.offsetY
  drawHeadbandTails({
    bitmap,
    x,
    y: y + HEADBAND_ROW + (pose.isLowered ? 1 : 0),
    clockMs: samurai.clockMs,
    rank,
  })
  stamp({
    target: bitmap,
    source: body.bitmap,
    x,
    y,
    tint: color => (color === BASE_SASH ? rank.bright : color),
  })
  const handX = x + body.handX
  const handY = y + body.handY
  drawKatana({ bitmap, handX, handY, angleDegrees: pose.swordAngle })
  if (pose.arc) {
    drawSweepArc({
      bitmap,
      handX,
      handY,
      fromDegrees: pose.arc.from,
      toDegrees: pose.arc.to,
    })
  }
}
