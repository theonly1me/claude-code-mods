import { expect, test } from 'claude-code/testing'

import { createBitmap, setPixel } from '../hooks/shared/pixel/bitmap'
import { toCellWords } from '../hooks/shared/pixel/cells'

const TERMINAL_DEFAULT = 0x01000000

function cellAt(options: { words: Uint32Array; index: number }): number[] {
  const start = options.index * 3
  return Array.from(options.words.slice(start, start + 3))
}

test('two vertical pixels pack into one half block cell', () => {
  const bitmap = createBitmap({ width: 1, height: 2 })
  setPixel({ bitmap, x: 0, y: 0, color: 0xff0000 })
  setPixel({ bitmap, x: 0, y: 1, color: 0x0000ff })

  const words = toCellWords(bitmap)

  expect(cellAt({ words, index: 0 })).toEqual([0x2580, 0xff0000, 0x0000ff])
})

test('a lone lower pixel uses the lower half block over the default background', () => {
  const bitmap = createBitmap({ width: 1, height: 2 })
  setPixel({ bitmap, x: 0, y: 1, color: 0x00ff00 })

  expect(cellAt({ words: toCellWords(bitmap), index: 0 })).toEqual([
    0x2584,
    0x00ff00,
    TERMINAL_DEFAULT,
  ])
})

test('an empty cell is a space in the terminal defaults', () => {
  const bitmap = createBitmap({ width: 2, height: 2 })

  expect(cellAt({ words: toCellWords(bitmap), index: 1 })).toEqual([
    0x20,
    TERMINAL_DEFAULT,
    TERMINAL_DEFAULT,
  ])
})

test('the word count is columns times rows times three', () => {
  const bitmap = createBitmap({ width: 5, height: 16 })

  expect(toCellWords(bitmap).length).toBe(5 * 8 * 3)
})
