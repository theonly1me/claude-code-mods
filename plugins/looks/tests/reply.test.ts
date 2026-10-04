import { expect, test } from 'claude-code/testing'

import { engine, runTheme, start, VIEWPORT } from './engine'

const THEME_ROWS = [
  { args: 'retro', mark: 'C:\\> ', words: /PROCESSING|COMPUTING|LOADING|COMPILING|BOOTING|DIALING UP/, suffix: ' \u2588' },
  { args: 'punk', mark: '\u2716 ', words: /SHREDDING|SMASHING|RIOTING|THRASHING|MOSHING|SCREAMING/, suffix: ' !!' },
  { args: 'synthwave', mark: '\u25b6 ', words: /CRUISING|DRIFTING|GLOWING|RIDING THE GRID|CHASING THE SUNSET|NEON DREAMING/, suffix: ' ~' },
  { args: 'zen', mark: '\u25cb ', words: /breathing|listening|raking the sand|sitting|brewing tea|watching the pond/, suffix: '\u2026' },
] as const

test('replies are drawn as markdown in a centered reading column', { options: { layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  const reply = await $.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'AssistantMessage',
    requestId: 'r1',
    viewport: VIEWPORT,
    props: { text: 'The **tests** pass now.', isFirstOfReply: true },
  })
  expect(await reply.drawn()).toMatchObject({ type: 'Box', props: { paddingLeft: 30 } })
  expect(await reply.find({ type: 'Markdown', text: 'The **tests** pass now.' })).toBeDefined()
  expect(await reply.find({ type: 'Text', text: '\u23fa' })).toBeDefined()
  expect(await reply.find({ text: 'engine row' })).toBeUndefined()
})

test('the defaults keep the engine reply at the left edge', async ($, on) => {
  engine({ on })
  await start($)
  const reply = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'AssistantMessage', requestId: 'r2', props: { text: 'Done.', isFirstOfReply: true } })
  expect(await reply.find({ text: 'engine row' })).toBeDefined()
})

test('each theme redraws the prompt row, the spinner, the turn footer, and the hint tail', async ($, on) => {
  const seen: { word: string; suffix: string; tail: string; done: string }[] = []
  on('ui.render', { component: 'Spinner' }, ($, event) => {
    seen.push({ word: event.props.word, suffix: event.props.suffix, tail: '', done: '' })
    return $.ui.resolve(event).Text({ children: [event.props.word] })
  })
  on('ui.render', { component: 'PromptHint' }, ($, event) => {
    seen.push({ word: '', suffix: '', tail: event.props.tail ?? '', done: '' })
    return $.ui.resolve(event).Text({ children: [event.props.hint] })
  })
  on('ui.render', { component: 'TurnDuration' }, ($, event) => {
    seen.push({ word: '', suffix: '', tail: '', done: event.props.word })
    return $.ui.resolve(event).Text({ children: [event.props.word] })
  })
  engine({ on })
  await start($)
  for (const entry of THEME_ROWS) {
    seen.length = 0
    await runTheme({ $, args: entry.args })
    const prompt = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'UserMessage', requestId: `p-${entry.args}`, props: { text: 'fix the cart', origin: { kind: 'composer' }, isExpanded: false } })
    expect(await prompt.find({ type: 'Text', text: entry.mark })).toBeDefined()
    expect(await prompt.find({ type: 'Text', text: 'fix the cart' })).toBeDefined()
    await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'Spinner', requestId: `s-${entry.args}`, props: { word: 'Sauteing', message: null, suffix: '\u2026', mode: 'responding' } })
    await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'PromptHint', requestId: `h-${entry.args}`, props: { isDraft: false, isWorking: false, hint: '? for shortcuts' } })
    await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'TurnDuration', requestId: `d-${entry.args}`, props: { word: 'Baked', durationMs: 3000 } })
    const [spinner, hint, footer] = seen
    expect(spinner?.word).toMatch(entry.words)
    expect(spinner?.suffix).toBe(entry.suffix)
    expect(hint?.tail).toMatch(/Retro CRT|Punk|Synthwave|Zen paper/)
    expect(footer?.done).not.toBe('Baked')
  }
})

test('with the theme off the spinner and the footer keep their own words', async ($, on) => {
  const words: string[] = []
  on('ui.render', { component: 'Spinner' }, ($, event) => {
    words.push(event.props.word)
    return $.ui.resolve(event).Text({ children: [event.props.word] })
  })
  engine({ on })
  await start($)
  await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'Spinner', requestId: 's0', props: { word: 'Sauteing', message: null, suffix: '\u2026', mode: 'responding' } })
  expect(words).toEqual(['Sauteing'])
})
