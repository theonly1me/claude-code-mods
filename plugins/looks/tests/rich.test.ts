import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { engine, runTheme, SETTLED, start, VIEWPORT } from './engine'

const LOOKS = [
  { args: 'synthwave', border: 'round', borderColor: '#ff4fd8', user: 'YOU' },
  { args: 'retro', border: 'double', borderColor: '#39ff7a', user: 'USER' },
  { args: 'punk', border: 'bold', borderColor: '#ff2e88', user: 'YOU' },
  { args: 'zen', border: 'single', borderColor: '#8a8378', user: 'you' },
] as const

const BAND = { hasSurvey: false, isWorking: true, maxRows: 30, bodyColumns: 120, scroll: { offset: 0, bodyRows: 30 }, view: {} } as const

async function reply(options: { $: Engine; id: string }) {
  return options.$.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'AssistantMessage',
    requestId: options.id,
    viewport: VIEWPORT,
    props: { text: 'The tests pass.', isFirstOfReply: true },
  })
}

test('each theme frames replies in its own border, color, and name tag', async ($, on) => {
  engine({ on })
  await start($)
  for (const entry of LOOKS) {
    await runTheme({ $, args: entry.args })
    const mounted = await reply({ $, id: `r-${entry.args}` })
    const boxes = await mounted.findAll({ type: 'Box' })
    const panel = boxes.find(box => box.props.borderStyle === entry.border)
    expect(panel?.props.borderColor).toBe(entry.borderColor)
    expect(panel?.props.backgroundColor).toBeDefined()
    expect(await mounted.find({ type: 'Markdown', text: 'The tests pass.' })).toBeDefined()
    expect(await mounted.find({ type: 'Text', text: /CLAUDE|claude/ })).toBeDefined()
  }
})

test('your prompt gets a name tag instead of a plain mark', async ($, on) => {
  engine({ on })
  await start($)
  for (const entry of LOOKS) {
    await runTheme({ $, args: entry.args })
    const prompt = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'UserMessage', requestId: `u-${entry.args}`, props: { text: 'fix the cart', origin: { kind: 'composer' }, isExpanded: false } })
    expect(await prompt.find({ type: 'Text', text: ` ${entry.user} ` })).toBeDefined()
    expect(await prompt.find({ type: 'Text', text: 'fix the cart' })).toBeDefined()
  }
})

test('the turn footer becomes a themed divider that keeps the word and the time', async ($, on) => {
  engine({ on })
  await start($)
  await runTheme({ $, args: 'punk' })
  const footer = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'TurnDuration', requestId: 'd1', viewport: VIEWPORT, props: { word: 'Baked', durationMs: 65000 } })
  expect(await footer.find({ type: 'Text', text: ' Baked for 1m 5s ' })).toBeDefined()
})

test('tool names become colored tags and result bars take the theme glyph', async ($, on) => {
  engine({ on })
  await start($)
  await runTheme({ $, args: 'retro' })
  const use = await $.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'ToolUse',
    requestId: 'u1',
    props: { ...SETTLED, tool_use_id: 'u1', tool: 'Bash', input: { command: 'npm test' }, output: { stdout: 'ok', stderr: '' } },
  })
  expect(await use.find({ type: 'Text', text: ' Run ' })).toBeDefined()
  const result = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'ToolResult', requestId: 'r1', props: { tool_use_id: 'r1', tool: 'Bash', output: { stdout: 'ok', stderr: '' }, isErrored: false } })
  expect(await result.find({ type: 'Text', text: '║ ' })).toBeDefined()
})

test('a pixel scene draws above the prompt while a theme is on, and only then', async ($, on) => {
  engine({ on })
  await start($)
  const off = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect((await off.findAll({ type: 'Raster' })).length).toBe(0)
  await runTheme({ $, args: 'synthwave' })
  const band = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  const raster = await band.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('looks:scene')
  expect(raster?.props.rows).toBe(6)
  const survey = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, hasSurvey: true } })
  expect((await survey.findAll({ type: 'Raster' })).length).toBe(0)
})

test('with themeStyle simple a theme only recolors text', { options: { themeStyle: 'simple' } }, async ($, on) => {
  engine({ on })
  await start($)
  await runTheme({ $, args: 'synthwave' })
  const band = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect((await band.findAll({ type: 'Raster' })).length).toBe(0)
  const mounted = await reply({ $, id: 'simple' })
  const boxes = await mounted.findAll({ type: 'Box' })
  expect(boxes.some(box => box.props.borderStyle !== undefined)).toBe(false)
})
