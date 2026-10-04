import { expect, test } from 'claude-code/testing'

import { ACTIVE_PATH, COMMAND, DOCK_PROPS, engine } from './engine'

test('the night stays hidden until /feast, which opens the pane and remembers it', async ($, on) => {
  const { recorder } = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(recorder.panes.size).toBe(0)

  const opened = await $.command.run(COMMAND)
  expect(opened.text).toContain('Night Feast is on.')
  expect(recorder.panes.has('night-feast')).toBe(true)
  expect(recorder.files.get(ACTIVE_PATH)).toBe('night-feast')

  const closed = await $.command.run(COMMAND)
  expect(closed.text).toContain('Night Feast is off.')
  expect(recorder.panes.has('night-feast')).toBe(false)
  expect(recorder.files.get(ACTIVE_PATH)).toBe('')
})

test('an enabled night comes back at session start and draws the scene with its log in the dock', async ($, on) => {
  const { recorder, clock } = engine({ on, files: { [ACTIVE_PATH]: 'night-feast\n' } })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(recorder.panes.has('night-feast')).toBe(true)
  await clock.advance(9000)

  const pane = await $.ui.mount({ plugin: 'night-feast', surface: 'terminal', component: 'Pane', requestId: 'night-feast', props: DOCK_PROPS })
  const raster = await pane.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('night-feast:stage')
  expect(raster?.props.columns).toBe(70)
  expect(raster?.props.rows).toBe(8)
  expect(await pane.find({ type: 'Text', text: /Night 1 · context 40%/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /stalks|Swooping|tower|shadows|lantern|owl|moon|cat/ })).toBeDefined()

  const desktop = await $.ui.mount({ plugin: 'night-feast', surface: 'desktop', component: 'Pane', requestId: 'night-feast', props: DOCK_PROPS })
  expect((await desktop.findAll({ type: 'Raster' })).length).toBe(0)
  expect(await desktop.find({ type: 'Text', text: /Night 1/ })).toBeDefined()
})

test('another game taking the active slot closes the night', async ($, on) => {
  const { recorder, clock } = engine({ on, files: { [ACTIVE_PATH]: 'night-feast' } })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(recorder.panes.has('night-feast')).toBe(true)

  recorder.files.set(ACTIVE_PATH, 'samurai-dojo')
  await clock.advance(1200)
  expect(recorder.panes.has('night-feast')).toBe(false)
})

test('tool calls feed the vampire and failures bring garlic', async ($, on) => {
  const { clock } = engine({ on })
  on('tool.call', ($, event) => (event.tool_use_id === 'bad' ? { result: 'boom', isError: true } : { result: 'ok' }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  await $.tool.call({ tool: 'Read', tool_use_id: 'one', file_path: '/demo/a.ts' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'two', file_path: '/demo/b.ts' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'bad', file_path: '/demo/c.ts' })
  await clock.advance(14000)
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })

  const result = await $.command.run({ ...COMMAND, args: 'stats' })
  expect(result.text).toContain('2 feeds')
  expect(result.text).toContain('Lifetime feeds: 12. Garlic this session: 1.')
})

test('the context fill warns at dawn and a compaction starts a new night', async ($, on) => {
  const { recorder } = engine({ on })
  on('session.measure', ($, event) => ({ changed: event.changed }))
  on('classic.SessionStart', () => ({}))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  await $.session.measure({ context: { window: 200000, tokens: 184000, percent: 92 }, rateLimits: [], changed: ['context'] })
  expect(recorder.toasts.at(-1)).toContain('Dawn is near: context 90% full.')

  await $.classic.SessionStart({ source: 'compact' })
  const result = await $.command.run({ ...COMMAND, args: 'stats' })
  expect(result.text).toContain('Night 2 · dusk')
})
