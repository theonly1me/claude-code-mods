import { expect, test } from 'claude-code/testing'

import { ACTIVE_PATH, COMMAND, DOCK_PROPS, engine } from './engine'

test('the dojo is hidden at start and /dojo docks it and remembers the choice', async ($, on) => {
  const { recorder } = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(recorder.opened).toEqual([])

  const shown = await $.command.run(COMMAND)
  expect(shown.text).toContain('Samurai Dojo is on')
  expect(recorder.opened).toEqual(['samurai-dojo'])
  expect(recorder.files.get(ACTIVE_PATH)).toBe('samurai-dojo')
})

test('a session opens the dojo when it was left on', async ($, on) => {
  const { recorder } = engine({ on, files: { [ACTIVE_PATH]: 'samurai-dojo' } })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  expect(recorder.opened).toEqual(['samurai-dojo'])
})

test('another game named in the shared file keeps the dojo closed', async ($, on) => {
  const { recorder } = engine({ on, files: { [ACTIVE_PATH]: 'little-harvest' } })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  expect(recorder.opened).toEqual([])
})

test('/dojo off closes the pane and clears the shared file, and stats does not toggle', async ($, on) => {
  const { recorder } = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.command.run({ ...COMMAND, args: 'on' })

  const stats = await $.command.run({ ...COMMAND, args: 'stats' })
  expect(stats.text).toContain('Rank: Ronin')
  expect(recorder.closed).toEqual([])

  const hidden = await $.command.run({ ...COMMAND, args: 'off' })
  expect(hidden.text).toContain('Samurai Dojo is off')
  expect(recorder.closed).toEqual(['samurai-dojo'])
  expect(recorder.files.get(ACTIVE_PATH)).toBe('')
})

test('the docked pane draws the scene, the stats line, and the activity log', async ($, on) => {
  const { clock } = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await clock.advance(8000)

  const pane = await $.ui.mount({ plugin: 'samurai-dojo', surface: 'terminal', component: 'Pane', requestId: 'samurai-dojo', props: DOCK_PROPS })
  const raster = await pane.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('samurai-dojo:stage')
  expect(raster?.props.columns).toBe(70)
  expect(raster?.props.rows).toBe(8)
  expect(await pane.find({ type: 'Text', text: /slain/ })).toBeDefined()
  expect((await pane.findAll({ type: 'Text' })).length).toBeGreaterThan(2)
})

test('the desktop gets the stats line in place of the scene', async ($, on) => {
  engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  const pane = await $.ui.mount({ plugin: 'samurai-dojo', surface: 'desktop', component: 'Pane', requestId: 'samurai-dojo', props: DOCK_PROPS })
  expect((await pane.findAll({ type: 'Raster' })).length).toBe(0)
  expect(await pane.find({ type: 'Text', text: /Ronin/ })).toBeDefined()
})

test('tool calls become kills on top of the stored lifetime count', async ($, on) => {
  const { clock } = engine({ on, store: { lifetimeKills: 40 } })
  on('tool.call', () => ({ result: 'ok' }))
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  await $.tool.call({ tool: 'Read', tool_use_id: 'one', file_path: '/demo/a.ts' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'two', file_path: '/demo/b.ts' })
  await clock.advance(6000)
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })

  const result = await $.command.run({ ...COMMAND, args: 'stats' })
  expect(result.text).toContain('Slain this session: 2. Lifetime: 42.')
})
