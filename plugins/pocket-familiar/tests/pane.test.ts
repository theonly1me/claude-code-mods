import { expect, test } from 'claude-code/testing'

import { ACTIVE_FILE, engine, PANE_PROPS, petCommand, SAVED } from './engine'

test('the familiar is hidden at start, and /pet opens and closes its pane', async ($, on) => {
  const harness = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(harness.opened).toEqual([])

  const opened = await $.command.run(petCommand(''))
  expect(opened.text).toContain('Pocket Familiar is on.')
  expect(harness.opened).toEqual(['pocket-familiar'])
  expect(harness.files.get(ACTIVE_FILE)).toBe('pocket-familiar')

  const pane = await $.ui.mount({ plugin: 'pocket-familiar', surface: 'terminal', component: 'Pane', requestId: 'pocket-familiar', props: PANE_PROPS })
  const raster = await pane.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('pocket-familiar:stage')
  expect(raster?.props.columns).toBe(70)
  expect(raster?.props.rows).toBe(8)
  expect(await pane.find({ type: 'Text', text: /speckled egg, happy/ })).toBeDefined()
  await pane.unmount()

  const closed = await $.command.run(petCommand(''))
  expect(closed.text).toContain('Pocket Familiar is off.')
  expect(harness.closed).toEqual(['pocket-familiar'])
  expect(harness.files.get(ACTIVE_FILE)).toBe('')
})

test('an enabled familiar comes back in the next session', async ($, on) => {
  const harness = engine({ on, files: { [ACTIVE_FILE]: 'pocket-familiar' } })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(harness.opened).toEqual(['pocket-familiar'])
})

test('/pet stats prints the stat bars without opening the pane, and desktop gets a summary', async ($, on) => {
  const harness = engine({ on, store: SAVED })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const result = await $.command.run(petCommand('stats'))
  expect(result.text).toContain('Your familiar is a speckled egg')
  expect(result.text).toMatch(/fullness +█+/)
  expect(result.text).toContain('XP 19. 1 more to become a fox kit.')
  expect(harness.opened).toEqual([])

  const desktop = await $.ui.mount({ plugin: 'pocket-familiar', surface: 'desktop', component: 'Pane', requestId: 'pocket-familiar', props: PANE_PROPS })
  expect(await desktop.find({ type: 'Text', text: /speckled egg/ })).toBeDefined()
  expect((await desktop.findAll({ type: 'Raster' })).length).toBe(0)
})

test('passing tests feed it, hatch the egg, and show in the dock log', async ($, on) => {
  const harness = engine({ on, store: SAVED })
  on('tool.call', () => ({ result: { stdout: 'ok', stderr: '', interrupted: false } }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Bash', tool_use_id: 'test-1', command: 'npm test' })

  expect(harness.toasts).toContain('The egg hatched into a fox kit.')
  const result = await $.command.run(petCommand('stats'))
  expect(result.text).toContain('Your familiar is a fox kit')
  expect(result.text).toMatch(/fullness +█+[▏▎▍▌▋▊▉]? +52/)
  expect(result.text).toContain('XP 24.')

  const pane = await $.ui.mount({ plugin: 'pocket-familiar', surface: 'terminal', component: 'Pane', requestId: 'pocket-familiar', props: PANE_PROPS })
  expect(await pane.find({ type: 'Text', text: 'Grew into a fox kit' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'Ate well: your tests passed' })).toBeDefined()
})
