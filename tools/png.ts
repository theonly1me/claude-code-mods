import { deflateSync } from 'node:zlib'

import type { Bitmap, Color } from '../shared/pixel/bitmap.ts'

const SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  bytes.forEach(byte => {
    crc = (CRC_TABLE[(crc ^ byte) & 255] ?? 0) ^ (crc >>> 8)
  })
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(options: { type: string; data: Uint8Array }): Uint8Array {
  const typeBytes = new TextEncoder().encode(options.type)
  const body = new Uint8Array(typeBytes.length + options.data.length)
  body.set(typeBytes, 0)
  body.set(options.data, typeBytes.length)
  const framed = new Uint8Array(body.length + 8)
  const view = new DataView(framed.buffer)
  view.setUint32(0, options.data.length)
  framed.set(body, 4)
  view.setUint32(4 + body.length, crc32(body))
  return framed
}

export function encodePng(options: {
  width: number
  height: number
  rgb: Uint8Array
}): Uint8Array {
  const { width, height, rgb } = options
  const stride = width * 3
  const scanlines = new Uint8Array((stride + 1) * height)
  for (let row = 0; row < height; row += 1) {
    scanlines.set(rgb.subarray(row * stride, (row + 1) * stride), row * (stride + 1) + 1)
  }
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  header.set([8, 2, 0, 0, 0], 8)
  const parts = [
    SIGNATURE,
    chunk({ type: 'IHDR', data: header }),
    chunk({ type: 'IDAT', data: deflateSync(scanlines) }),
    chunk({ type: 'IEND', data: new Uint8Array(0) }),
  ]
  const png = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  parts.reduce((offset, part) => {
    png.set(part, offset)
    return offset + part.length
  }, 0)
  return png
}

export function rasterizeSheet(options: {
  bitmaps: readonly Bitmap[]
  columns: number
  scale: number
  gap: number
  background: Color
}): { width: number; height: number; rgb: Uint8Array } {
  const { bitmaps, columns, scale, gap, background } = options
  const cellWidth = Math.max(...bitmaps.map(bitmap => bitmap.width)) * scale + gap
  const cellHeight = Math.max(...bitmaps.map(bitmap => bitmap.height)) * scale + gap
  const rowCount = Math.ceil(bitmaps.length / columns)
  const width = cellWidth * Math.min(columns, bitmaps.length) + gap
  const height = cellHeight * rowCount + gap
  const rgb = new Uint8Array(width * height * 3)
  for (let index = 0; index < width * height; index += 1) {
    rgb.set([(background >> 16) & 255, (background >> 8) & 255, background & 255], index * 3)
  }
  bitmaps.forEach((bitmap, bitmapIndex) => {
    const originX = gap + (bitmapIndex % columns) * cellWidth
    const originY = gap + Math.floor(bitmapIndex / columns) * cellHeight
    bitmap.pixels.forEach((color, pixelIndex) => {
      if (color === null) {
        return
      }
      const pixelX = originX + (pixelIndex % bitmap.width) * scale
      const pixelY = originY + Math.floor(pixelIndex / bitmap.width) * scale
      for (let offsetY = 0; offsetY < scale; offsetY += 1) {
        for (let offsetX = 0; offsetX < scale; offsetX += 1) {
          rgb.set(
            [(color >> 16) & 255, (color >> 8) & 255, color & 255],
            ((pixelY + offsetY) * width + pixelX + offsetX) * 3,
          )
        }
      }
    })
  })
  return { width, height, rgb }
}
