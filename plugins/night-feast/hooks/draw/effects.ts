import { fillRect, getPixel, setPixel } from '../shared/pixel/bitmap'
import type { Bitmap, Color } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import { FEET_Y } from '../sim/constants'
import { EFFECT_MS } from '../sim/effects'
import type { Effect } from '../sim/types'

const POOF_COLORS: readonly Color[] = [0xd6ccf0, 0x9c8fc4, 0x5b4a82]
const SPARK_COLORS: readonly Color[] = [0xff4d6d, 0xc9184a]
const FUME_COLORS: readonly Color[] = [0xb5e48c, 0x76c893, 0x52b69a]
const BULB = 0xf5f0e6
const BULB_SHADE = 0xd8cfbf
const BULB_STEM = 0x76c893
const BLOOD = 0xc1121f
const ALARM = 0xffd23f
const DOOR_LIGHT = 0xffd479

function colorAt(options: { colors: readonly Color[]; progress: number }): Color {
  const index = Math.min(options.colors.length - 1, Math.floor(options.progress * options.colors.length))
  return options.colors[index] ?? options.colors[0] ?? 0xffffff
}

function drawPoof(options: { bitmap: Bitmap; effect: Effect; progress: number }): void {
  const { bitmap, effect, progress } = options
  const color = colorAt({ colors: POOF_COLORS, progress })
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + effect.seed
    const radius = 1 + progress * 4
    setPixel({ bitmap, x: effect.x + Math.cos(angle) * radius, y: effect.y + Math.sin(angle) * radius * 0.7, color })
  }
}

function drawSpark(options: { bitmap: Bitmap; effect: Effect; progress: number }): void {
  const { bitmap, effect, progress } = options
  for (let index = 0; index < 3; index += 1) {
    const drift = Math.sin(effect.seed + index * 2) * 2
    setPixel({
      bitmap,
      x: effect.x + drift + index - 1,
      y: effect.y - progress * 5 - index,
      color: colorAt({ colors: SPARK_COLORS, progress: progress + index * 0.2 }),
    })
  }
}

function drawFume(options: { bitmap: Bitmap; effect: Effect; progress: number }): void {
  const { bitmap, effect, progress } = options
  if (progress < 0.55) {
    fillRect({ bitmap, x: effect.x, y: effect.y + 1, width: 3, height: 2, color: BULB })
    setPixel({ bitmap, x: effect.x + 1, y: effect.y, color: BULB_SHADE })
    setPixel({ bitmap, x: effect.x + 1, y: effect.y - 1, color: BULB_STEM })
  }
  for (let index = 0; index < 4; index += 1) {
    const rise = progress * 7 + index
    const sway = Math.sin(progress * 9 + index + effect.seed) * 1.5
    setPixel({ bitmap, x: effect.x + 1 + sway + (index % 2 === 0 ? -2 : 2), y: effect.y - rise, color: colorAt({ colors: FUME_COLORS, progress }) })
  }
}

function drawDrop(options: { bitmap: Bitmap; effect: Effect; progress: number }): void {
  setPixel({ bitmap: options.bitmap, x: options.effect.x, y: options.effect.y + options.progress * 5, color: BLOOD })
}

function drawAlarm(options: { bitmap: Bitmap; effect: Effect; progress: number }): void {
  const { bitmap, effect, progress } = options
  if (progress > 0.85) {
    return
  }
  const lift = Math.round(Math.sin(progress * Math.PI) * 1.5)
  setPixel({ bitmap, x: effect.x, y: effect.y - lift, color: ALARM })
  setPixel({ bitmap, x: effect.x, y: effect.y + 1 - lift, color: ALARM })
  setPixel({ bitmap, x: effect.x, y: effect.y + 3 - lift, color: ALARM })
}

function drawLight(options: { bitmap: Bitmap; effect: Effect; progress: number }): void {
  const { bitmap, effect, progress } = options
  const strength = 1 - progress
  for (let y = effect.y + 1; y <= FEET_Y; y += 1) {
    ;[-1, 0, 1].forEach(offset => {
      const under = getPixel({ bitmap, x: effect.x + offset, y })
      if (under !== null) {
        const amount = (offset === 0 ? 0.95 : 0.45) * strength
        setPixel({ bitmap, x: effect.x + offset, y, color: mixColors({ from: under, to: DOOR_LIGHT, amount }) })
      }
    })
  }
}

export function drawEffect(options: { bitmap: Bitmap; effect: Effect }): void {
  const { bitmap, effect } = options
  const progress = Math.min(1, effect.ageMs / EFFECT_MS[effect.kind])
  if (effect.kind === 'alarm') {
    drawAlarm({ bitmap, effect, progress })
  } else if (effect.kind === 'light') {
    drawLight({ bitmap, effect, progress })
  } else if (effect.kind === 'poof') {
    drawPoof({ bitmap, effect, progress })
  } else if (effect.kind === 'spark') {
    drawSpark({ bitmap, effect, progress })
  } else if (effect.kind === 'fume') {
    drawFume({ bitmap, effect, progress })
  } else {
    drawDrop({ bitmap, effect, progress })
  }
}
