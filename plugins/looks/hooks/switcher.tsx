import type { CommandRunInput, CommandRunResult, EngineInterface, On } from 'claude-code'

import { baseLine, labelOf, themePreview } from './looks/preview'
import { activeChoice, baseThemeInfo, currentTone, highlightedChoice, looksSettings, SAVED_BASE_KEY, setActiveChoice, setBaseThemeInfo, setHighlighted, setProjectRoot, setTone, setVerbose } from './looks/state'
import { baseThemeFor, THEME_CHOICES, themeChoiceFrom, themeOf, toneOf } from './looks/themes'
import type { ThemeChoice } from './looks/themes'
import { noop } from './shared/noop'

const PICKER_PANE = 'looks-theme'
const PICKER_ROWS = 15
const THEME_KEY = 'theme'
const THEME_SETTING_KEY = 'themeSetting'
const BASE_ARGUMENT = 'base'
const ALIASES: Readonly<Record<string, ThemeChoice>> = { crt: 'retro', paper: 'zen', none: 'off' }
const USAGE = 'Use /theme retro, punk, synthwave, zen, or off. /theme alone opens the picker, and /theme base opens the Claude Code base themes.'

async function configValue($: EngineInterface, options: { key: string }): Promise<unknown> {
  const rows = await $.config.list().catch(() => [])
  return rows.find(row => row.key === options.key)?.value
}

async function baseThemeNow($: EngineInterface): Promise<string | undefined> {
  const value = await configValue($, { key: 'theme' })
  return typeof value === 'string' ? value : undefined
}

async function applyBase($: EngineInterface, options: { choice: ThemeChoice }): Promise<string> {
  const current = await baseThemeNow($)
  if (current === undefined) {
    return 'The base theme is not available here, so it stays as it is.'
  }
  const stored = await $.store.get(SAVED_BASE_KEY)
  const saved = typeof stored === 'string' ? stored : current
  await $.store.set(SAVED_BASE_KEY, saved)
  setTone(toneOf(saved))
  const target = baseThemeFor({ choice: options.choice, saved })
  if (target === undefined || target === current) {
    setBaseThemeInfo({ current, saved })
    return `The base theme stays ${current}.`
  }
  const result = await $.config.set({ key: 'theme', value: target })
  if (result.deny !== undefined) {
    setBaseThemeInfo({ current, saved })
    return `The base theme stays ${current}: ${result.deny}`
  }
  setBaseThemeInfo({ current: target, saved })
  return `Base theme ${target}; /theme off restores ${saved}.`
}

async function restoreBase($: EngineInterface, options: { isForgotten: boolean }): Promise<string> {
  const stored = await $.store.get(SAVED_BASE_KEY)
  if (typeof stored !== 'string') {
    return ''
  }
  if ((await baseThemeNow($)) !== stored) {
    await $.config.set({ key: 'theme', value: stored })
  }
  setBaseThemeInfo({ current: stored, saved: options.isForgotten ? undefined : stored })
  if (options.isForgotten) {
    await $.store.delete(SAVED_BASE_KEY)
  }
  return `Base theme restored to ${stored}.`
}

async function leaveBase($: EngineInterface): Promise<void> {
  const { current, saved } = baseThemeInfo()
  if (activeChoice() === 'off' || saved === undefined || current === saved) {
    return
  }
  const result = await $.config.set({ key: 'theme', value: saved }).catch(noop)
  if (result?.value !== undefined) {
    setBaseThemeInfo({ current: saved, saved })
  }
}

async function switchTheme($: EngineInterface, options: { choice: ThemeChoice }): Promise<string> {
  setActiveChoice(options.choice)
  await $.store.set(THEME_KEY, options.choice)
  await $.store.set(THEME_SETTING_KEY, looksSettings().theme)
  $.ui.invalidate('ui.render')
  const message = options.choice === 'off'
    ? `Looks theme off. ${await restoreBase($, { isForgotten: true })}`.trim()
    : `Looks theme: ${labelOf(options.choice)}. ${await applyBase($, { choice: options.choice })}`
  $.ui.invalidate('ui.render')
  return message
}

