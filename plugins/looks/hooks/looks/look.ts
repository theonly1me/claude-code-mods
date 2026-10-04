import type { ThemeName, Tone } from './themes'

export type Look = {
  name: ThemeName
  border: string
  borderColor: string
  panel: string
  chipBackground: string
  chipText: string
  bar: string
  userLabel: string
  replyLabel: string
  divider: { pattern: string; from: string; to: string }
}

type Variant = Omit<Look, 'name' | 'border' | 'bar' | 'userLabel' | 'replyLabel' | 'divider'> & { divider: { from: string; to: string } }
type Shape = Pick<Look, 'border' | 'bar' | 'userLabel' | 'replyLabel'> & { pattern: string }

const SHAPES: Record<ThemeName, Shape> = {
  retro: { border: 'double', bar: '║', userLabel: 'USER', replyLabel: 'CLAUDE', pattern: '═' },
  punk: { border: 'bold', bar: '┃', userLabel: 'YOU', replyLabel: 'CLAUDE', pattern: '/\\' },
  synthwave: { border: 'round', bar: '▌', userLabel: 'YOU', replyLabel: 'CLAUDE', pattern: '▀' },
  zen: { border: 'single', bar: '│', userLabel: 'you', replyLabel: 'claude', pattern: '· ' },
}

const VARIANTS: Record<ThemeName, Record<Tone, Variant>> = {
  retro: {
    dark: { borderColor: '#39ff7a', panel: '#04120a', chipBackground: '#39ff7a', chipText: '#04120a', divider: { from: '#39ff7a', to: '#1c6b38' } },
    light: { borderColor: '#0f8a3c', panel: '#e3f4e8', chipBackground: '#0f8a3c', chipText: '#ffffff', divider: { from: '#0f8a3c', to: '#8fc9a2' } },
  },
  punk: {
    dark: { borderColor: '#ff2e88', panel: '#16040f', chipBackground: '#f5ff3b', chipText: '#16040f', divider: { from: '#ff2e88', to: '#f5ff3b' } },
    light: { borderColor: '#d6006b', panel: '#fde4f0', chipBackground: '#d6006b', chipText: '#ffffff', divider: { from: '#d6006b', to: '#b89500' } },
  },
  synthwave: {
    dark: { borderColor: '#ff4fd8', panel: '#150a2e', chipBackground: '#ff4fd8', chipText: '#1a0733', divider: { from: '#ff4fd8', to: '#2de2e6' } },
    light: { borderColor: '#c2189f', panel: '#f1e6ff', chipBackground: '#c2189f', chipText: '#ffffff', divider: { from: '#c2189f', to: '#0b7f86' } },
  },
  zen: {
    dark: { borderColor: '#8a8378', panel: '#1b1a16', chipBackground: '#a3b18a', chipText: '#14130f', divider: { from: '#a3b18a', to: '#4a463f' } },
    light: { borderColor: '#9a9286', panel: '#f4eddc', chipBackground: '#55704a', chipText: '#f4eddc', divider: { from: '#55704a', to: '#c9c0ac' } },
  },
}

export function lookOf(options: { name: ThemeName; tone: Tone }): Look {
  const shape = SHAPES[options.name]
  const variant = VARIANTS[options.name][options.tone]
  return { ...variant, ...shape, name: options.name, divider: { pattern: shape.pattern, ...variant.divider } }
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function mixHex(options: { from: string; to: string; amount: number }): string {
  const [fromRed, fromGreen, fromBlue] = channels(options.from)
  const [toRed, toGreen, toBlue] = channels(options.to)
  const blend = (start: number, end: number): string => Math.round(start + (end - start) * options.amount).toString(16).padStart(2, '0')
  return `#${blend(fromRed, toRed)}${blend(fromGreen, toGreen)}${blend(fromBlue, toBlue)}`
}
