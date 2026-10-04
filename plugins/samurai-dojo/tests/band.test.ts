import { expect, mock, test } from 'claude-code/testing'

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 40,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
}
const COMMAND = {
  command: 'dojo',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const

test('the dojo shows at start, stacks above what is beneath, and hides on /dojo', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  const terminal = await $.ui.mount({
    plugin: 'samurai-dojo',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: BAND_PROPS,
  })
  const raster = await terminal.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('samurai-dojo:stage')
  expect(raster?.props.columns).toBe(72)
  expect(raster?.props.rows).toBe(8)

  const result = await $.command.run(COMMAND)
  expect(result.text).toContain('The dojo is closed.')
  expect((await terminal.findAll({ type: 'Raster' })).length).toBe(0)
})

test('the dojo yields to surveys and narrow bands, and summarizes on desktop', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  const survey = await $.ui.mount({
    plugin: 'samurai-dojo',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { ...BAND_PROPS, hasSurvey: true },
  })
  expect((await survey.findAll({ type: 'Raster' })).length).toBe(0)

  const narrow = await $.ui.mount({
    plugin: 'samurai-dojo',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { ...BAND_PROPS, bodyColumns: 30 },
  })
  expect((await narrow.findAll({ type: 'Raster' })).length).toBe(0)

  const desktop = await $.ui.mount({
    plugin: 'samurai-dojo',
    surface: 'desktop',
    component: 'AbovePrompt',
    props: BAND_PROPS,
  })
  expect(await desktop.find({ type: 'Text', text: /samurai dojo · Ronin/ })).toBeDefined()
})

test('tool calls become kills on top of the stored lifetime count', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on, { lifetimeKills: 40 })
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('tool.call', () => ({ result: 'ok' }))
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  await $.tool.call({ tool: 'Read', tool_use_id: 'one', file_path: '/demo/a.ts' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'two', file_path: '/demo/b.ts' })
  await clock.advance(6000)
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })

  const result = await $.command.run(COMMAND)
  expect(result.text).toContain('2 slain this session · 42 lifetime')
})
