import type { Color, Tint } from '../shared/pixel/bitmap'
import { mixColors } from '../shared/pixel/colors'
import type { Season, SeasonPalette } from '../shared/pixel/seasons'

type Keyframe = { hour: number; top: Color; middle: Color; bottom: Color; darkness: number }

const NIGHT = { top: 0x0b1026, middle: 0x16204a, bottom: 0x283262, darkness: 1 }
const DAWN = { top: 0x3a3a78, middle: 0xc06c86, bottom: 0xf6b26b, darkness: 0.45 }
const DAY = { top: 0x3f8fd8, middle: 0x7cc0ec, bottom: 0xc4e8f6, darkness: 0 }
const DUSK = { top: 0x2e2a64, middle: 0xa64d74, bottom: 0xf38b4f, darkness: 0.5 }

const KEYFRAMES: readonly Keyframe[] = [
  { hour: 0, ...NIGHT },
  { hour: 5, ...NIGHT },
  { hour: 6.5, ...DAWN },
  { hour: 8, ...DAY },
  { hour: 17, ...DAY },
  { hour: 18.6, ...DUSK },
  { hour: 20, ...NIGHT },
  { hour: 24, ...NIGHT },
]
const NIGHT_INK: Color = 0x0e1430

export type Light = {
  top: Color
  middle: Color
  bottom: Color
  darkness: number
  tint: Tint
}

function blend(options: { from: number; to: number; amount: number }): number {
  return options.from + (options.to - options.from) * options.amount
}

export function lightAt(hour: number): Light {
  const index = Math.max(0, KEYFRAMES.findIndex(frame => frame.hour > hour) - 1)
  const from = KEYFRAMES[index] ?? KEYFRAMES[0]
  const to = KEYFRAMES[index + 1] ?? from
  if (!from || !to) {
    return { ...DAY, tint: color => color }
  }
  const amount = to.hour === from.hour ? 0 : (hour - from.hour) / (to.hour - from.hour)
  const darkness = blend({ from: from.darkness, to: to.darkness, amount })
  return {
    top: mixColors({ from: from.top, to: to.top, amount }),
    middle: mixColors({ from: from.middle, to: to.middle, amount }),
    bottom: mixColors({ from: from.bottom, to: to.bottom, amount }),
    darkness,
    tint: color => mixColors({ from: color, to: NIGHT_INK, amount: darkness * 0.45 }),
  }
}

export function skyRow(options: { light: Light; y: number; height: number }): Color {
  const { light } = options
  const progress = options.y / Math.max(1, options.height - 1)
  return progress < 0.5
    ? mixColors({ from: light.top, to: light.middle, amount: progress * 2 })
    : mixColors({ from: light.middle, to: light.bottom, amount: (progress - 0.5) * 2 })
}

export function seasonalLight(options: { hour: number; season: Season }): Light {
  const light = lightAt(options.hour)
  const { palette } = options.season
  const amount = 0.4 * (1 - light.darkness * 0.6)
  return {
    ...light,
    top: mixColors({ from: light.top, to: palette.skyTop, amount }),
    middle: mixColors({ from: light.middle, to: mixColors({ from: palette.skyTop, to: palette.skyLow, amount: 0.5 }), amount }),
    bottom: mixColors({ from: light.bottom, to: palette.skyLow, amount }),
  }
}

export function tintPalette(options: { palette: SeasonPalette; light: Light }): SeasonPalette {
  const { palette, light } = options
  const [firstParticle, ...otherParticles] = palette.particles
  return {
    ground: light.tint(palette.ground),
    groundShade: light.tint(palette.groundShade),
    foliageLight: light.tint(palette.foliageLight),
    foliage: light.tint(palette.foliage),
    foliageDark: light.tint(palette.foliageDark),
    accent: light.tint(palette.accent),
    trunk: light.tint(palette.trunk),
    skyTop: palette.skyTop,
    skyLow: palette.skyLow,
    moon: palette.moon,
    particles: [light.tint(firstParticle), ...otherParticles.map(light.tint)],
  }
}
