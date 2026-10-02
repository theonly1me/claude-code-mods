import { setPixel } from '../render/bitmap'
import type { Bitmap, Color } from '../render/bitmap'

const DIGIT_COLOR: Color = 0xb8bcc8
const ICON_COLOR: Color = 0xd8372e
const DIGIT_ADVANCE = 4
const ICON_ROWS = ['..#', '.#.', '#..']

const GLYPHS: readonly (readonly string[])[] = [
  ['###', '#.#', '#.#', '#.#', '###'],
  ['.#.', '##.', '.#.', '.#.', '###'],
  ['###', '..#', '###', '#..', '###'],
  ['###', '..#', '###', '..#', '###'],
  ['#.#', '#.#', '###', '..#', '..#'],
  ['###', '#..', '###', '..#', '###'],
  ['###', '#..', '###', '#.#', '###'],
  ['###', '..#', '..#', '..#', '..#'],
  ['###', '#.#', '###', '#.#', '###'],
  ['###', '#.#', '###', '..#', '###'],
]

function drawGlyph(options: {
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

export function drawKillCount(options: { bitmap: Bitmap; total: number }): void {
  const { bitmap } = options
  const digits = Array.from(String(options.total))
  const startX = bitmap.width - 2 - DIGIT_ADVANCE * (digits.length + 1) + 1
  drawGlyph({ bitmap, rows: ICON_ROWS, x: startX, y: 2, color: ICON_COLOR })
  digits.forEach((digit, index) => {
    const rows = GLYPHS[Number(digit)]
    if (rows) {
      drawGlyph({
        bitmap,
        rows,
        x: startX + DIGIT_ADVANCE * (index + 1),
        y: 1,
        color: DIGIT_COLOR,
      })
    }
  })
}
