import type { Bitmap, Color } from '../shared/pixel/bitmap.ts'

type Frame = { indexes: Uint8Array }

class ByteWriter {
  bytes: number[] = []

  byte(value: number): void {
    this.bytes.push(value & 255)
  }

  word(value: number): void {
    this.byte(value)
    this.byte(value >> 8)
  }

  text(value: string): void {
    Array.from(value).forEach(character => this.byte(character.charCodeAt(0)))
  }

  blocks(data: readonly number[]): void {
    for (let start = 0; start < data.length; start += 255) {
      const part = data.slice(start, start + 255)
      this.byte(part.length)
      part.forEach(value => this.byte(value))
    }
    this.byte(0)
  }
}

function lzw(options: { indexes: Uint8Array; minimumCodeSize: number }): number[] {
  const clearCode = 1 << options.minimumCodeSize
  const endCode = clearCode + 1
  const output: number[] = []
  let bitBuffer = 0
  let bitCount = 0
  let codeSize = options.minimumCodeSize + 1
  let dictionary = new Map<number, number>()
  let nextCode = endCode + 1

  const emit = (code: number): void => {
    bitBuffer |= code << bitCount
    bitCount += codeSize
    while (bitCount >= 8) {
      output.push(bitBuffer & 255)
      bitBuffer >>= 8
      bitCount -= 8
    }
  }

  emit(clearCode)
  let prefixCode = -1
  options.indexes.forEach(index => {
    if (prefixCode < 0) {
      prefixCode = index
      return
    }
    const key = prefixCode * 256 + index
    const known = dictionary.get(key)
    if (known !== undefined) {
      prefixCode = known
      return
    }
    emit(prefixCode)
    if (nextCode === 4096) {
      emit(clearCode)
      dictionary = new Map()
      nextCode = endCode + 1
      codeSize = options.minimumCodeSize + 1
    } else {
      if (nextCode >= 1 << codeSize) {
        codeSize += 1
      }
      dictionary.set(key, nextCode)
      nextCode += 1
    }
    prefixCode = index
  })
  if (prefixCode >= 0) {
    emit(prefixCode)
  }
  emit(endCode)
  if (bitCount > 0) {
    output.push(bitBuffer & 255)
  }
  return output
}

function quantize(color: Color, bits: number): Color {
  const mask = (0xff << (8 - bits)) & 0xff
  return color & ((mask << 16) | (mask << 8) | mask)
}

export function encodeGif(options: {
  bitmaps: readonly Bitmap[]
  scale: number
  frameMs: number
  background: Color
}): Uint8Array {
  const [first] = options.bitmaps
  if (!first) {
    throw new Error('an animation needs at least one frame')
  }
  const { scale, background } = options
  const width = first.width * scale
  const height = first.height * scale
  let bits = 8
  let colors: Color[] = []
  while (bits > 2) {
    const unique = new Set<Color>([quantize(background, bits)])
    options.bitmaps.forEach(bitmap => bitmap.pixels.forEach(pixel => unique.add(quantize(pixel ?? background, bits))))
    colors = [...unique]
    if (colors.length <= 256) {
      break
    }
    bits -= 1
  }
  const palette = new Map(colors.map((color, index) => [color, index]))
  const frames: Frame[] = options.bitmaps.map(bitmap => {
    const indexes = new Uint8Array(width * height)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixel = bitmap.pixels[Math.floor(y / scale) * bitmap.width + Math.floor(x / scale)] ?? background
        indexes[y * width + x] = palette.get(quantize(pixel, bits)) ?? 0
      }
    }
    return { indexes }
  })
  const tableBits = Math.max(1, Math.ceil(Math.log2(Math.max(2, colors.length))))
  const writer = new ByteWriter()
  writer.text('GIF89a')
  writer.word(width)
  writer.word(height)
  writer.byte(0x80 | ((tableBits - 1) << 4) | (tableBits - 1))
  writer.byte(0)
  writer.byte(0)
  for (let index = 0; index < 1 << tableBits; index += 1) {
    const color = colors[index] ?? 0
    writer.byte(color >> 16)
    writer.byte(color >> 8)
    writer.byte(color)
  }
  writer.byte(0x21)
  writer.byte(0xff)
  writer.byte(11)
  writer.text('NETSCAPE2.0')
  writer.byte(3)
  writer.byte(1)
  writer.word(0)
  writer.byte(0)
  const minimumCodeSize = Math.max(2, tableBits)
  frames.forEach(frame => {
    writer.byte(0x21)
    writer.byte(0xf9)
    writer.byte(4)
    writer.byte(0)
    writer.word(Math.round(options.frameMs / 10))
    writer.byte(0)
    writer.byte(0)
    writer.byte(0x2c)
    writer.word(0)
    writer.word(0)
    writer.word(width)
    writer.word(height)
    writer.byte(0)
    writer.byte(minimumCodeSize)
    writer.blocks(lzw({ indexes: frame.indexes, minimumCodeSize }))
  })
  writer.byte(0x3b)
  return Uint8Array.from(writer.bytes)
}
