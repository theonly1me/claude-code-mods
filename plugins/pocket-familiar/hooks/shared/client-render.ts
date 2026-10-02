import type { ClientElements, RenderElement } from 'claude-code'
import type { Bitmap } from './render/bitmap'

export function colorText(options: { elements: Pick<ClientElements, 'Box' | 'Text'>; bitmap: Bitmap }): RenderElement {
  const { elements, bitmap } = options
  const rows: RenderElement[] = []
  for (let row = 0; row < bitmap.height; row += 2) {
    const spans: RenderElement[] = []
    let characters = ''
    let upperColor: number | null = null
    let lowerColor: number | null = null
    function flush(): void {
      if (characters.length === 0) return
      spans.push(elements.Text({ children: [characters], ...(upperColor === null ? {} : { color: '#' + upperColor.toString(16).padStart(6, '0') }), ...(lowerColor === null ? {} : { backgroundColor: '#' + lowerColor.toString(16).padStart(6, '0') }) }))
      characters = ''
    }
    for (let column = 0; column < bitmap.width; column += 1) {
      const upper = bitmap.pixels[row * bitmap.width + column] ?? null
      const lower = bitmap.pixels[(row + 1) * bitmap.width + column] ?? null
      if (upper !== upperColor || lower !== lowerColor) {
        flush()
        upperColor = upper
        lowerColor = lower
      }
      characters += upper === null && lower === null ? ' ' : '▀'
    }
    flush()
    rows.push(elements.Box({ flexDirection: 'row', children: spans }))
  }
  return elements.Box({ flexDirection: 'column', children: rows })
}
