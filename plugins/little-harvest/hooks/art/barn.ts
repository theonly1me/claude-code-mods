import type { Color } from '../shared/pixel/bitmap'
import { parsePixelMap } from '../shared/pixel/sprite'

const PALETTE: Readonly<Record<string, Color>> = {
  D: 0x5e1d1b,
  d: 0x7f2b27,
  W: 0xf2efe6,
  R: 0xa8342a,
  r: 0xc9483a,
  h: 0xe6c35c,
  k: 0x5a1c17,
}

const BARN_ROWS = [
  '.....DDDDDDD.....',
  '...DDdddddddDD...',
  '.DDdddddddddddDD.',
  'WWWWWWWWWWWWWWWWW',
  '.RrRrRWhhhWRrRrR.',
  '.RrRrRWWWWWRrRrR.',
  '.RrRrRrRrRrRrRrR.',
  '.RrRWWWWWWWWWRrR.',
  '.RrRWWkkkkkWWRrR.',
  '.RrRWkWkkkWkWRrR.',
  '.RrRWkkWkWkkWRrR.',
  '.RrRWkkkWkkkWRrR.',
]

export const BARN = parsePixelMap({ rows: BARN_ROWS, palette: PALETTE })
export const BARN_DOOR_X = 8
