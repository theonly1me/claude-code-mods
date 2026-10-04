import { expect, test } from 'claude-code/testing'

import { baseThemeFor } from '../hooks/looks/themes'
import { engine, runTheme, start, VIEWPORT } from './engine'

const PICKER = {
  plugin: 'looks',
  surface: 'terminal',
  component: 'Pane',
  requestId: 'looks-theme',
  viewport: VIEWPORT,
  props: { title: 'Theme', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 14 }, view: {} },
} as const

test('each theme picks a matching base theme in the same tone', () => {
  expect(baseThemeFor({ choice: 'retro', saved: 'dark-daltonized' })).toBe('dark-ansi')
  expect(baseThemeFor({ choice: 'punk', saved: 'dark-daltonized' })).toBe('dark')
  expect(baseThemeFor({ choice: 'zen', saved: 'light' })).toBe('light-daltonized')
  expect(baseThemeFor({ choice: 'synthwave', saved: 'auto' })).toBeUndefined()
  expect(baseThemeFor({ choice: 'off', saved: 'light-ansi' })).toBe('light-ansi')
})

test('/theme punk switches the base theme and /theme off restores the saved one', async ($, on) => {
  const recorder = engine({ on })
  await start($)
  expect(await runTheme({ $, args: 'punk' })).toBe('Looks theme: Punk. Base theme dark; /theme off restores dark-daltonized.')
  expect(recorder.sets).toEqual(['dark'])
  await runTheme({ $, args: 'retro' })
  expect(recorder.sets).toEqual(['dark', 'dark-ansi'])
  expect(await runTheme({ $, args: 'off' })).toBe('Looks theme off. Base theme restored to dark-daltonized.')
  expect(recorder.baseTheme).toBe('dark-daltonized')
  expect(await runTheme({ $, args: 'plaid' })).toMatch(/Use \/theme retro, punk, synthwave, zen, or off/)
})

test('a saved theme comes back next session and the session end restores the base', async ($, on) => {
  const recorder = engine({ on, store: { theme: 'retro', themeSetting: 'off', savedBaseTheme: 'light' }, baseTheme: 'light' })
  on('session.end', ($, event) => ({ sessionId: event.sessionId }))
  await start($)
  expect(recorder.sets).toEqual(['light-ansi'])
  await $.session.end({ reason: 'prompt_input_exit', sessionId: 's1', resume: { id: 's1' } })
  expect(recorder.sets).toEqual(['light-ansi', 'light'])
})

test('a base theme the person picks while a theme is on becomes the one to restore', async ($, on) => {
  const recorder = engine({ on })
  await start($)
  await runTheme({ $, args: 'zen' })
  expect(recorder.baseTheme).toBe('dark-daltonized')
  await $.config.set({ key: 'theme', value: 'light', previous: 'dark-daltonized', provider: { plugin: 'engine', tier: 'core' }, origin: { kind: 'composer' } })
  await runTheme({ $, args: 'off' })
  expect(recorder.baseTheme).toBe('light')
})

test('the picker opens focused, previews the highlighted theme, and applies a pressed one', async ($, on) => {
  const recorder = engine({ on })
  await start($)
  expect(await runTheme({ $, args: '' })).toMatch(/Theme picker open/)
  expect(recorder.opened).toEqual(['looks-theme'])
  const pane = await $.ui.mount(PICKER)
  expect(await pane.find({ type: 'Text', text: /Press a letter to apply a theme/ })).toBeDefined()
  expect((await pane.findAll({ type: 'Button' })).length).toBe(6)
  expect(await pane.find({ type: 'Text', text: 'Preview: Retro CRT' })).toBeDefined()

  await pane.press({ key: 'theme-synthwave' })
  expect(recorder.sets).toEqual(['dark'])
  expect(recorder.toasts.at(-1)).toMatch(/Looks theme: Synthwave/)
  expect(await pane.find({ type: 'Button', text: 'Synthwave (on)' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'Preview: Synthwave' })).toBeDefined()
})

test('the built-in /theme takes Looks themes, and /theme base reaches the built-in picker', async ($, on) => {
  on('command.run', { command: 'theme' }, () => ({ text: 'built-in theme picker' }))
  const recorder = engine({ on })
  await start($)
  const command = { command: 'theme', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const
  expect((await $.command.run({ ...command, args: 'synthwave' })).text).toMatch(/Looks theme: Synthwave/)
  expect(recorder.sets).toEqual(['dark'])
  expect((await $.command.run({ ...command, args: 'base' })).text).toBe('built-in theme picker')
})

test('/exit puts the base theme back before the session closes', async ($, on) => {
  on('command.run', { command: 'exit' }, () => ({ text: 'bye' }))
  const recorder = engine({ on })
  await start($)
  await runTheme({ $, args: 'retro' })
  const command = { command: 'exit', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const
  expect((await $.command.run(command)).text).toBe('bye')
  expect(recorder.sets).toEqual(['dark-ansi', 'dark-daltonized'])
})
