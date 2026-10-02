import { expect, mock, test } from 'claude-code/testing'

test('commands expose the scene and observe tools without rewriting their result', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('session.id', () => ({ value: 'demo' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('tool.call', () => ({ result: 'observed', text: 'unchanged' }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const tool = await $.tool.call({ tool: 'Read', file_path: 'example.ts' })
  expect(tool.text).toBe('unchanged')
  const command = await $.command.run({ command: 'feast', args: 'play', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
  expect(command.text).toContain('Night Feast open')
  const hidden = await $.command.run({ command: 'feast', args: 'hide', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
  expect(hidden.text).toContain('hidden')
})
