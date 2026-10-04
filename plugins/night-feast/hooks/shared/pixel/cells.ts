import { getPixel } from './bitmap'
import type { Bitmap } from './bitmap'

const TERMINAL_DEFAULT = 0x01000000
const SPACE = 0x20
const UPPER_HALF_BLOCK = 0x2580
const LOWER_HALF_BLOCK = 0x2584

export function cellRowsOf(bitmap: Bitmap): number {
  return Math.floor(bitmap.height / 2)
}

export function toCellWords(bitmap: Bitmap): Uint32Array {
  const rows = cellRowsOf(bitmap)
  const words = new Uint32Array(bitmap.width * rows * 3)
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < bitmap.width; column += 1) {
      const upper = getPixel({ bitmap, x: column, y: row * 2 })
      const lower = getPixel({ bitmap, x: column, y: row * 2 + 1 })
      const offset = (row * bitmap.width + column) * 3
      if (upper === null && lower === null) {
        words.set([SPACE, TERMINAL_DEFAULT, TERMINAL_DEFAULT], offset)
      } else if (upper === null && lower !== null) {
        words.set([LOWER_HALF_BLOCK, lower, TERMINAL_DEFAULT], offset)
      } else if (upper !== null) {
        words.set([UPPER_HALF_BLOCK, upper, lower ?? TERMINAL_DEFAULT], offset)
      }
    }
  }
  return words
}

function toBinaryString(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return binary
}

export function encodeCells(bitmap: Bitmap): string {
  return btoa(toBinaryString(new Uint8Array(toCellWords(bitmap).buffer)))
}
