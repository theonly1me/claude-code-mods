import type { Color } from '../shared/pixel/bitmap'
import { parsePixelMap } from '../shared/pixel/sprite'

const PALETTE: Readonly<Record<string, Color>> = {
  w: 0xf6f1e4,
  W: 0xcfc6b0,
  b: 0xb8692a,
  B: 0x87471b,
  r: 0xe0402e,
  y: 0xf2b630,
  k: 0x1d1b26,
  K: 0x3a3850,
  o: 0xe39a45,
  O: 0xb06a22,
  e: 0x3a2414,
  h: 0xe8c46a,
  H: 0xa8812e,
  s: 0xd9b98a,
  p: 0xc4553b,
  P: 0x7d2f22,
  q: 0x5f9a3a,
  t: 0x7a5432,
  c: 0x9aa7b8,
  C: 0x5e6b80,
  a: 0x8fd0ff,
  g: 0xe9d27a,
}

function sprite(rows: readonly string[]) {
  return parsePixelMap({ rows, palette: PALETTE })
}

export const CHICKEN_FRAMES = {
  stand: sprite(['...r.', 'W.wwy', 'wwww.', '.y.y.']),
  step: sprite(['...r.', 'W.wwy', 'wwww.', 'y...y']),
  peck: sprite(['.....', 'W....', 'wwwwr', '.y.wy']),
}

export const HEN_FRAMES = {
  stand: sprite(['...r.', 'B.bby', 'bbbb.', '.y.y.']),
  step: sprite(['...r.', 'B.bby', 'bbbb.', 'y...y']),
  peck: sprite(['.....', 'B....', 'bbbbr', '.y.by']),
}

export const CROW_FRAMES = {
  perch: sprite(['..kk.', 'kkkky', 'K.k..']),
  peck: sprite(['.....', 'kkkk.', 'K.kky']),
  wingsUp: sprite(['k...k', '.kkky', '..k..']),
  wingsDown: sprite(['.....', 'kkkky', 'k.k.k']),
}

export const CAT_FRAMES = {
  nap: sprite(['o.o.....', 'oeo.....', 'oooOoOoo', '.ooooooo']),
  stretch: sprite(['........', 'o.o.....', 'ooooOoOo', '.o....o.']),
  walk: sprite(['o.o.....', 'oko.....', 'oooOoOoo', '.o.o..o.']),
}

export const SCARECROW = sprite([
  '..HHH..',
  '.HHHHH.',
  '..sKs..',
  'gtpqPtg',
  '..pPp..',
  '..qpP..',
  '...t...',
  '...t...',
  '...t...',
])

export const WATERING_CAN = sprite(['.cc.', 'cCCc', 'CCC.'])

export const HAY_BALE = sprite(['ghgh', 'hHhH'])

export const SPRAY: Color = PALETTE.a ?? 0x8fd0ff
export const GRAIN: Color = PALETTE.g ?? 0xe9d27a
