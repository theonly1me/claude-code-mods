import { getPixel, setPixel } from './bitmap'
import type { Bitmap, Color } from './bitmap'
import { mixColors } from './colors'
import type { Season } from './seasons'
import type { Area } from './weather'

type Blob = { x: number; y: number; radius: number }

const CROWN: readonly Blob[] = [
  { x: 0, y: 4, radius: 4.2 },
  { x: -4, y: 5.2, radius: 3.1 },
  { x: 4, y: 5, radius: 3.3 },
  { x: -1.6, y: 2, radius: 3 },
  { x: 2.2, y: 2.4, radius: 3 },
]

const BRANCHES: readonly { x: number; y: number }[] = [
  { x: -6, y: 4 },
  { x: -3, y: 1 },
  { x: 0, y: 0 },
  { x: 3, y: 1 },
  { x: 6, y: 3 },
]

const TRUNK_TOP = 7

function hash(options: { x: number; y: number }): number {
  const value = Math.imul(options.x * 374761393 + options.y * 668265263, 1274126177)
  return ((value ^ (value >>> 13)) >>> 0) % 97
}

function isInCrown(options: { dx: number; dy: number }): boolean {
  return CROWN.some(blob => (options.dx - blob.x) ** 2 + (options.dy - blob.y) ** 2 <= blob.radius ** 2)
}

function crownColor(options: { dx: number; dy: number; season: Season; x: number; y: number }): Color {
  const { palette, name } = options.season
  const speckle = hash({ x: options.x, y: options.y })
  if (name === 'blossom' && speckle % 7 === 0) {
    return palette.accent
  }
  if (name === 'autumn' && speckle % 6 === 0) {
    return palette.accent
  }
  const shade = (options.dx / 6) * 0.4 + ((options.dy - 4) / 5) * 0.6
  if (shade < -0.32) {
    return palette.foliageLight
  }
  return shade > 0.3 ? palette.foliageDark : palette.foliage
}

function drawLine(options: { bitmap: Bitmap; from: { x: number; y: number }; to: { x: number; y: number }; color: Color }): void {
  const steps = Math.max(Math.abs(options.to.x - options.from.x), Math.abs(options.to.y - options.from.y), 1)
  for (let step = 0; step <= steps; step += 1) {
    const amount = step / steps
    setPixel({
      bitmap: options.bitmap,
      x: options.from.x + (options.to.x - options.from.x) * amount,
      y: options.from.y + (options.to.y - options.from.y) * amount,
      color: options.color,
    })
  }
}

function drawBareBranches(options: { bitmap: Bitmap; centerX: number; top: number; season: Season }): void {
  const { bitmap, centerX, top, season } = options
  const branchColor = mixColors({ from: season.palette.trunk, to: 0x000000, amount: 0.1 })
  BRANCHES.forEach(branch => {
    drawLine({
      bitmap,
      from: { x: centerX, y: top + TRUNK_TOP },
      to: { x: centerX + branch.x, y: top + branch.y },
      color: branchColor,
    })
  })
  for (let dy = -1; dy < TRUNK_TOP; dy += 1) {
    for (let dx = -7; dx <= 7; dx += 1) {
      const below = getPixel({ bitmap, x: centerX + dx, y: top + dy + 1 })
      const here = getPixel({ bitmap, x: centerX + dx, y: top + dy })
      if (below === branchColor && here !== branchColor && hash({ x: dx, y: dy }) % 3 !== 0) {
        setPixel({ bitmap, x: centerX + dx, y: top + dy, color: season.palette.accent })
      }
    }
  }
}

export function drawSeasonTree(options: {
  bitmap: Bitmap
  centerX: number
  groundY: number
  season: Season
  clockMs: number
}): Area {
  const { bitmap, centerX, groundY, season } = options
  const top = groundY - 14
  const sway = Math.round(Math.sin(options.clockMs / 1300) * 0.7)
  const trunkDark = mixColors({ from: season.palette.trunk, to: 0x000000, amount: 0.35 })
  for (let y = top + TRUNK_TOP - 1; y < groundY; y += 1) {
    setPixel({ bitmap, x: centerX, y, color: season.palette.trunk })
    setPixel({ bitmap, x: centerX + 1, y, color: trunkDark })
  }
  setPixel({ bitmap, x: centerX - 1, y: groundY - 1, color: season.palette.trunk })
  setPixel({ bitmap, x: centerX + 2, y: groundY - 1, color: trunkDark })
  if (season.name === 'winter') {
    drawBareBranches({ bitmap, centerX, top, season })
    return { x: centerX - 6, y: top, width: 13, height: 8 }
  }
  for (let dy = -1; dy <= 9; dy += 1) {
    for (let dx = -8; dx <= 8; dx += 1) {
      if (!isInCrown({ dx, dy })) {
        continue
      }
      const x = centerX + dx + (dy < 4 ? sway : 0)
      const y = top + dy
      setPixel({ bitmap, x, y, color: crownColor({ dx, dy, season, x: dx, y: dy }) })
    }
  }
  return { x: centerX - 7, y: top + 1, width: 15, height: 8 }
}
