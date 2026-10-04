import type { Color } from './bitmap'
import { mixColors } from './colors'

export type SeasonName = 'winter' | 'blossom' | 'summer' | 'autumn'

export type ParticleKind = 'snow' | 'petal' | 'firefly' | 'leaf'

export type SeasonPalette = {
  ground: Color
  groundShade: Color
  foliageLight: Color
  foliage: Color
  foliageDark: Color
  accent: Color
  trunk: Color
  skyTop: Color
  skyLow: Color
  moon: Color
  particles: readonly [Color, ...Color[]]
}

export type Season = {
  name: SeasonName
  label: string
  progress: number
  particle: ParticleKind
  palette: SeasonPalette
}

export const SEASON_MS = 5 * 60 * 1000
const BLEND_MS = 20 * 1000

const ORDER: readonly [SeasonName, ...SeasonName[]] = ['winter', 'blossom', 'summer', 'autumn']

const LABELS: Record<SeasonName, string> = {
  winter: 'Winter',
  blossom: 'Cherry blossom',
  summer: 'Summer',
  autumn: 'Autumn',
}

const PARTICLES: Record<SeasonName, ParticleKind> = {
  winter: 'snow',
  blossom: 'petal',
  summer: 'firefly',
  autumn: 'leaf',
}

export const SEASON_PALETTES: Record<SeasonName, SeasonPalette> = {
  winter: {
    ground: 0xeef4fb,
    groundShade: 0xb9c8da,
    foliageLight: 0xf4f8ff,
    foliage: 0xd5e2f0,
    foliageDark: 0x9fb3c8,
    accent: 0xffffff,
    trunk: 0x4a3a32,
    skyTop: 0x1b2440,
    skyLow: 0x5d7398,
    moon: 0xdfe9f5,
    particles: [0xffffff, 0xe3eefa, 0xc6d8ec],
  },
  blossom: {
    ground: 0x7fbf6a,
    groundShade: 0x4f8f45,
    foliageLight: 0xffd6e5,
    foliage: 0xf5a3c0,
    foliageDark: 0xd8739a,
    accent: 0xffffff,
    trunk: 0x5a3a2c,
    skyTop: 0x3a3f7a,
    skyLow: 0xe8a7c2,
    moon: 0xffe6ef,
    particles: [0xffc2d8, 0xf59bbd, 0xffe4ee],
  },
  summer: {
    ground: 0x5fae4a,
    groundShade: 0x3c7f32,
    foliageLight: 0x8fd16a,
    foliage: 0x4fa83d,
    foliageDark: 0x2f7a2b,
    accent: 0xf2e86b,
    trunk: 0x5b3b25,
    skyTop: 0x2d64b3,
    skyLow: 0x9fd4f2,
    moon: 0xffe9a3,
    particles: [0xf8f27a, 0xd9f56b, 0xfff6b8],
  },
  autumn: {
    ground: 0xb9984f,
    groundShade: 0x7d6233,
    foliageLight: 0xf7b955,
    foliage: 0xe0752e,
    foliageDark: 0xa8401f,
    accent: 0xf2d04e,
    trunk: 0x4f3322,
    skyTop: 0x3b2a4f,
    skyLow: 0xe59a5a,
    moon: 0xffb866,
    particles: [0xe8742c, 0xd14b23, 0xf2b441, 0x9b5a2a],
  },
}

function blendPalettes(options: { from: SeasonPalette; to: SeasonPalette; amount: number }): SeasonPalette {
  const { from, to, amount } = options
  const mix = (start: Color, end: Color): Color => mixColors({ from: start, to: end, amount })
  return {
    ground: mix(from.ground, to.ground),
    groundShade: mix(from.groundShade, to.groundShade),
    foliageLight: mix(from.foliageLight, to.foliageLight),
    foliage: mix(from.foliage, to.foliage),
    foliageDark: mix(from.foliageDark, to.foliageDark),
    accent: mix(from.accent, to.accent),
    trunk: mix(from.trunk, to.trunk),
    skyTop: mix(from.skyTop, to.skyTop),
    skyLow: mix(from.skyLow, to.skyLow),
    moon: mix(from.moon, to.moon),
    particles: amount < 0.5 ? from.particles : to.particles,
  }
}

function seasonName(index: number): SeasonName {
  return ORDER[((index % ORDER.length) + ORDER.length) % ORDER.length] ?? ORDER[0]
}

export function seasonAt(epochMs: number): Season {
  const index = Math.floor(epochMs / SEASON_MS)
  const intoSeasonMs = epochMs - index * SEASON_MS
  const name = seasonName(index)
  const previous = seasonName(index - 1)
  const target = SEASON_PALETTES[name]
  const palette =
    intoSeasonMs < BLEND_MS
      ? blendPalettes({ from: SEASON_PALETTES[previous], to: target, amount: intoSeasonMs / BLEND_MS })
      : target
  return {
    name,
    label: LABELS[name],
    progress: intoSeasonMs / SEASON_MS,
    particle: PARTICLES[name],
    palette,
  }
}

export function nextSeasonIn(epochMs: number): { name: SeasonName; label: string; remainingMs: number } {
  const index = Math.floor(epochMs / SEASON_MS)
  const name = seasonName(index + 1)
  return { name, label: LABELS[name], remainingMs: (index + 1) * SEASON_MS - epochMs }
}

export function startOfSeason(options: { name: SeasonName; cycle?: number }): number {
  return (ORDER.indexOf(options.name) + (options.cycle ?? 0) * ORDER.length) * SEASON_MS
}
