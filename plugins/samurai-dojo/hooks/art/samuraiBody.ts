import { parsePixelMap, replaceRows } from '../shared/pixel/sprite'
import type { Bitmap } from '../shared/pixel/bitmap'

const PALETTE = {
  g: 0xf2c14e,
  s: 0x3f4a5e,
  S: 0x8c9bb5,
  r: 0xd8372e,
  O: 0xd97757,
  o: 0xb65a3e,
  k: 0x24140f,
} as const

const BLANK_ROW = '..............'
const EYES_UPPER = '.OOOkOOOOkOOO.'
const EYES_LOWER = 'OOOOkOOOOkOOOO'
const SQUINT_UPPER = '.OOOOOOOOOOOO.'
const SQUINT_LOWER = 'OOOkkOOOOkkOOO'

const HEAD_ROWS = [
  '....g....g....',
  '.....g..g.....',
  '......gg......',
  '...ssssssss...',
  '..sSSssssSSs..',
  '.rrrrrrrrrrrr.',
  '.sOOOOOOOOOOs.',
  EYES_UPPER,
  EYES_LOWER,
  'OOOOOOOOOOOOOO',
  '.rrrrrrgrrrrr.',
]

const SQUINT_HEAD_ROWS = replaceRows({
  rows: HEAD_ROWS,
  replacements: { [EYES_UPPER]: SQUINT_UPPER, [EYES_LOWER]: SQUINT_LOWER },
})

const STANDING_LEGS = ['..O.O....O.O..', '..o.o....o.o..']
const LOWERED_LEGS = ['.o..o.....o..o']

export type SamuraiBody = {
  bitmap: Bitmap
  handX: number
  handY: number
}

function buildBody(options: { isLowered: boolean; isSquinting: boolean }): SamuraiBody {
  const headRows = options.isSquinting ? SQUINT_HEAD_ROWS : HEAD_ROWS
  const rows = options.isLowered
    ? [BLANK_ROW, ...headRows, ...LOWERED_LEGS]
    : [...headRows, ...STANDING_LEGS]
  return {
    bitmap: parsePixelMap({ rows, palette: PALETTE }),
    handX: 13,
    handY: options.isLowered ? 9 : 8,
  }
}

const BODIES = {
  standing: buildBody({ isLowered: false, isSquinting: false }),
  standingSquint: buildBody({ isLowered: false, isSquinting: true }),
  lowered: buildBody({ isLowered: true, isSquinting: false }),
  loweredSquint: buildBody({ isLowered: true, isSquinting: true }),
}

export function samuraiBodyFor(options: {
  isLowered: boolean
  isSquinting: boolean
}): SamuraiBody {
  if (options.isLowered) {
    return options.isSquinting ? BODIES.loweredSquint : BODIES.lowered
  }
  return options.isSquinting ? BODIES.standingSquint : BODIES.standing
}

export const SAMURAI_WIDTH = 14
