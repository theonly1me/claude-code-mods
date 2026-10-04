import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { MockClock } from 'claude-code/testing'

const BAND = {
  plugin: 'slayer-corps',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 40, bodyColumns: 120, scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const
const COMMAND = { command: 'slayer', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

function engine(options: { on: On; store?: Readonly<Record<string, unknown>> }): { clock: MockClock; toasts: string[] } {
  const { on } = options
  const toasts: string[] = []
  const clock = mock.clock(on)
  mock.store(on, options.store ?? {})
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('ui.toast', ($, event) => {
    toasts.push(event.text)
    return { value: undefined }
  })
  on('tool.call', () => ({ result: 'ok' }))
  on('turn.complete', () => ({ text: '' }))
  return { clock, toasts }
}

test('the story resumes from the store and the fight shows above the prompt', async ($, on) => {
  const { toasts } = engine({ on, store: { progress: { cycle: 1, chapter: 4, demonHp: 61, attacks: 80, defeated: 4, dawns: 0 } } })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  expect(toasts[0]).toContain('Chapter 5: The Night Train. the Sleep Conductor has 61 of 100 left.')

  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const raster = await terminal.find({ type: 'Raster' })
  expect(raster?.props.key).toBe('slayer-corps:stage')
  expect(raster?.props.rows).toBe(8)
  expect(raster?.props.columns).toBe(72)

  const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await desktop.find({ type: 'Text', text: /Chapter 5: The Night Train/ })).toBeDefined()
})

test('work wears the demon down, and /slayer hides the fight and tells the story', async ($, on) => {
  const { clock } = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'a', file_path: '/demo/a.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Read', tool_use_id: 'b', file_path: '/demo/a.ts' })
  await clock.advance(4000)
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })
  await clock.advance(3000)

  const hidden = await $.command.run({ ...COMMAND, args: '' })
  expect(hidden.text).toContain('The fight is hidden. Chapter 1: The Mountain Pass · the Hollow Woodcutter 27/40')
  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await terminal.findAll({ type: 'Raster' })).length).toBe(0)

  const story = await $.command.run({ ...COMMAND, args: 'story' })
  expect(story.text).toContain('1. The Mountain Pass (now)')
  expect(story.text).toContain("Edits are Inosuke's Beast Breathing")
})
