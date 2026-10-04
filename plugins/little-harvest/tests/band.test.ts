import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 40,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
}
const COMMAND = {
  command: 'farm',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const
const WRITE_RESULT = { type: 'create', filePath: '/demo/src/cart.ts', content: 'x', structuredPatch: [], originalFile: null }

function engine(options: { on: On; toasts: string[] }): void {
  const { on } = options
  mock.clock(on)
  mock.store(on, { lifetimeBushels: 7 })
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('process.run', () => ({ value: { exitCode: 128, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.toast', ($, event) => {
    options.toasts.push(event.text)
    return { value: undefined }
  })
  on('tool.call', ($, event) =>
    event.tool === 'Bash' ? { result: { stdout: 'ok', stderr: '', interrupted: false } } : { result: WRITE_RESULT },
  )
}

test('the farm shows at start, stacks, yields to surveys, and summarizes on desktop', async ($, on) => {
  engine({ on, toasts: [] })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const terminal = await $.ui.mount({ plugin: 'little-harvest', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  const raster = await terminal.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('little-harvest:stage')
  expect(raster?.props.columns).toBe(72)
  expect(raster?.props.rows).toBe(8)
  const survey = await $.ui.mount({ plugin: 'little-harvest', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND_PROPS, hasSurvey: true } })
  expect((await survey.findAll({ type: 'Raster' })).length).toBe(0)
  const desktop = await $.ui.mount({ plugin: 'little-harvest', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
  expect(await desktop.find({ type: 'Text', text: /little harvest · 0 plots · 0 ripe · 7 bushels/ })).toBeDefined()
})

test('a written file becomes a plot that /farm lists, and /farm toggles the band', async ($, on) => {
  engine({ on, toasts: [] })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Write', tool_use_id: 'w1', file_path: '/demo/src/cart.ts', content: 'a\nb\nc\n' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/demo/README.md', old_string: 'a', new_string: 'b' })
  const result = await $.command.run(COMMAND)
  expect(result.text).toContain('The farm is closed.')
  expect(result.text).toMatch(/corn\s+sprout\s+src\/cart\.ts \(3 lines\)/)
  expect(result.text).toMatch(/sunflower\s+sprout\s+README\.md \(1 line\)/)
  const terminal = await $.ui.mount({ plugin: 'little-harvest', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  expect((await terminal.findAll({ type: 'Raster' })).length).toBe(0)
})

test('a passing test turn harvests ripe crops into the barn', async ($, on) => {
  const toasts: string[] = []
  engine({ on, toasts })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.turn.start({ turnId: 't1', text: 'Write the cart' })
  await $.tool.call({ tool: 'Write', tool_use_id: 'w1', file_path: '/demo/src/cart.ts', content: 'line\n'.repeat(40) })
  await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'npm test' })
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(toasts).toEqual(['Harvested 1 ripe crop into the barn'])
  const result = await $.command.run(COMMAND)
  expect(result.text).toContain('Barn: 1 bushel this session, 8 in all.')
})