async function runThemeCommand($: EngineInterface, options: { e: CommandRunInput; next: (e: CommandRunInput) => Promise<CommandRunResult> }): Promise<CommandRunResult> {
  const action = options.e.args.trim().toLowerCase()
  if (action === BASE_ARGUMENT && options.e.command === 'theme') {
    return options.next({ ...options.e, args: '' })
  }
  if (action === '') {
    setHighlighted(activeChoice() === 'off' ? 'retro' : activeChoice())
    $.ui.invalidate('ui.render')
    const opened = await $.ui.open({ id: PICKER_PANE, title: 'Theme', focus: true, closeOnEscape: true, rows: PICKER_ROWS })
    return { text: opened.isPlaced ? 'Theme picker open: press a letter to apply a theme, Esc to close.' : `Widen the terminal to see the theme picker. ${USAGE}` }
  }
  const choice = themeChoiceFrom(ALIASES[action] ?? action)
  if (!choice) {
    return { text: USAGE }
  }
  return { text: await switchTheme($, { choice }) }
}

export function installSwitcher(on: On): void {
  on('session.start', async ($, e, next) => {
    setProjectRoot(e.cwd)
    await $.command.register({
      name: 'looks',
      description: 'Looks: pick a theme. retro, punk, synthwave, zen, or off switches at once. /theme does the same.',
      argumentHint: '[retro|punk|synthwave|zen|off]',
      immediate: true,
    }).catch(noop)
    setVerbose((await configValue($, { key: 'verbose' })) === true)
    const stored = themeChoiceFrom(await $.store.get(THEME_KEY))
    const isStoredCurrent = (await $.store.get(THEME_SETTING_KEY)) === looksSettings().theme
    const choice = stored !== undefined && isStoredCurrent ? stored : looksSettings().theme
    setActiveChoice(choice)
    if (!e.isInteractive) {
      return next(e)
    }
    if (choice === 'off') {
      await restoreBase($, { isForgotten: true })
      const current = await baseThemeNow($)
      setTone(toneOf(current))
      setBaseThemeInfo({ current })
    } else {
      await applyBase($, { choice })
    }
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('command.run', { command: 'exit' }, async ($, e, next) => {
    await leaveBase($)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await leaveBase($)
    return next(e)
  })

  on('command.run', { command: 'theme' }, async ($, e, next) => runThemeCommand($, { e, next }))

  on('command.run', { command: 'looks' }, async ($, e, next) => runThemeCommand($, { e, next }))

  on('ui.focus', { component: 'Pane', requestId: PICKER_PANE }, async ($, e, next) => {
    const result = await next(e)
    const choice = themeChoiceFrom(e.element?.replace(/^theme-/, ''))
    if (choice && setHighlighted(choice)) {
      $.ui.invalidate('ui.render')
    }
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PICKER_PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const active = activeChoice()
    return (
      <Box flexDirection="column">
        <Text dimColor>Press a letter to apply a theme. Tab moves between themes and shows a preview. Esc closes the picker.</Text>
        <Box flexDirection="row" columnGap={3} marginY={1} flexWrap="wrap">
          {THEME_CHOICES.map(choice => (
            <Button
              key={`theme-${choice}`}
              plain
              hotkey={themeOf(choice)?.hotkey ?? 'o'}
              label={choice === active ? `${labelOf(choice)} (on)` : labelOf(choice)}
              autoFocus={choice === active || undefined}
              onPress={() => {
                setHighlighted(choice)
                switchTheme($, { choice }).then(message => $.ui.toast(message)).catch(noop)
              }}
            />
          ))}
          <Button
            key="base-themes"
            plain
            hotkey="b"
            label="Base themes"
            dimColor
            onPress={() => {
              $.command.run({ command: 'theme', args: '' }).catch(noop)
            }}
          />
        </Box>
        {themePreview({ Box, Text, choice: highlightedChoice(), tone: currentTone() })}
        <Text dimColor>{baseLine({ choice: active, ...baseThemeInfo() })}</Text>
      </Box>
    )
  })
}
