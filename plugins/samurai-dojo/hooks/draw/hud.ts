import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { drawGlyphRows, drawText } from '../shared/pixel/font'

const DIGIT_COLOR: Color = 0xb8bcc8
const DIGIT_ADVANCE = 4
const ICON_ROWS = ['..#', '.#.', '#..']

export function drawKillCount(options: { bitmap: Bitmap; total: number; iconColor: Color }): void {
  const { bitmap } = options
  const digits = String(options.total)
  const startX = bitmap.width - 2 - DIGIT_ADVANCE * (digits.length + 1) + 1
  drawGlyphRows({ bitmap, rows: ICON_ROWS, x: startX, y: 2, color: options.iconColor })
  drawText({ bitmap, text: digits, x: startX + DIGIT_ADVANCE, y: 1, color: DIGIT_COLOR })
}
