import { parsePixelMap, replaceRows } from '../shared/pixel/sprite'
import type { Bitmap } from '../shared/pixel/bitmap'

const PALETTE = {
  k: 0x0d0a14,
  h: 0x2b2340,
  f: 0xe8e2f0,
  F: 0xc9bfdc,
  e: 0xff3355,
  m: 0xffffff,
  c: 0x151020,
  r: 0x8b1e3f,
  R: 0xb8325a,
  s: 0x2a2238,
  w: 0xd9d4e6,
  g: 0xc9a227,
} as const

const EYES_OPEN = '.crFeffeFrc.'
const EYES_SHUT = '.crFffffFrc.'

const STANDING = [
  '....kkkk....',
  '...kkhhkk...',
  '...kfkkfk...',
  '.c.ffffff.c.',
  EYES_OPEN,
  '.crffmmffrc.',
  'ccrRswwsRrcc',
  'ccrRswwsRrcc',
  'ccrRsggsRrcc',
  '.crRs..sRrc.',
  '...kk..kk...',
]

const SPREAD = [
  '....kkkk....',
  '...kkhhkk...',
  'c..kfkkfk..c',
  'cc.ffffff.cc',
  'crrFeffeFrrc',
  'crRffmmffRrc',
  'crRRswwsRRrc',
  '.crRswwsRrc.',
  '..cRsggsRc..',
  '...Rs..sR...',
  '...kk..kk...',
]

const BAT_PALETTE = { b: 0x5b4a82, B: 0x3b2d55, e: 0xff3355 } as const

const BAT_UP = ['b.......b', 'bB.....Bb', '.bBebeBb.', '...BBB...']
const BAT_DOWN = ['.........', '...BBB...', 'bbBebeBbb', 'b.......b']

const MINI_BAT_UP = ['b.b', '.B.']
const MINI_BAT_DOWN = ['.B.', 'b.b']

export const VAMPIRE_STANDING = parsePixelMap({ rows: STANDING, palette: PALETTE })
export const VAMPIRE_BLINK = parsePixelMap({
  rows: replaceRows({ rows: STANDING, replacements: { [EYES_OPEN]: EYES_SHUT } }),
  palette: PALETTE,
})
export const VAMPIRE_SPREAD = parsePixelMap({ rows: SPREAD, palette: PALETTE })
export const BAT_FRAMES: readonly [Bitmap, Bitmap] = [
  parsePixelMap({ rows: BAT_UP, palette: BAT_PALETTE }),
  parsePixelMap({ rows: BAT_DOWN, palette: BAT_PALETTE }),
]
export const MINI_BAT_FRAMES: readonly [Bitmap, Bitmap] = [
  parsePixelMap({ rows: MINI_BAT_UP, palette: BAT_PALETTE }),
  parsePixelMap({ rows: MINI_BAT_DOWN, palette: BAT_PALETTE }),
]
export const SWEAT = 0x7dd3fc
export const HURT_TINT = 0xff6b6b
