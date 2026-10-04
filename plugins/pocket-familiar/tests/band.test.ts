import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { MockClock } from 'claude-code/testing'

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 40,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
}
const COMMAND = {
  command: 'pet',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const
const SAVED = { familiar: { fullness: 40, joy: 50, energy: 60, lifetimeXp: 19, lastSeenAt: 0 } }

type Harness = { clock: MockClock; toasts: string[] }

function engine(options: { on: On; store?: Readonly<Record<string, unknown>> }): Harness {
  const { on } = options
  const harness: Harness = { clock: mock.clock(on), toasts: [] }
  mock.store(on, options.store ?? {})
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.toast', ($, event) => {
    harness.toasts.push(event.text)
    return { value: undefined }
  })
  return harness
}

test('the familiar shows at start, stacks, yields to surveys, and summarizes on desktop', async ($, on) => {
  engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const terminal = await $.ui.mount({ plugin: 'pocket-familiar', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  const raster = await terminal.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('pocket-familiar:stage')
  expect(raster?.props.columns).toBe(72)
  expect(raster?.props.rows).toBe(8)

  const survey = await $.ui.mount({ plugin: 'pocket-familiar', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, hasSurvey: true } })
  expect((await survey.findAll({ type: 'Raster' })).length).toBe(0)

  const desktop = await $.ui.mount({ plugin: 'pocket-familiar', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
  expect(await desktop.find({ type: 'Text', text: /pocket familiar · speckled egg/ })).toBeDefined()
})

test('/pet hides the familiar and reports its stats', async ($, on) => {
  engine({ on, store: SAVED })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const terminal = await $.ui.mount({ plugin: 'pocket-familiar', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  const result = await $.command.run(COMMAND)
  expect(result.text).toContain('The familiar is hidden.')
  expect(result.text).toContain('Your familiar is a speckled egg')
  expect(result.text).toMatch(/fullness +█+/)
  expect(result.text).toContain('XP 19. 1 more to become a fox kit.')
  expect((await terminal.findAll({ type: 'Raster' })).length).toBe(0)
})

test('passing tests feed it and the first XP past twenty hatches the egg', async ($, on) => {
  const harness = engine({ on, store: SAVED })
  on('tool.call', () => ({ result: { stdout: 'ok', stderr: '', interrupted: false } }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Bash', tool_use_id: 'test-1', command: 'npm test' })

  expect(harness.toasts).toContain('The egg hatched into a fox kit.')
  const result = await $.command.run(COMMAND)
  expect(result.text).toContain('Your familiar is a fox kit')
  expect(result.text).toMatch(/fullness +█+[▏▎▍▌▋▊▉]? +52/)
  expect(result.text).toContain('XP 24.')
})
