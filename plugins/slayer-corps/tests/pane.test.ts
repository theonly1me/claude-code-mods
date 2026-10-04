import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { MockClock } from 'claude-code/testing'

const ACTIVE_FILE = '/home/demo/.claude/mods/active-game'
const PANE_PROPS = {
  title: 'Slayer Corps',
  isFocused: false,
  bodyColumns: 70,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
} as const
const PANE = { plugin: 'slayer-corps', component: 'Pane', requestId: 'slayer-corps', props: PANE_PROPS } as const
const COMMAND = { command: 'slayer', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const
const START = { cwd: '/demo', surface: 'terminal', isInteractive: true } as const

type Recorder = { clock: MockClock; files: Map<string, string>; opened: string[]; closed: string[]; toasts: string[] }

function engine(options: { on: On; store?: Readonly<Record<string, unknown>>; active?: string }): Recorder {
  const { on } = options
  const files = new Map<string, string>([[ACTIVE_FILE, options.active ?? '']])
  const recorder: Recorder = { clock: mock.clock(on), files, opened: [], closed: [], toasts: [] }
  const open = new Set<string>()
  mock.store(on, options.store ?? {})
  mock.env(on, { HOME: '/home/demo' })
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('ui.toast', ($, event) => {
    recorder.toasts.push(event.text)
    return { value: undefined }
  })
  on('fs.read', ($, event) => ({ value: files.get(event.path) ?? '' }))
  on('fs.write', ($, event) => {
    files.set(event.path, event.text)
    return { value: undefined }
  })
  on('ui.panes', () => ({
    value: [...open].map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })),
  }))
  on('ui.open', ($, event) => {
    recorder.opened.push(event.id)
    open.add(event.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, event) => {
    recorder.closed.push(event.id)
    open.delete(event.id)
    return { value: undefined }
  })
  on('tool.call', () => ({ result: 'ok' }))
  on('turn.complete', () => ({ text: '' }))
  return recorder
}

test('the fight is hidden by default, /slayer shows it and remembers, a second /slayer hides it', async ($, on) => {
  const recorder = engine({ on })
  await $.session.start(START)
  expect(recorder.opened).toEqual([])

  const shown = await $.command.run({ ...COMMAND, args: '' })
  expect(shown.text).toContain('Slayer Corps is on.')
  expect(shown.text).toContain('Chapter 1: The Mountain Pass')
  expect(recorder.opened).toEqual(['slayer-corps'])
  expect(recorder.files.get(ACTIVE_FILE)).toBe('slayer-corps')

  const hidden = await $.command.run({ ...COMMAND, args: '' })
  expect(hidden.text).toContain('Slayer Corps is off.')
  expect(recorder.closed).toEqual(['slayer-corps'])
  expect(recorder.files.get(ACTIVE_FILE)).toBe('')
})

test('the docked pane draws the fight, the chapter line, and what each slayer just did', async ($, on) => {
  const recorder = engine({ on })
  await $.session.start(START)
  await $.command.run({ ...COMMAND, args: 'on' })
  await recorder.clock.advance(5000)

  const terminal = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const raster = await terminal.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('slayer-corps:stage')
  expect(raster?.props.columns).toBe(70)
  expect(raster?.props.rows).toBe(8)
  expect(await terminal.find({ type: 'Text', text: /Chapter 1: The Mountain Pass/ })).toBeDefined()
  expect(await terminal.find({ type: 'Text', text: /Tanjiro shows Water Breathing/ })).toBeDefined()

  const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await desktop.find({ type: 'Text', text: /Chapter 1: The Mountain Pass/ })).toBeDefined()
  expect((await desktop.findAll({ type: 'Raster' })).length).toBe(0)
})

test('an enabled fight opens at start and greets with the stored chapter', async ($, on) => {
  const recorder = engine({
    on,
    active: 'slayer-corps',
    store: { progress: { cycle: 1, chapter: 4, demonHp: 61, attacks: 80, defeated: 4, dawns: 0 } },
  })
  await $.session.start(START)
  await recorder.clock.advance(600)
  expect(recorder.opened).toEqual(['slayer-corps'])
  expect(recorder.toasts[0]).toContain('Chapter 5: The Night Train. the Sleep Conductor has 61 of 100 left.')
})

test('another game taking the stage closes this one', async ($, on) => {
  const recorder = engine({ on, active: 'slayer-corps' })
  await $.session.start(START)
  recorder.files.set(ACTIVE_FILE, 'samurai-dojo')
  await recorder.clock.advance(1200)
  expect(recorder.closed).toEqual(['slayer-corps'])
})

test('work wears the demon down, and /slayer-story tells the story', async ($, on) => {
  const recorder = engine({ on })
  await $.session.start(START)
  await $.tool.call({ tool: 'Edit', tool_use_id: 'a', file_path: '/demo/a.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'b', file_path: '/demo/a.ts' })
  await recorder.clock.advance(4000)
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })
  await recorder.clock.advance(3000)

  const stats = await $.command.run({ ...COMMAND, args: 'stats' })
  expect(stats.text).toContain('Chapter 1: The Mountain Pass · the Hollow Woodcutter 27/40')
  expect(recorder.opened).toEqual([])
  expect(recorder.toasts).toEqual([])

  const story = await $.command.run({ ...COMMAND, command: 'slayer-story', args: '' })
  expect(story.text).toContain('1. The Mountain Pass (now)')
  expect(story.text).toContain("edits on Inosuke's Beast Breathing")
})
