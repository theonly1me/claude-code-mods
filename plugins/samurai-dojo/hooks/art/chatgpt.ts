import { parsePixelMap, replaceRows } from '../shared/pixel/sprite'
import type { FrameSet } from '../shared/pixel/sprite'

const PALETTE = {
  t: 0x10a37f,
  T: 0x0b7a5f,
  l: 0x74e0c0,
  w: 0xffffff,
  k: 0x06291f,
} as const

const EYES_OPEN = 'tlTwkTTkwTlt'
const EYES_SHUT = 'tlTTTTTTTTlt'
const MOUTH_A = '.tTTlkklTTt.'
const MOUTH_B = '.tTTTkkTTTt.'
const LOBES_A = '...tt..tt...'
const LOBES_B = '..tt....tt..'

const ORB_ROWS = [
  LOBES_A,
  '..tllttllt..',
  '.ttlTttTltt.',
  'tllTTTTTTllt',
  EYES_OPEN,
  'tlTTTTTTTTlt',
  MOUTH_A,
  'tlTTTTTTTTlt',
  'tllTTTTTTllt',
  '.ttlTttTltt.',
  '..tllttllt..',
  LOBES_A,
]

const SECOND_ROWS = replaceRows({
  rows: ORB_ROWS,
  replacements: { [EYES_OPEN]: EYES_SHUT, [MOUTH_A]: MOUTH_B, [LOBES_A]: LOBES_B },
})

export const CHATGPT_FRAMES: FrameSet = [
  parsePixelMap({ rows: ORB_ROWS, palette: PALETTE }),
  parsePixelMap({ rows: SECOND_ROWS, palette: PALETTE }),
]
