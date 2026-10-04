import { expect, mock, test } from 'claude-code/testing'
import type { MockClock } from 'claude-code/testing'
import type { On } from 'claude-code'

const ACTIVE_FILE = '/home/demo/.claude/mods/active-game'
const PANE_PROPS = {
  title: 'Little Harvest',
  isFocused: false,
  bodyColumns: 70,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
} as const
const PANE = { plugin: 'little-harvest', component: 'Pane', requestId: 'little-harvest', props: PANE_PROPS } as const
const COMMAND = {
  command: 'farm',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 160 },
} as const
const WRITE_RESULT = { type: 'create', filePath: '/demo/src/cart.ts', content: 'x', structuredPatch: [], originalFile: null }

type World = { files: Map<string, string>; opened: string[]; closed: string[]; toasts: string[]; clock: MockClock }

function engine(options: { on: On; activeGame?: string }): World {
  const { on } = options
  const world: World = { files: new Map(), opened: [], closed: [], toasts: [], clock: mock.clock(on) }
  if (options.activeGame !== undefined) {
    world.files.set(ACTIVE_FILE, options.activeGame)
  }
  const panes = new Set<string>()
  mock.store(on, { lifetimeBushels: 7 })
  mock.env(on, { HOME: '/home/demo' })
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('process.run', () => ({ value: { exitCode: 128, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('fs.read', ($, event) => {
    const text = world.files.get(event.path)
    if (text === undefined) {
      throw new Error(`missing ${event.path}`)
    }
    return { value: text }
  })
  on('fs.write', ($, event) => {
    world.files.set(event.path, event.text)
    return { value: undefined }
  })
  on('ui.panes', () => ({
    value: [...panes].map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })),
  }))
  on('ui.open', ($, event) => {
    world.opened.push(event.id)
    panes.add(event.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, event) => {
    world.closed.push(event.id)
    panes.delete(event.id)
    return { value: undefined }
  })
  on('ui.toast', ($, event) => {
    world.toasts.push(event.text)
    return { value: undefined }
  })
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', ($, event) =>
    event.tool === 'Bash' ? { result: { stdout: 'ok', stderr: '', interrupted: false } } : { result: WRITE_RESULT },
  )
  return world
}

test('the farm stays hidden at start until /farm opens it, and /farm again closes it', async ($, on) => {
  const world = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(world.opened).toEqual([])

  const opened = await $.command.run(COMMAND)
  expect(opened.text).toContain('Little Harvest is on.')
  expect(world.opened).toEqual(['little-harvest'])
  expect(world.files.get(ACTIVE_FILE)).toBe('little-harvest')

  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const raster = await pane.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('little-harvest:stage')
  expect(raster?.props.columns).toBe(70)
  expect(raster?.props.rows).toBe(8)
  expect(await pane.find({ type: 'Text', text: /0 plots {2}0 ripe {2}7 bushels {2}Winter, cherry blossom in \d+ min/ })).toBeDefined()

  const closed = await $.command.run(COMMAND)
  expect(closed.text).toContain('Little Harvest is off.')
  expect(world.closed).toEqual(['little-harvest'])
  expect(world.files.get(ACTIVE_FILE)).toBe('')
})

test('an enabled farm comes back at the next start, logs its chores in the dock, and summarizes on desktop', async ($, on) => {
  const world = engine({ on, activeGame: 'little-harvest' })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(world.opened).toEqual(['little-harvest'])
  await world.clock.advance(3000)
  const dock = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await dock.find({ type: 'Text', text: /^(Feeding|Watering|Hoeing|Carrying|Pulling|Resting|Fixing|Shooing)/ })).toBeDefined()
  const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await desktop.find({ type: 'Text', text: /7 bushels/ })).toBeDefined()
  expect((await desktop.findAll({ type: 'Raster' })).length).toBe(0)
})

test('another game in the active file keeps the farm closed', async ($, on) => {
  const world = engine({ on, activeGame: 'samurai-dojo' })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(world.opened).toEqual([])
})

test('written files become plots that /farm stats lists without opening the pane', async ($, on) => {
  const world = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Write', tool_use_id: 'w1', file_path: '/demo/src/cart.ts', content: 'a\nb\nc\n' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/demo/README.md', old_string: 'a', new_string: 'b' })
  const result = await $.command.run({ ...COMMAND, args: 'stats' })
  expect(result.text).toMatch(/corn\s+sprout\s+src\/cart\.ts \(3 lines\)/)
  expect(result.text).toMatch(/sunflower\s+sprout\s+README\.md \(1 line\)/)
  expect(world.opened).toEqual([])
})

test('a passing test turn harvests ripe crops into the barn', async ($, on) => {
  const world = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.turn.start({ turnId: 't1', text: 'Write the cart' })
  await $.tool.call({ tool: 'Write', tool_use_id: 'w1', file_path: '/demo/src/cart.ts', content: 'line\n'.repeat(40) })
  await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'npm test' })
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(world.toasts).toEqual(['Harvested 1 ripe crop into the barn'])
  const result = await $.command.run({ ...COMMAND, args: 'stats' })
  expect(result.text).toContain('Barn: 1 bushel this session, 8 in all.')
})
