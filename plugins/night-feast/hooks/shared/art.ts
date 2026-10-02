import type { Bitmap } from './render/bitmap'
import { setPixel } from './render/bitmap'

export const palette = { '.': null, o: 0xf4a261, r: 0xe76f51, w: 0xf5ead3, b: 0x283042, g: 0x65b891, l: 0xa7d973, y: 0xffd166, p: 0xb393de, c: 0x7cc9d4, d: 0x78543b, v: 0x842449, h: 0xdad6ed, e: 0xdb3e58, a: 0xdfb08c } as const
export type Sprite = readonly string[]
export const familiar: Sprite = ['..p..p..', '.pppppp.', 'ppwppwpp', 'ppbppbpp', '.ppwwpp.', '..pppp..', '.pppppp.', '..p..p..']
export const egg: Sprite = ['...ww...', '..wwww..', '.wwpwww.', '.wwwwwp.', '.wpwwww.', '..wwww..']
export const farmer: Sprite = ['..yyy...', '.yyyyy..', '..owo...', '..ooo...', '.cocc...', '..cc....', '..b.b...']

export function drawSprite(options: { bitmap: Bitmap; sprite: Sprite; x: number; y: number; scale?: number; flipped?: boolean }): void {
  const scale = options.scale ?? 1
  options.sprite.forEach((row, rowIndex) => {
    [...row].forEach((letter, columnIndex) => {
      const color = Object.entries(palette).find(([key]) => key === letter)?.[1]
      if (color === undefined || color === null) return
      for (let vertical = 0; vertical < scale; vertical += 1) {
        for (let horizontal = 0; horizontal < scale; horizontal += 1) {
          const column = options.flipped ? row.length - columnIndex - 1 : columnIndex
          setPixel({ bitmap: options.bitmap, x: options.x + column * scale + horizontal, y: options.y + rowIndex * scale + vertical, color })
        }
      }
    })
  })
}

export function rectangle(options: { bitmap: Bitmap; x: number; y: number; width: number; height: number; color: number }): void {
  for (let row = 0; row < options.height; row += 1) {
    for (let column = 0; column < options.width; column += 1) {
      setPixel({ bitmap: options.bitmap, x: options.x + column, y: options.y + row, color: options.color })
    }
  }
}

export function landscape(options: { bitmap: Bitmap; night?: boolean; tick: number }): void {
  const { bitmap } = options
  bitmap.pixels.fill(options.night ? 0x191c2e : 0x202735)
  for (let column = 3; column < bitmap.width; column += 21) {
    setPixel({ bitmap, x: column, y: 1 + column % Math.max(2, bitmap.height - 4), color: options.night ? 0xb393de : 0x34465b })
  }
  rectangle({ bitmap, x: 0, y: bitmap.height - 2, width: bitmap.width, height: 2, color: 0x78543b })
  rectangle({ bitmap, x: 0, y: bitmap.height - 3, width: bitmap.width, height: 1, color: 0x65b891 })
}
