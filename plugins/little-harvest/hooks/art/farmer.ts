import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { parsePixelMap, replaceRows } from '../shared/pixel/sprite'

const PALETTE: Readonly<Record<string, Color>> = {
  h: 0xe8c46a,
  H: 0xb8923e,
  b: 0xb5452d,
  s: 0xf1c27d,
  k: 0x2b1d14,
  r: 0xc8463a,
  O: 0x3b6fc4,
  o: 0x26497f,
  d: 0x4a3020,
}

const STAND = [
  '..hhh..',
  '..bbb..',
  'HhhhhhH',
  '..ssk..',
  '..sss..',
  '.rOOOr.',
  '.sOoOs.',
  '..OOO..',
  '..o.o..',
  '..d.d..',
]

const CROUCH = [
  '.......',
  '.......',
  '..hhh..',
  '..bbb..',
  'HhhhhhH',
  '..ssk..',
  '.rOOOr.',
  '.sOoOrs',
  '.oOOOo.',
  '.d...d.',
]

const STRIDE = replaceRows({ rows: STAND, replacements: { '..o.o..': '.o...o.', '..d.d..': '.d...d.' } })
const WORK = replaceRows({ rows: STAND, replacements: { '.rOOOr.': '.rOOOrs', '.sOoOs.': '.sOoO..' } })
const CHEER = replaceRows({ rows: STAND, replacements: { '..sss..': 's.sss.s', '.rOOOr.': 'rrOOOrr', '.sOoOs.': '..OoO..' } })
const REST = replaceRows({ rows: CROUCH, replacements: { '..ssk..': '..sss..', '.sOoOrs': '.sOoOs.' } })

export const FARMER_WIDTH = 7
export const FARMER_HEIGHT = STAND.length
export const FARMER_HAND = { x: 6, y: 5 }

export const FARMER_FRAMES = {
  stand: parsePixelMap({ rows: STAND, palette: PALETTE }),
  stride: parsePixelMap({ rows: STRIDE, palette: PALETTE }),
  work: parsePixelMap({ rows: WORK, palette: PALETTE }),
  cheer: parsePixelMap({ rows: CHEER, palette: PALETTE }),
  crouch: parsePixelMap({ rows: CROUCH, palette: PALETTE }),
  rest: parsePixelMap({ rows: REST, palette: PALETTE }),
} satisfies Record<string, Bitmap>
