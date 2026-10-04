import { parsePixelMap } from '../shared/pixel/sprite'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import type { BubbleGlyph } from '../sim/types'

const PALETTE = {
  k: 0x2b1d14,
  w: 0xf4f1e8,
  l: 0xb9b3a6,
  r: 0x3b6fd6,
  S: 0x8ff0ff,
  s: 0x2bb3c9,
  g: 0x9aa3b5,
  G: 0x6b7385,
  L: 0xcdeeff,
  b: 0x8b5a2b,
  y: 0xffd43b,
  Y: 0xe0a800,
  O: 0xf08a24,
} as const

export const BOOK = parsePixelMap({ rows: ['wlwkwlw', 'wlwkwlw', 'rrrkrrr'], palette: PALETTE })

export const LAPTOP = parsePixelMap({
  rows: ['.kkkkk.', '.kSSSk.', '.ksSsk.', '.kkkkk.', 'ggggggG'],
  palette: PALETTE,
})

export const MAGNIFIER = parsePixelMap({ rows: ['.kk..', 'kLLk.', 'kLLk.', '.kkb.', '....b'], palette: PALETTE })

export const DUCK = parsePixelMap({ rows: ['.yy....', 'Okyy..y', '.yyyyyy', '..YYYY.'], palette: PALETTE })

const GLYPH_ROWS: Record<BubbleGlyph, readonly string[]> = {
  alert: ['#', '#', '#', '.', '#'],
  question: ['##.', '..#', '.#.', '...', '.#.'],
  heart: ['.#.#.', '#####', '.###.', '..#..'],
  note: ['..##', '..#.', '..#.', '###.', '##..'],
  sleep: ['###', '..#', '.#.', '#..', '###'],
}

export const GLYPH_COLORS: Record<BubbleGlyph, Color> = {
  alert: 0xffe066,
  question: 0xffffff,
  heart: 0xff6b9a,
  note: 0x7dd3fc,
  sleep: 0xb8c7ff,
}

function parseGlyph(glyph: BubbleGlyph): Bitmap {
  return parsePixelMap({ rows: GLYPH_ROWS[glyph], palette: { '#': GLYPH_COLORS[glyph] } })
}

const GLYPH_SPRITES: Record<BubbleGlyph, Bitmap> = {
  alert: parseGlyph('alert'),
  question: parseGlyph('question'),
  heart: parseGlyph('heart'),
  note: parseGlyph('note'),
  sleep: parseGlyph('sleep'),
}

export function glyphSprite(glyph: BubbleGlyph): Bitmap {
  return GLYPH_SPRITES[glyph]
}
