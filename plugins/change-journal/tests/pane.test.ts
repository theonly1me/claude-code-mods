import { expect, mock, test } from 'claude-code/testing'

const PANE_PROPS = {
  title: 'Change Journal',
  isFocused: false,
  bodyColumns: 70,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
} as const

test('the pane lists edits with their counts and offers the page on every surface', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  mock.env(on, { HOME: '/home/demo' })
  on('session.id', () => ({ value: 'abc' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('fs.read', () => ({ value: '' }))
  on('fs.write', () => ({ value: undefined }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
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
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: false })
  await $.turn.start({ turnId: 't1', text: 'Change a' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/demo/src/cart.ts', old_string: 'a', new_string: 'b' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ plugin: 'change-journal', surface, component: 'Pane', requestId: 'change-journal', props: PANE_PROPS })
    expect(await pane.find({ type: 'Text', text: 'src/cart.ts' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: '+2' })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'open-page' })).toBeDefined()
    await pane.unmount()
  }
})
