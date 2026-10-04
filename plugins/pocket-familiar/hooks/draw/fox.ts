import { CREAM, EGG, EGG_CRACKS, FUR, INK, TAIL_OUTLINE, foxSprite, kitSprite } from '../art/fox'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { toRadians } from '../shared/pixel/colors'
import { BLINK_EVERY_MS, BLINK_MS, FOX_X, HOP_MS } from '../sim/constants'
import { growthOf, hatchProgress } from '../sim/growth'
import type { FoxPose } from '../sim/pose'
import type { EyeState, FamiliarState } from '../sim/types'
import { hillTop } from './backdrop'

export type Placement = { x: number; top: number; width: number; height: number }

type TailStroke = { baseX: number; baseY: number; angle: number; length: number; radius: number }

function disc(options: { bitmap: Bitmap; x: number; y: number; radius: number; color: Color }): void {
  const reach = Math.ceil(options.radius)
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      if (dx * dx + dy * dy <= options.radius * options.radius) {
        setPixel({ bitmap: options.bitmap, x: options.x + dx, y: options.y + dy, color: options.color })
      }
    }
  }
}

function tailPath(stroke: TailStroke): { x: number; y: number; isTip: boolean }[] {
  const points: { x: number; y: number; isTip: boolean }[] = []
  let x = stroke.baseX
  let y = stroke.baseY
  let angle = stroke.angle
  for (let step = 0; step <= stroke.length; step += 1) {
    points.push({ x, y, isTip: step >= stroke.length - 2 })
    const radians = toRadians(angle)
    x += Math.cos(radians)
    y += Math.sin(radians)
    angle += (-90 - angle) * 0.09
  }
  return points
}

function drawTail(options: { bitmap: Bitmap; stroke: TailStroke }): void {
  const { bitmap, stroke } = options
  const points = tailPath(stroke)
  points.forEach(point => disc({ bitmap, x: point.x, y: point.y, radius: stroke.radius + 0.7, color: TAIL_OUTLINE }))
  points.forEach(point =>
    disc({ bitmap, x: point.x, y: point.y, radius: stroke.radius, color: point.isTip ? CREAM : FUR }),
  )
}

function tailAngles(count: number): number[] {
  if (count <= 1) {
    return [-172]
  }
  const leftCount = Math.ceil(count / 2)
  const rightCount = count - leftCount
  const spread = (options: { from: number; to: number; total: number }): number[] =>
    Array.from({ length: options.total }, (_, index) =>
      options.total === 1 ? (options.from + options.to) / 2 : options.from + (index * (options.to - options.from)) / (options.total - 1),
    )
  const angles = [...spread({ from: -196, to: -128, total: leftCount }), ...spread({ from: -52, to: 16, total: rightCount })]
  return angles.sort((first, second) => Math.abs(second + 90) - Math.abs(first + 90))
}

function eyesOf(options: { state: FamiliarState; pose: FoxPose }): EyeState {
  const { state, pose } = options
  if (state.isSleeping) {
    return 'shut'
  }
  if (state.hopMs > 0) {
    return 'happy'
  }
  return pose.eyes ?? (state.clockMs % BLINK_EVERY_MS < BLINK_MS ? 'shut' : 'open')
}

function hopOffset(state: FamiliarState): number {
  if (state.hopMs <= 0) {
    return 0
  }
  return -Math.round(Math.sin((1 - state.hopMs / HOP_MS) * Math.PI) * 1.4)
}

function drawEgg(options: { bitmap: Bitmap; state: FamiliarState }): Placement {
  const { bitmap, state } = options
  const isWobbling = state.clockMs % 3000 < 600
  const wobble = isWobbling ? (Math.floor(state.clockMs / 110) % 2 === 0 ? 1 : -1) : 0
  const x = FOX_X + 2 + wobble
  const top = hillTop(FOX_X + 5) - EGG.height
  stamp({ target: bitmap, source: EGG, x, y: top })
  const progress = hatchProgress(state.lifetimeXp)
  EGG_CRACKS.slice(0, progress >= 0.8 ? 2 : progress >= 0.5 ? 1 : 0)
    .flat()
    .forEach(point => setPixel({ bitmap, x: x + point.x, y: top + point.y, color: INK }))
  return { x, top, width: EGG.width, height: EGG.height }
}

export function drawFamiliar(options: { bitmap: Bitmap; state: FamiliarState; pose: FoxPose }): Placement {
  const { bitmap, state, pose } = options
  const growth = growthOf(state.lifetimeXp)
  if (growth.form === 'egg') {
    return drawEgg(options)
  }
  const eyes = eyesOf({ state, pose })
  const sprite = growth.form === 'kit' ? kitSprite(eyes) : foxSprite(eyes)
  const x = pose.x + (growth.form === 'kit' ? 1 : 0)
  const top = hillTop(pose.x + 5) - sprite.height + hopOffset(state) + pose.lift
  const isKit = growth.form === 'kit'
  const isResting = state.isSleeping || pose.isNapping
  tailAngles(growth.tails).forEach((angle, index) => {
    const sway = Math.sin(state.clockMs / (isKit ? 420 : 760) + index * 0.9) * (isResting ? 2 : 5) + pose.tailSpin
    drawTail({
      bitmap,
      stroke: {
        baseX: x + (isKit ? 4 : 5),
        baseY: top + (isKit ? 6 : 10),
        angle: angle + sway,
        length: isKit ? 5 : 11,
        radius: isKit ? 1.1 : 1.25,
      },
    })
  })
  stamp({ target: bitmap, source: sprite, x, y: top })
  return { x, top, width: sprite.width, height: sprite.height }
}
