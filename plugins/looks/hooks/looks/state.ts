import { paletteOf, themeChoiceFrom, themeOf } from './themes'
import type { Palette, Theme, ThemeChoice, Tone } from './themes'

export type ToolCallsMode = 'compact' | 'full' | 'plain'
export type ToolView = 'compact' | 'tidy' | 'plain'
export type LayoutMode = 'centered' | 'left'

export type LooksSettings = {
  theme: ThemeChoice
  toolCalls: ToolCallsMode
  layout: LayoutMode
  readingWidth: number
  themeWords: boolean
}

export const SAVED_BASE_KEY = 'savedBaseTheme'
const MIN_READING_WIDTH = 40
const DEFAULT_READING_WIDTH = 100
const RESULT_LINES = 6
const VERBOSE_RESULT_LINES = 30

let settings: LooksSettings = { theme: 'off', toolCalls: 'full', layout: 'left', readingWidth: DEFAULT_READING_WIDTH, themeWords: false }
let activeTheme: ThemeChoice = 'off'
let highlighted: ThemeChoice = 'retro'
let tone: Tone = 'dark'
let isTranscriptExpanded = false
let isVerbose = false
let projectRoot = ''
let baseInfo: { current?: string; saved?: string } = {}

export function settingsFrom(options: Readonly<Record<string, unknown>>): LooksSettings {
  const width = Number(options.readingWidth)
  return {
    theme: themeChoiceFrom(options.theme) ?? 'off',
    toolCalls: options.toolCalls === 'compact' || options.toolCalls === 'plain' ? options.toolCalls : 'full',
    layout: options.layout === 'centered' ? 'centered' : 'left',
    readingWidth: Number.isFinite(width) ? Math.max(MIN_READING_WIDTH, Math.round(width)) : DEFAULT_READING_WIDTH,
    themeWords: options.themeWords === true,
  }
}

export function configureLooks(next: LooksSettings): void {
  settings = next
  activeTheme = next.theme
  highlighted = next.theme === 'off' ? 'retro' : next.theme
  isTranscriptExpanded = false
}

export function looksSettings(): LooksSettings {
  return settings
}

export function activeChoice(): ThemeChoice {
  return activeTheme
}

export function currentTheme(): Theme | undefined {
  return themeOf(activeTheme)
}

export function setActiveChoice(choice: ThemeChoice): void {
  activeTheme = choice
  highlighted = choice
}

export function highlightedChoice(): ThemeChoice {
  return highlighted
}

export function setHighlighted(choice: ThemeChoice): boolean {
  const isChanged = highlighted !== choice
  highlighted = choice
  return isChanged
}

export function currentTone(): Tone {
  return tone
}

export function setTone(next: Tone): void {
  tone = next
}

export function palette(): Palette {
  return paletteOf({ choice: activeTheme, tone })
}

export function noteTranscriptExpanded(isExpanded: boolean): boolean {
  const isChanged = isTranscriptExpanded !== isExpanded
  isTranscriptExpanded = isExpanded
  return isChanged
}

export function setVerbose(next: boolean): void {
  isVerbose = next
}

export function toolView(): ToolView {
  if (!isVerbose && isTranscriptExpanded) {
    return 'plain'
  }
  return settings.toolCalls === 'compact' ? 'compact' : settings.toolCalls === 'full' ? 'tidy' : 'plain'
}

export function isCompactView(): boolean {
  return toolView() === 'compact'
}

export function resultLimit(): number {
  return isVerbose ? VERBOSE_RESULT_LINES : RESULT_LINES
}

export function isGroupUnfolded(isExpanded: boolean): boolean {
  return isExpanded && !isVerbose
}

export function baseThemeInfo(): { current?: string; saved?: string } {
  return baseInfo
}

export function setBaseThemeInfo(next: { current?: string; saved?: string }): void {
  baseInfo = next
}

export function isThemeWords(): boolean {
  return settings.themeWords
}

export function isCentered(): boolean {
  return settings.layout === 'centered'
}

export function isStyled(): boolean {
  return activeTheme !== 'off'
}

export function setProjectRoot(root: string): void {
  projectRoot = root
}

export function displayPath(path: string): string {
  if (projectRoot !== '' && path.startsWith(`${projectRoot}/`)) {
    return path.slice(projectRoot.length + 1)
  }
  return path
}
