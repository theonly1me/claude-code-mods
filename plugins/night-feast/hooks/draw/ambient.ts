import { CAT_HEIGHT, CAT_SIT, CAT_WALK, CAT_WIDTH, CLOUD_TINT, NOTE_COLOR, OWL_FRAMES, OWL_HEIGHT, TREE_BARK } from '../art/creatures'
import type { OwlLook } from '../art/creatures'
import { MINI_BAT_FRAMES } from '../art/vampire'
import { getPixel, setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import { CASTLE_WIDTH, FLOOR_TOP, HOUSES, OWL_TREE_X, VILLAGE_LEFT } from '../sim/constants'
import { moonPosition } from '../sim/sky'
import type { Cloud, Scenery } from '../sim/types'
import { frameAt } from './vampire'

const OWL_SEQUENCE: readonly OwlLook[] = ['front', 'left', 'left', 'front', 'right', 'right', 'front', 'blink']
const BRANCH_Y = 11
const EAVE_Y = 9
const CAT_WALK_SHARE = 0.8

const TREE_PIXELS: readonly { x: number; y: number }[] = [
  ...[8, 9, 10, 11, 12].map(y => ({ x: 0, y })),
  { x: -1, y: 12 },
  { x: 1, y: 12 },
  { x: 1, y: BRANCH_Y },
  { x: 2, y: BRANCH_Y },
  { x: 3, y: BRANCH_Y },
  { x: 4, y: BRANCH_Y },
  { x: 5, y: BRANCH_Y },
  { x: 6, y: BRANCH_Y - 1 },
  { x: -1, y: 10 },
  { x: -2, y: 9 },
  { x: -3, y: 9 },
  { x: 0, y: 7 },
  { x: -1, y: 6 },
]

function drawCloud(options: { bitmap: Bitmap; cloud: Cloud }): void {
  const { bitmap, cloud } = options
  const left = Math.round(cloud.x)
  const rows = [
    { y: cloud.y, from: left + 2, to: left + cloud.width - 3 },
    { y: cloud.y + 1, from: left, to: left + cloud.width - 1 },
    { y: cloud.y + 2, from: left + 1, to: left + cloud.width - 2 },
  ]
  rows.forEach(row => {
    for (let x = row.from; x <= row.to; x += 1) {
      const under = getPixel({ bitmap, x, y: row.y })
      if (under !== null) {
        setPixel({ bitmap, x, y: row.y, color: mixColors({ from: under, to: CLOUD_TINT, amount: row.y === cloud.y ? 0.55 : 0.4 }) })
      }
    }
  })
}

export function drawSkyLife(options: { bitmap: Bitmap; scenery: Scenery; percent: number | null }): void {
  const { bitmap, scenery } = options
  scenery.clouds.forEach(cloud => drawCloud({ bitmap, cloud }))
  if (scenery.vignette?.kind !== 'moonbats') {
    return
  }
  const moon = moonPosition({ percent: options.percent, width: bitmap.width })
  const frame = frameAt({ frames: MINI_BAT_FRAMES, step: Math.floor(scenery.clockMs / 140) })
  for (let index = 0; index < 3; index += 1) {
    const angle = scenery.vignette.ageMs / 520 + index * 2.1
    stamp({
      target: bitmap,
      source: frame,
      x: Math.round(moon.x + 1.5 + Math.cos(angle) * 7),
      y: Math.round(moon.y + 2 + Math.sin(angle) * 3),
    })
  }
}

function owlLook(scenery: Scenery): OwlLook {
  if (scenery.vignette?.kind === 'owl') {
    return OWL_SEQUENCE[Math.floor(scenery.vignette.ageMs / 700) % OWL_SEQUENCE.length] ?? 'front'
  }
  return scenery.clockMs % 4200 < 160 ? 'blink' : 'front'
}

export function drawOwlTree(options: { bitmap: Bitmap; scenery: Scenery }): void {
  const { bitmap, scenery } = options
  TREE_PIXELS.forEach(pixel => setPixel({ bitmap, x: OWL_TREE_X + pixel.x, y: pixel.y, color: TREE_BARK }))
  const owlX = OWL_TREE_X + 2
  stamp({ target: bitmap, source: OWL_FRAMES[owlLook(scenery)], x: owlX, y: BRANCH_Y - OWL_HEIGHT })
  const vignette = scenery.vignette
  if (vignette?.kind === 'owl' && vignette.ageMs % 2800 < 1200) {
    const rise = (vignette.ageMs % 2800) / 300
    setPixel({ bitmap, x: owlX + 4 + rise * 0.5, y: BRANCH_Y - 4 - rise, color: NOTE_COLOR })
  }
}

function roofTopAt(options: { x: number; width: number }): number {
  const limit = options.width - CASTLE_WIDTH - 4
  const house = HOUSES.find(candidate => {
    const left = VILLAGE_LEFT + candidate.offset
    return options.x >= left && options.x < left + candidate.width && left + candidate.width <= limit
  })
  if (!house) {
    return EAVE_Y - 2
  }
  const height = house.width === 9 ? 8 : 7
  const peak = Math.floor(house.width / 2)
  return FLOOR_TOP - height + Math.abs(options.x - (VILLAGE_LEFT + house.offset) - peak)
}

export function drawCat(options: { bitmap: Bitmap; scenery: Scenery }): void {
  const { bitmap, scenery } = options
  const vignette = scenery.vignette
  if (vignette?.kind !== 'cat') {
    return
  }
  const limit = bitmap.width - CASTLE_WIDTH - 4
  const lastHouse = [...HOUSES].reverse().find(house => VILLAGE_LEFT + house.offset + house.width <= limit)
  const startX = VILLAGE_LEFT + 1
  const endX = lastHouse ? VILLAGE_LEFT + lastHouse.offset + lastHouse.width - CAT_WIDTH : startX
  const progress = Math.min(1, vignette.ageMs / (vignette.lengthMs * CAT_WALK_SHARE))
  const x = Math.round(startX + (endX - startX) * progress)
  const isSitting = progress >= 1
  const sprite = isSitting ? CAT_SIT : frameAt({ frames: CAT_WALK, step: Math.floor(vignette.ageMs / 200) })
  const feetY = roofTopAt({ x: x + 3, width: bitmap.width }) - 1
  stamp({ target: bitmap, source: sprite, x, y: feetY - CAT_HEIGHT + 1 })
}
