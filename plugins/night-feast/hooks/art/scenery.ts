import { parsePixelMap } from '../shared/pixel/sprite'

export const SKY_TOP = 0x0b1026
export const SKY_HORIZON = 0x2a1b4a
export const DAWN_HIGH = 0xf4a261
export const DAWN_LOW = 0xe76f51
export const STAR_BRIGHT = 0xffffff
export const STAR_DIM = 0x8c86b5
export const SILHOUETTE = 0x1a1033
export const SILHOUETTE_LIGHT = 0x261a45
export const WINDOW = 0xf6c35b
export const WINDOW_DIM = 0xc98f3a
export const GROUND_EDGE = 0x4a4166
export const STONE = 0x3a3354
export const MORTAR = 0x241f36
export const MOON_LIGHT = 0xf3f0dc

const MOON_PALETTE = { m: MOON_LIGHT, c: 0xcfc9a8, C: 0xb9b291 } as const

export const MOON = parsePixelMap({
  rows: ['.mmmm.', 'mmmmcm', 'mcmmmm', 'mCmmmm', 'mmmmcm', '.mmmm.'],
  palette: MOON_PALETTE,
})

const HOUSE_PALETTE = { r: SILHOUETTE, w: SILHOUETTE_LIGHT, y: WINDOW, d: 0x120b24, c: SILHOUETTE } as const

export const COTTAGE = parsePixelMap({
  rows: ['...r...', '..rrr..', '.rrrrr.', 'rrrrrrr', '.wywyw.', '.wwwww.', '.wwdww.'],
  palette: HOUSE_PALETTE,
})

export const TOWNHOUSE = parsePixelMap({
  rows: ['....r.c..', '...rrrc..', '..rrrrr..', '.rrrrrrr.', 'rrrrrrrrr', '.wywwwyw.', '.wwwdwww.', '.wywdwyw.'],
  palette: HOUSE_PALETTE,
})
