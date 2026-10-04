import { BOOK, DUCK, LAPTOP, MAGNIFIER, glyphSprite } from '../art/props'
import { setPixel, stamp } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { BUBBLE_MS } from '../sim/constants'
import type { Activity, FamiliarState } from '../sim/types'
import { hillTop } from './backdrop'
import type { Placement } from './fox'

const THOUGHT = 0xe9eef8
const SWEAT = 0x8fd3ff

function propFor(activity: Activity): Bitmap | undefined {
  if (activity === 'read') {
    return BOOK
  }
  if (activity === 'edit') {
    return LAPTOP
  }
  return activity === 'test' ? MAGNIFIER : undefined
}

function drawThoughts(options: { bitmap: Bitmap; placement: Placement; clockMs: number }): void {
  const { bitmap, placement } = options
  const x = placement.x + placement.width + 1
  const phase = Math.floor(options.clockMs / 400) % 4
  const dots = [
    { x, y: placement.top + 4 },
    { x: x + 2, y: placement.top + 2 },
    { x: x + 4, y: placement.top },
  ]
  dots.slice(0, Math.max(1, phase)).forEach((dot, index) => {
    setPixel({ bitmap, x: dot.x, y: dot.y, color: THOUGHT })
    if (index === 2) {
      setPixel({ bitmap, x: dot.x + 1, y: dot.y, color: THOUGHT })
      setPixel({ bitmap, x: dot.x, y: dot.y + 1, color: THOUGHT })
      setPixel({ bitmap, x: dot.x + 1, y: dot.y + 1, color: THOUGHT })
    }
  })
}

function drawSleep(options: { bitmap: Bitmap; placement: Placement; clockMs: number }): void {
  const cycle = (options.clockMs % 1800) / 1800
  const sprite = glyphSprite('sleep')
  const x = options.placement.x + options.placement.width + Math.round(cycle * 3)
  const y = Math.max(0, options.placement.top + 3 - Math.round(cycle * 4))
  stamp({ target: options.bitmap, source: sprite, x, y })
}

export function drawDetails(options: { bitmap: Bitmap; state: FamiliarState; placement: Placement }): void {
  const { bitmap, state, placement } = options
  const besideX = placement.x + placement.width + 2
  const prop = state.isSleeping ? undefined : propFor(state.activity)
  if (prop) {
    stamp({ target: bitmap, source: prop, x: besideX, y: hillTop(besideX + 3) - prop.height })
  }
  if (state.hasDuck) {
    const duckX = besideX + 10
    const bob = Math.floor(state.clockMs / 500) % 2
    stamp({ target: bitmap, source: DUCK, x: duckX, y: hillTop(duckX + 3) - DUCK.height - bob })
  }
  if (state.worriedMs > 0) {
    const dropY = placement.top + 2 + (Math.floor(state.clockMs / 260) % 2)
    setPixel({ bitmap, x: placement.x + placement.width, y: dropY, color: SWEAT })
    setPixel({ bitmap, x: placement.x + placement.width, y: dropY + 1, color: SWEAT })
  }
  if (state.isSleeping) {
    drawSleep({ bitmap, placement, clockMs: state.clockMs })
    return
  }
  if (state.bubble) {
    const sprite = glyphSprite(state.bubble.glyph)
    const rise = Math.round((state.bubble.ageMs / BUBBLE_MS) * 2)
    stamp({ target: bitmap, source: sprite, x: placement.x + placement.width + 2, y: Math.max(0, placement.top + 1 - rise) })
    return
  }
  if (state.activity === 'thinking') {
    drawThoughts({ bitmap, placement, clockMs: state.clockMs })
  }
}
