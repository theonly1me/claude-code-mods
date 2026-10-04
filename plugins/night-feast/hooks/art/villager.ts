import { parsePixelMap } from '../shared/pixel/sprite'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import type { Palette } from '../sim/types'

type VillagerColors = { h: Color; f: Color; s: Color; S: Color; p: Color; k: Color; e: Color; l: Color }

const COLORS: Readonly<Record<Palette, VillagerColors>> = {
  0: { h: 0x6b4226, f: 0xf2c9a0, s: 0x3a7bd5, S: 0x2c5ea8, p: 0x3b3b58, k: 0x1c1a24, e: 0x1a1a1a, l: 0xf6c35b },
  1: { h: 0xf2d16b, f: 0xe8b48a, s: 0xc2452d, S: 0x93331f, p: 0x4a3b2a, k: 0x1c1a24, e: 0x1a1a1a, l: 0xf6c35b },
  2: { h: 0x34303f, f: 0xc68a5e, s: 0x5a9e6f, S: 0x417a52, p: 0x2b2b40, k: 0x1c1a24, e: 0x1a1a1a, l: 0xffd479 },
}

const STEP_A = ['.hhh.', '.ffe.', '.fff.', '.sss.', 'sSsSs', '.sss.', '.p.p.', '.k.k.']
const STEP_B = ['.hhh.', '.ffe.', '.fff.', '.sss.', 'sSsSs', '.sss.', 'p...p', 'k...k']
const LANTERN_A = ['.hhh.', '.ffe.', '.fff.', '.sss.', 'sSsSl', '.sss.', '.p.p.', '.k.k.']
const LANTERN_B = ['.hhh.', '.ffe.', '.fff.', '.sss.', 'sSsSl', '.sss.', 'p...p', 'k...k']
const HAT_TOP = 'hhhhh'

function framesFor(palette: Palette): readonly [Bitmap, Bitmap] {
  const colors = COLORS[palette]
  if (palette === 2) {
    return [
      parsePixelMap({ rows: [HAT_TOP, ...LANTERN_A.slice(1)], palette: colors }),
      parsePixelMap({ rows: [HAT_TOP, ...LANTERN_B.slice(1)], palette: colors }),
    ]
  }
  return [parsePixelMap({ rows: STEP_A, palette: colors }), parsePixelMap({ rows: STEP_B, palette: colors })]
}

export const VILLAGER_FRAMES: Readonly<Record<Palette, readonly [Bitmap, Bitmap]>> = {
  0: framesFor(0),
  1: framesFor(1),
  2: framesFor(2),
}

export const VILLAGER_HEIGHT = STEP_A.length
