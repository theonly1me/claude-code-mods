import { createBitmap, setPixel } from './bitmap'
import type { Bitmap, Color } from './bitmap'

const TRANSPARENT_SYMBOL = '.'

export type FrameSet = readonly [Bitmap, ...Bitmap[]]

export function parsePixelMap(options: {
  rows: readonly string[]
  palette: Readonly<Record<string, Color>>
}): Bitmap {
  const [firstRow] = options.rows
  if (firstRow === undefined) {
    throw new Error('pixel map has no rows')
  }
  const width = firstRow.length
  const bitmap = createBitmap({ width, height: options.rows.length })
  options.rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`pixel map row ${y} is ${row.length} wide, expected ${width}`)
    }
    Array.from(row).forEach((symbol, x) => {
      if (symbol === TRANSPARENT_SYMBOL) {
        return
      }
      const color = options.palette[symbol]
      if (color === undefined) {
        throw new Error(`pixel map symbol "${symbol}" at ${x},${y} is not in the palette`)
      }
      setPixel({ bitmap, x, y, color })
    })
  })
  return bitmap
}

export function replaceRows(options: {
  rows: readonly string[]
  replacements: Readonly<Record<string, string>>
}): string[] {
  return options.rows.map(row => options.replacements[row] ?? row)
}

export function withSymbols(options: {
  rows: readonly string[]
  symbols: readonly { x: number; y: number; symbol: string }[]
}): string[] {
  return options.rows.map((row, y) =>
    Array.from(row)
      .map((current, x) => {
        const match = options.symbols.find(entry => entry.x === x && entry.y === y)
        return match ? match.symbol : current
      })
      .join(''),
  )
}
