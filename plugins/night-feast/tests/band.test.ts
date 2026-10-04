import { expect, mock, test } from 'claude-code/testing'
import type { MockClock } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND_PROPS = { hasSurvey: false, isWorking: false, maxRows: 40, bodyColumns: 120, scroll: { offset: 0, bodyRows: 40 }, view: {} }
const COMMAND = { command: 'feast', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const
const USAGE = { startedAt: 0, context: { window: 200000, tokens: 80000, percent: 40 }, rateLimits: [] }

type Recorder = { clock: MockClock; toasts: string[] }

function engine(on: On): Recorder {
  const recorder: Recorder = { clock: mock.clock(on), toasts: [] }
  mock.store(on, { lifetimeFeeds: 10 })
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('session.usage', () => ({ value: USAGE }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.toast', ($, event) => {
    recorder.toasts.push(event.text)
    return { value: undefined }
  })
  return recorder
}

test('the night shows at start, stacks, yields, and hides on /feast', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const terminal = await $.ui.mount({ plugin: 'night-feast', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  const raster = await terminal.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('night-feast:stage')
  expect(raster?.props.columns).toBe(72)
  expect(raster?.props.rows).toBe(8)

  const survey = await $.ui.mount({ plugin: 'night-feast', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, hasSurvey: true } })
  expect((await survey.findAll({ type: 'Raster' })).length).toBe(0)

  const desktop = await $.ui.mount({ plugin: 'night-feast', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
  expect(await desktop.find({ type: 'Text', text: /night feast · night 1 · context 40%/ })).toBeDefined()

  const result = await $.command.run(COMMAND)
  expect(result.text).toContain('The night is hidden.')
  expect((await terminal.findAll({ type: 'Raster' })).length).toBe(0)
})

test('tool calls feed the vampire and failures bring garlic', async ($, on) => {
  const { clock } = engine(on)
  on('tool.call', ($, event) => (event.tool_use_id === 'bad' ? { result: 'boom', isError: true } : { result: 'ok' }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  await $.tool.call({ tool: 'Read', tool_use_id: 'one', file_path: '/demo/a.ts' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'two', file_path: '/demo/b.ts' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'bad', file_path: '/demo/c.ts' })
  await clock.advance(12000)
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })

  const result = await $.command.run(COMMAND)
  expect(result.text).toContain('2 feeds this session')
  expect(result.text).toContain('Lifetime feeds: 12. Garlic this session: 1.')
})

test('the context fill warns at dawn and a compaction starts a new night', async ($, on) => {
  const recorder = engine(on)
  on('session.measure', ($, event) => ({ changed: event.changed }))
  on('classic.SessionStart', () => ({}))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })

  await $.session.measure({ context: { window: 200000, tokens: 184000, percent: 92 }, rateLimits: [], changed: ['context'] })
  expect(recorder.toasts.at(-1)).toContain('Dawn is near: context 90% full.')

  await $.classic.SessionStart({ source: 'compact' })
  const result = await $.command.run(COMMAND)
  expect(result.text).toContain('night 2 · dusk')
})
