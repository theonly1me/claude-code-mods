import { parsePixelMap } from '../shared/pixel/sprite'
import type { Bitmap } from '../shared/pixel/bitmap'

const OWL_PALETTE = { o: 0x6b4a2e, O: 0xc9a06a, y: 0xffd23f, k: 0xe8913a } as const
const CAT_PALETTE = { k: 0x0b0812, r: 0x6b5fa0, y: 0xffd23f } as const

export type OwlLook = 'front' | 'left' | 'right' | 'blink'

export const OWL_FRAMES: Readonly<Record<OwlLook, Bitmap>> = {
  front: parsePixelMap({ rows: ['o...o', 'oOOOo', 'OyOyO', 'oOkOo', '.ooo.'], palette: OWL_PALETTE }),
  left: parsePixelMap({ rows: ['o...o', 'oOOOo', 'yOyOo', 'Okooo', '.ooo.'], palette: OWL_PALETTE }),
  right: parsePixelMap({ rows: ['o...o', 'oOOOo', 'oOyOy', 'oooko', '.ooo.'], palette: OWL_PALETTE }),
  blink: parsePixelMap({ rows: ['o...o', 'oOOOo', 'OOOOO', 'oOkOo', '.ooo.'], palette: OWL_PALETTE }),
}

export const CAT_WALK: readonly [Bitmap, Bitmap] = [
  parsePixelMap({ rows: ['r...r.r', 'k...kyk', '.rrrkk.', '.k..k..'], palette: CAT_PALETTE }),
  parsePixelMap({ rows: ['r...r.r', 'k...kyk', '.rrrkk.', '..k..k.'], palette: CAT_PALETTE }),
]

export const CAT_SIT = parsePixelMap({ rows: ['....r.r', 'r...kyk', 'k..rkk.', 'kkkkkk.'], palette: CAT_PALETTE })

export const CAT_HEIGHT = 4
export const CAT_WIDTH = 7
export const OWL_HEIGHT = 5
export const TREE_BARK = 0x4b3d6b
export const CLOUD_TINT = 0x8a82b8
export const NOTE_COLOR = 0xd9d4e6
