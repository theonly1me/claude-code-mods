import { parsePixelMap, replaceRows } from './pixelMap'
import type { FrameSet } from './pixelMap'

const PALETTE = {
  h: 0x7b8aa0,
  e: 0x39465c,
  d: 0x1e293b,
  D: 0x0b1220,
  G: 0x4ade80,
  w: 0xf1f5f9,
} as const

const CURSOR_ON = '.eDGDDGGDDe.'
const CURSOR_OFF = '.eDGDDDDDDe.'
const LEGS_STEP_A = '..d.d..d.d..'
const LEGS_STEP_B = '...d.dd.d...'
const TIPS_STEP_A = '..G.d..d.G..'
const TIPS_STEP_B = '...G.dd.G...'

const POD_ROWS = [
  '.h........h.',
  '..h......h..',
  '...hhhhhh...',
  '..heeeeeeh..',
  '.heeeeeeeeh.',
  '.eDGDDDDDDe.',
  '.eDDGDDDDDe.',
  CURSOR_ON,
  '.hwewewewwh.',
  '..heeeeeeh..',
  '...dddddd...',
  LEGS_STEP_A,
  TIPS_STEP_A,
]

const STEP_B_ROWS = replaceRows({
  rows: POD_ROWS,
  replacements: {
    [CURSOR_ON]: CURSOR_OFF,
    [LEGS_STEP_A]: LEGS_STEP_B,
    [TIPS_STEP_A]: TIPS_STEP_B,
  },
})

export const CODEX_FRAMES: FrameSet = [
  parsePixelMap({ rows: POD_ROWS, palette: PALETTE }),
  parsePixelMap({ rows: STEP_B_ROWS, palette: PALETTE }),
]
