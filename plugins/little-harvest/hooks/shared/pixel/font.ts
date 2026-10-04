import { setPixel } from './bitmap'
import type { Bitmap, Color } from './bitmap'

export const GLYPH_HEIGHT = 5
const GLYPH_ADVANCE = 4
const SPACE_ADVANCE = 2

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '..#', '..#', '..#'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  '.': ['...', '...', '...', '...', '.#.'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '*': ['#.#', '.#.', '#.#', '...', '...'],
  '<': ['...', '#.#', '###', '###', '.#.'],
}

export function drawGlyphRows(options: {
  bitmap: Bitmap
  rows: readonly string[]
  x: number
  y: number
  color: Color
}): void {
  options.rows.forEach((row, rowIndex) => {
    Array.from(row).forEach((cell, columnIndex) => {
      if (cell === '#') {
        setPixel({
          bitmap: options.bitmap,
          x: options.x + columnIndex,
          y: options.y + rowIndex,
          color: options.color,
        })
      }
    })
  })
}

export function textWidth(text: string): number {
  const advance = Array.from(text.toUpperCase()).reduce(
    (total, character) => total + (GLYPHS[character] ? GLYPH_ADVANCE : SPACE_ADVANCE),
    0,
  )
  return Math.max(0, advance - 1)
}

export function drawText(options: {
  bitmap: Bitmap
  text: string
  x: number
  y: number
  color: Color
}): number {
  let cursor = options.x
  Array.from(options.text.toUpperCase()).forEach(character => {
    const rows = GLYPHS[character]
    if (!rows) {
      cursor += SPACE_ADVANCE
      return
    }
    drawGlyphRows({ bitmap: options.bitmap, rows, x: cursor, y: options.y, color: options.color })
    cursor += GLYPH_ADVANCE
  })
  return cursor
}
