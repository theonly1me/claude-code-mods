import { parsePixelMap, withSymbols } from '../shared/pixel/sprite'
import type { FrameSet } from '../shared/pixel/sprite'

const PALETTE = {
  b: 0x4f8bf5,
  v: 0x9b6cd6,
  p: 0xe86a92,
  w: 0xffffff,
  k: 0x1b1030,
  V: 0x6b3fa0,
} as const

const STAR_MASK = [
  '.....##.....',
  '.....##.....',
  '....####....',
  '....####....',
  '..########..',
  '############',
  '############',
  '..########..',
  '....####....',
  '....####....',
  '.....##.....',
  '.....##.....',
]

function gradientSymbol(options: { x: number; y: number }): string {
  const diagonal = options.x + options.y
  const isOddColumn = options.x % 2 === 1
  if (diagonal < 7) {
    return 'b'
  }
  if (diagonal < 9) {
    return isOddColumn ? 'v' : 'b'
  }
  if (diagonal < 13) {
    return 'v'
  }
  if (diagonal < 15) {
    return isOddColumn ? 'p' : 'v'
  }
  return 'p'
}

const STAR_ROWS = STAR_MASK.map((maskRow, y) =>
  Array.from(maskRow)
    .map((cell, x) => (cell === '#' ? gradientSymbol({ x, y }) : '.'))
    .join(''),
)

const FACE_AWAKE = [
  { x: 3, y: 4, symbol: 'w' },
  { x: 4, y: 4, symbol: 'w' },
  { x: 3, y: 5, symbol: 'w' },
  { x: 4, y: 5, symbol: 'k' },
  { x: 7, y: 4, symbol: 'w' },
  { x: 8, y: 4, symbol: 'w' },
  { x: 7, y: 5, symbol: 'k' },
  { x: 8, y: 5, symbol: 'w' },
  { x: 5, y: 4, symbol: 'V' },
  { x: 6, y: 4, symbol: 'V' },
  { x: 4, y: 7, symbol: 'w' },
  { x: 5, y: 7, symbol: 'k' },
  { x: 6, y: 7, symbol: 'k' },
  { x: 7, y: 7, symbol: 'w' },
]

const FACE_BLINK = FACE_AWAKE.map(entry =>
  entry.y === 4 && entry.symbol === 'w' ? { ...entry, symbol: 'v' } : entry,
)

export const GEMINI_FRAMES: FrameSet = [
  parsePixelMap({
    rows: withSymbols({ rows: STAR_ROWS, symbols: FACE_AWAKE }),
    palette: PALETTE,
  }),
  parsePixelMap({
    rows: withSymbols({ rows: STAR_ROWS, symbols: FACE_BLINK }),
    palette: PALETTE,
  }),
]
