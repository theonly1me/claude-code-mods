import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const PANE_PROPS = {
  title: 'Change Journal',
  isFocused: true,
  bodyColumns: 70,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
} as const
const PANE = { plugin: 'change-journal', component: 'Pane', requestId: 'change-journal', props: PANE_PROPS } as const

type Recorder = { opened: unknown[]; commands: string[][] }

function engine(on: On): Recorder {
  const recorder: Recorder = { opened: [], commands: [] }
  mock.clock(on)
  mock.store(on)
  mock.env(on, { HOME: '/home/demo' })
  on('session.id', () => ({ value: 'abc' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('fs.read', () => ({ value: '' }))
  on('fs.write', () => ({ value: undefined }))
  on('process.run', ($, event) => {
    recorder.commands.push([...event.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.open', ($, event) => {
    recorder.opened.push(event)
    return { value: { isPlaced: true } }
  })
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('tool.call', () => ({
    result: {
      filePath: '/demo/src/cart.ts',
      oldString: 'a',
      newString: 'b',
      originalFile: 'a\n',
      structuredPatch: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 2, lines: ['-a', '+b', '+c'] }],
      userModified: false,
      replaceAll: false,
    },
  }))
  return recorder
}

async function editOnce($: Engine): Promise<void> {
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: false })
  await $.turn.start({ turnId: 't1', text: 'Change a' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/demo/src/cart.ts', old_string: 'a', new_string: 'b' })
}

test('the pane lists numbered edits with their counts and offers the page on every surface', async ($, on) => {
  engine(on)
  await editOnce($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ ...PANE, surface })
    expect(await pane.find({ type: 'Button', key: 'edit-1' })).toMatchObject({ props: { hotkey: '1' } })
    expect(await pane.find({ type: 'Text', text: '+2' })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'open-page' })).toMatchObject({ props: { hotkey: 'o' } })
    await pane.unmount()
  }
})

test('/changes opens the pane with the keys, and the hint row names them', async ($, on) => {
  const recorder = engine(on)
  await editOnce($)
  await $.command.run({ command: 'changes', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  expect(recorder.opened[0]).toMatchObject({ id: 'change-journal', focus: true })
  expect(recorder.opened[0]).not.toHaveProperty('closeOnEscape')

  const focused = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await focused.find({ type: 'Text', text: /1-9: show an edit {2}o: open page {2}c: copy path/ })).toBeDefined()
  await focused.unmount()
  const unfocused = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PANE_PROPS, isFocused: false } })
  expect(await unfocused.find({ type: 'Text', text: /ctrl\+x tab: use the keys here/ })).toBeDefined()
})

test('picking an edit shows its diff, and the page opens on its turn', async ($, on) => {
  const recorder = engine(on)
  await editOnce($)
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await pane.press({ key: 'edit-1' })
  expect(await pane.find({ type: 'Text', text: 'Edit 1  ' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: '+c' })).toBeDefined()
  expect(await pane.find({ type: 'Button', text: 'Open this turn on the page' })).toBeDefined()

  await pane.press({ key: 'open-page' })
  expect(recorder.commands.at(-1)).toEqual(['open', 'file:///home/demo/.claude/change-journal/demo/abc/index.html#turn=1&tab=changes'])
})
