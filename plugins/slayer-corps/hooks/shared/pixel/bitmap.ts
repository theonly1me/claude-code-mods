export type Color = number

export type Bitmap = {
  width: number
  height: number
  pixels: (Color | null)[]
}

export type Tint = (color: Color) => Color

export function createBitmap(options: { width: number; height: number }): Bitmap {
  const { width, height } = options
  return { width, height, pixels: Array.from({ length: width * height }, () => null) }
}

export function setPixel(options: {
  bitmap: Bitmap
  x: number
  y: number
  color: Color
}): void {
  const { bitmap, color } = options
  const x = Math.round(options.x)
  const y = Math.round(options.y)
  if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) {
    return
  }
  bitmap.pixels[y * bitmap.width + x] = color
}

export function getPixel(options: { bitmap: Bitmap; x: number; y: number }): Color | null {
  const { bitmap, x, y } = options
  if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) {
    return null
  }
  return bitmap.pixels[y * bitmap.width + x] ?? null
}

export function fillRect(options: {
  bitmap: Bitmap
  x: number
  y: number
  width: number
  height: number
  color: Color
}): void {
  const { bitmap, color } = options
  for (let row = 0; row < options.height; row += 1) {
    for (let column = 0; column < options.width; column += 1) {
      setPixel({ bitmap, x: options.x + column, y: options.y + row, color })
    }
  }
}

export function stamp(options: {
  target: Bitmap
  source: Bitmap
  x: number
  y: number
  isFlipped?: boolean
  tint?: Tint
}): void {
  const { target, source, tint } = options
  source.pixels.forEach((color, index) => {
    if (color === null) {
      return
    }
    const column = index % source.width
    const row = Math.floor(index / source.width)
    const offset = options.isFlipped ? source.width - 1 - column : column
    setPixel({
      bitmap: target,
      x: options.x + offset,
      y: options.y + row,
      color: tint ? tint(color) : color,
    })
  })
}

export function clearBitmap(bitmap: Bitmap): void {
  bitmap.pixels.fill(null)
}
