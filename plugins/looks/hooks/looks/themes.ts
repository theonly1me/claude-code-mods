export type ThemeName = 'retro' | 'punk' | 'synthwave' | 'zen'
export type ThemeChoice = ThemeName | 'off'
export type Tone = 'dark' | 'light'

export type Palette = {
  accent: string
  secondary: string
  muted: string
  promptText: string
  added: string
  removed: string
  failed: string
}

export type Theme = {
  name: ThemeName
  label: string
  hotkey: string
  promptMark: string
  toolMark: string
  baseVariant: '' | '-ansi' | '-daltonized'
  spinnerWords: readonly string[]
  spinnerSuffix: string
  doneWords: readonly string[]
  palettes: Record<Tone, Palette>
}

export const THEME_NAMES: readonly ThemeName[] = ['retro', 'punk', 'synthwave', 'zen']
export const THEME_CHOICES: readonly ThemeChoice[] = [...THEME_NAMES, 'off']

const NEUTRAL: Palette = {
  accent: 'green',
  secondary: 'white',
  muted: 'gray',
  promptText: 'white',
  added: 'green',
  removed: 'red',
  failed: 'red',
}

export const THEMES: Record<ThemeName, Theme> = {
  retro: {
    name: 'retro',
    label: 'Retro CRT',
    hotkey: 'r',
    promptMark: 'C:\\>',
    toolMark: '>',
    baseVariant: '-ansi',
    spinnerWords: ['PROCESSING', 'COMPUTING', 'LOADING', 'COMPILING', 'BOOTING', 'DIALING UP'],
    spinnerSuffix: ' \u2588',
    doneWords: ['Computed', 'Processed', 'Compiled', 'Booted'],
    palettes: {
      dark: { accent: '#39ff7a', secondary: '#ffb000', muted: '#2f8f4e', promptText: '#9dffb8', added: '#39ff7a', removed: '#ff6b4a', failed: '#ff6b4a' },
      light: { accent: '#0f8a3c', secondary: '#a35f00', muted: '#4d7a5c', promptText: '#0b6b2e', added: '#0f8a3c', removed: '#c2410c', failed: '#c2410c' },
    },
  },
  punk: {
    name: 'punk',
    label: 'Punk',
    hotkey: 'p',
    promptMark: '\u2716',
    toolMark: '\u2716',
    baseVariant: '',
    spinnerWords: ['SHREDDING', 'SMASHING', 'RIOTING', 'THRASHING', 'MOSHING', 'SCREAMING'],
    spinnerSuffix: ' !!',
    doneWords: ['Smashed', 'Shredded', 'Thrashed', 'Wrecked'],
    palettes: {
      dark: { accent: '#ff2e88', secondary: '#f5ff3b', muted: '#a8326a', promptText: '#ffffff', added: '#c6ff00', removed: '#ff2e88', failed: '#ff3b30' },
      light: { accent: '#d6006b', secondary: '#7a5c00', muted: '#8a2252', promptText: '#111111', added: '#4d7c0f', removed: '#d6006b', failed: '#c1121f' },
    },
  },
  synthwave: {
    name: 'synthwave',
    label: 'Synthwave',
    hotkey: 's',
    promptMark: '\u25b6',
    toolMark: '\u25c6',
    baseVariant: '',
    spinnerWords: ['CRUISING', 'DRIFTING', 'GLOWING', 'RIDING THE GRID', 'CHASING THE SUNSET', 'NEON DREAMING'],
    spinnerSuffix: ' ~',
    doneWords: ['Cruised', 'Drifted', 'Glowed', 'Arrived'],
    palettes: {
      dark: { accent: '#ff4fd8', secondary: '#2de2e6', muted: '#7b5cff', promptText: '#9ef6ff', added: '#2de2e6', removed: '#ff8f40', failed: '#ff5c8a' },
      light: { accent: '#c2189f', secondary: '#0b7f86', muted: '#5b3fd6', promptText: '#0b6b72', added: '#0b7f86', removed: '#c25a00', failed: '#c2185b' },
    },
  },
  zen: {
    name: 'zen',
    label: 'Zen paper',
    hotkey: 'z',
    promptMark: '\u25cb',
    toolMark: '\u00b7',
    baseVariant: '-daltonized',
    spinnerWords: ['breathing', 'listening', 'raking the sand', 'sitting', 'brewing tea', 'watching the pond'],
    spinnerSuffix: '\u2026',
    doneWords: ['Breathed', 'Sat', 'Listened', 'Settled'],
    palettes: {
      dark: { accent: '#d8cfc0', secondary: '#a3b18a', muted: '#8a8378', promptText: '#e8e1d5', added: '#a3b18a', removed: '#c98b7a', failed: '#c98b7a' },
      light: { accent: '#5c554b', secondary: '#55704a', muted: '#9a9286', promptText: '#3d3a35', added: '#55704a', removed: '#9c4a3a', failed: '#9c4a3a' },
    },
  },
}

export function themeChoiceFrom(value: unknown): ThemeChoice | undefined {
  return THEME_CHOICES.find(choice => choice === value)
}

export function themeOf(choice: ThemeChoice): Theme | undefined {
  return choice === 'off' ? undefined : THEMES[choice]
}

export function paletteOf(options: { choice: ThemeChoice; tone: Tone }): Palette {
  return themeOf(options.choice)?.palettes[options.tone] ?? NEUTRAL
}

export function toneOf(baseTheme: string | undefined): Tone {
  return baseTheme?.startsWith('light') ? 'light' : 'dark'
}

export function baseThemeFor(options: { choice: ThemeChoice; saved: string }): string | undefined {
  const theme = themeOf(options.choice)
  if (!theme) {
    return options.saved
  }
  if (!options.saved.startsWith('dark') && !options.saved.startsWith('light')) {
    return undefined
  }
  return `${toneOf(options.saved)}${theme.baseVariant}`
}

function hashOf(text: string): number {
  return Array.from(text).reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 100003, 7)
}

export function pickWord(options: { words: readonly string[]; seed: string }): string {
  return options.words[hashOf(options.seed) % options.words.length] ?? options.seed
}
