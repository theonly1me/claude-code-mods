import { setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { birdAt, butterflyAt, leafAt, progressOf, shootingStarAt, yarnAt } from '../sim/ambientPaths'
import type { Point } from '../sim/ambientPaths'
import type { FoxPose } from '../sim/pose'
import type { FamiliarState } from '../sim/types'
import { hillTop } from './backdrop'
import type { Daylight } from './backdrop'
import type { Placement } from './fox'

const WINGS: readonly Color[] = [0xffd43b, 0xff8fb1, 0x7dd3fc, 0xc9a7ff]
const BODY: Color = 0x2b1d14
const LEAF: readonly [Color, Color] = [0x8fd14f, 0xf2e86b]
const YARN: Color = 0xe5484d
const YARN_LIGHT: Color = 0xff9aa2
const DIRT: readonly [Color, Color] = [0x8b5a2b, 0x6b4423]
const HOLE: Color = 0x3a2412
const PEBBLE: readonly [Color, Color] = [0x9fe8ff, 0xffffff]
const STAR_TRAIL: readonly Color[] = [0xffffff, 0xd6e0ff, 0x9aa6e0, 0x5d6aa8]
const BIRD: Color = 0x2b2d42
const TONGUE: Color = 0xff6b9a
const MOUTH: Color = 0x2b1d14
const SPARKLE: Color = 0xffffff

function paint(options: { bitmap: Bitmap; points: readonly Point[]; color: Color }): void {
  options.points.forEach(point => setPixel({ bitmap: options.bitmap, x: point.x, y: point.y, color: options.color }))
}

export function drawButterfly(options: { bitmap: Bitmap; at: Point; ms: number; color: Color }): void {
  const { bitmap, at, ms } = options
  const x = Math.round(at.x)
  const y = Math.round(at.y)
  const isOpen = Math.floor(ms / 120) % 2 === 0
  const wings = isOpen
    ? [{ x: x - 1, y: y - 1 }, { x: x + 1, y: y - 1 }, { x: x - 1, y }, { x: x + 1, y }]
    : [{ x: x - 1, y: y - 1 }, { x: x + 1, y: y - 1 }]
  paint({ bitmap, points: wings, color: options.color })
  paint({ bitmap, points: [{ x, y }, { x, y: y - 1 }], color: BODY })
}

function drawYarn(options: { bitmap: Bitmap; state: FamiliarState }): void {
  const { bitmap, state } = options
  const yarn = yarnAt(state.ambient)
  const x = Math.round(yarn.x)
  const y = hillTop(x + 1) - 3
  paint({ bitmap, points: [{ x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }, { x: x + 2, y: y + 1 }, { x: x + 1, y: y + 2 }], color: YARN })
  const spots = [{ x: x + 1, y }, { x: x + 2, y: y + 1 }, { x: x + 1, y: y + 2 }, { x, y: y + 1 }]
  const spot = spots[yarn.roll % spots.length]
  if (spot) {
    setPixel({ bitmap, x: spot.x, y: spot.y, color: YARN_LIGHT })
  }
  paint({ bitmap, points: [{ x: x - 1, y: y + 2 }, { x: x - 2, y: y + 2 }, { x: x - 3, y: y + 1 }], color: YARN })
}

function drawDig(options: { bitmap: Bitmap; state: FamiliarState; placement: Placement }): void {
  const { bitmap, state, placement } = options
  const progress = progressOf(state.ambient)
  const holeX = placement.x + placement.width
  const holeY = hillTop(holeX)
  if (progress >= 0.35) {
    paint({ bitmap, points: [{ x: holeX, y: holeY }, { x: holeX + 1, y: holeY }, { x: holeX + 2, y: holeY }], color: HOLE })
  }
  if (progress >= 0.3 && progress < 0.75) {
    for (let index = 0; index < 4; index += 1) {
      const phase = ((state.ambient.ms + index * 130) % 520) / 520
      setPixel({
        bitmap,
        x: placement.x - 1 - phase * 6,
        y: hillTop(placement.x) - 1 - Math.sin(phase * Math.PI) * 4,
        color: DIRT[index % 2] ?? DIRT[0],
      })
    }
  }
  if (progress >= 0.75) {
    const isGlinting = Math.floor(state.ambient.ms / 200) % 2 === 0
    paint({ bitmap, points: [{ x: holeX + 1, y: holeY - 1 }, { x: holeX + 2, y: holeY - 1 }], color: PEBBLE[0] })
    setPixel({ bitmap, x: isGlinting ? holeX + 1 : holeX + 2, y: holeY - 1, color: PEBBLE[1] })
    if (isGlinting) {
      paint({ bitmap, points: [{ x: holeX + 1, y: holeY - 3 }, { x: holeX + 3, y: holeY - 1 }], color: SPARKLE })
    }
  }
}

function drawSky(options: { bitmap: Bitmap; state: FamiliarState; daylight: Daylight }): void {
  const { bitmap, state } = options
  if (options.daylight.light < 0.4) {
    const star = shootingStarAt({ ambient: state.ambient, width: state.width })
    STAR_TRAIL.forEach((color, step) => {
      if (star) {
        setPixel({ bitmap, x: star.x + step * 1.7, y: star.y - step, color })
      }
    })
    return
  }
  const bird = birdAt({ ambient: state.ambient, width: state.width })
  const isUp = Math.floor(state.ambient.ms / 180) % 2 === 0
  const wingY = Math.round(bird.y) + (isUp ? -1 : 0)
  paint({ bitmap, points: [{ x: bird.x - 1, y: wingY }, { x: bird.x, y: bird.y }, { x: bird.x + 1, y: wingY }], color: BIRD })
}

function drawDizzy(options: { bitmap: Bitmap; state: FamiliarState; placement: Placement }): void {
  const { bitmap, state, placement } = options
  for (let index = 0; index < 3; index += 1) {
    const angle = state.ambient.ms / 120 + index * 2.1
    setPixel({
      bitmap,
      x: placement.x + placement.width / 2 + Math.cos(angle) * 4,
      y: placement.top - 1 + Math.sin(angle),
      color: WINGS[index] ?? SPARKLE,
    })
  }
}

export function drawMouth(options: { bitmap: Bitmap; placement: Placement; pose: FoxPose; isKit: boolean }): void {
  const { bitmap, placement, pose } = options
  const centerX = placement.x + (options.isKit ? 4 : 5)
  const y = placement.top + (options.isKit ? 6 : 7)
  if (pose.mouth === 'tongue') {
    setPixel({ bitmap, x: centerX, y, color: TONGUE })
  } else if (pose.mouth === 'yawn') {
    paint({ bitmap, points: [{ x: centerX - 1, y }, { x: centerX + 1, y }], color: MOUTH })
    setPixel({ bitmap, x: centerX, y, color: TONGUE })
  }
}

export function drawAmbient(options: { bitmap: Bitmap; state: FamiliarState; placement: Placement; daylight: Daylight }): void {
  const { bitmap, state, placement } = options
  const ambient = state.ambient
  const wing = WINGS[ambient.count % WINGS.length] ?? SPARKLE
  if (ambient.kind === 'butterfly') {
    drawButterfly({ bitmap, at: butterflyAt({ ambient, width: state.width }), ms: ambient.ms, color: wing })
  } else if (ambient.kind === 'leaf') {
    const leaf = leafAt(ambient)
    if (!leaf.isCaught) {
      const isFlat = Math.floor(ambient.ms / 220) % 2 === 0
      paint({ bitmap, points: [leaf, isFlat ? { x: leaf.x + 1, y: leaf.y } : { x: leaf.x, y: leaf.y + 1 }], color: LEAF[0] })
      setPixel({ bitmap, x: leaf.x, y: leaf.y, color: LEAF[1] })
    }
  } else if (ambient.kind === 'yarn') {
    drawYarn({ bitmap, state })
  } else if (ambient.kind === 'dig') {
    drawDig({ bitmap, state, placement })
  } else if (ambient.kind === 'stars') {
    drawSky({ bitmap, state, daylight: options.daylight })
  } else if (ambient.kind === 'tail' && progressOf(ambient) > 0.85) {
    drawDizzy({ bitmap, state, placement })
  } else if (ambient.kind === 'groom' && ambient.ms % 640 < 160) {
    setPixel({ bitmap, x: placement.x + 2 + (Math.floor(ambient.ms / 640) % 3) * 3, y: placement.top + 8, color: SPARKLE })
  }
}
