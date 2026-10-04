import { setPixel } from '../shared/pixel/bitmap'
import type { Bitmap } from '../shared/pixel/bitmap'
import { toRadians } from '../shared/pixel/colors'
import { EFFECT_STYLES } from '../sim/effects'
import type { Effect } from '../sim/types'

export function drawEffect(options: { bitmap: Bitmap; effect: Effect }): void {
  const { bitmap, effect } = options
  const style = EFFECT_STYLES[effect.kind]
  const progress = effect.ageMs / style.durationMs
  const colorIndex = Math.min(style.colors.length - 1, Math.floor(progress * style.colors.length))
  const color = style.colors[colorIndex]
  if (color === undefined) {
    return
  }
  const radius = 1 + progress * style.reach
  style.anglesDegrees.forEach(angleDegrees => {
    const radians = toRadians(angleDegrees)
    setPixel({
      bitmap,
      x: effect.x + Math.cos(radians) * radius,
      y: effect.y + Math.sin(radians) * radius,
      color,
    })
  })
  if (progress < 0.3 && effect.kind !== 'dust') {
    const first = style.colors[0]
    if (first !== undefined) {
      setPixel({ bitmap, x: effect.x, y: effect.y, color: first })
      setPixel({ bitmap, x: effect.x + 1, y: effect.y, color: first })
      setPixel({ bitmap, x: effect.x - 1, y: effect.y, color: first })
      setPixel({ bitmap, x: effect.x, y: effect.y - 1, color: first })
      setPixel({ bitmap, x: effect.x, y: effect.y + 1, color: first })
    }
  }
}
