import type { ModelCompleteResult } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const pane = { title: 'Changes', isFocused: false, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} } as const

test('a timed-out analysis leaves successful, failed, and denied edits visible', async ($, on) => {
  const clock = mock.clock(on)
  on('session.cwd', () => ({ value: '/demo' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('tool.call', ($, event) => event.file_path === '/demo/denied.ts' ? { deny: 'Permission denied' } : event.file_path === '/demo/failed.ts' ? { result: 'Observed', isError: true } : { result: 'Observed' })
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'aborted', usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'changes', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
  await $.turn.start({ text: 'Edit', turnId: 'one' })
  for (const name of ['ok', 'failed', 'denied']) await $.tool.call({ tool: 'Edit', file_path: '/demo/' + name + '.ts', old_string: 'true', new_string: 'false' })
  await clock.advance(3000)
  const ui = await $.ui.mount({ plugin: 'change-journal', surface: 'terminal', component: 'Pane', requestId: 'change-journal', props: pane })
  expect((await ui.find({ key: 'e1' }))?.text).toContain('successful')
  expect((await ui.find({ key: 'e2' }))?.text).toContain('failed')
  expect((await ui.find({ key: 'e3' }))?.text).toContain('denied')
  expect((await ui.findAll({ type: 'Text', text: 'unavailable' })).length).toBeGreaterThan(0)
})

test('an explanation arriving after a newer edit is discarded', async ($, on) => {
  const clock = mock.clock(on)
  on('session.cwd', () => ({ value: '/demo' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('tool.call', () => ({ result: 'Observed' }))
  let release: ((result: { value: ModelCompleteResult }) => void) | undefined
  on('model.complete', () => new Promise<{ value: ModelCompleteResult }>(resolve => { release = resolve }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'changes', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
  await $.turn.start({ text: 'Edit', turnId: 'one' })
  await $.tool.call({ tool: 'Edit', file_path: '/demo/cart.ts', old_string: 'true', new_string: 'false' })
  await clock.advance(3000)
  await $.tool.call({ tool: 'Edit', file_path: '/demo/cart.ts', old_string: 'false', new_string: 'null' })
  if (release === undefined) throw Error('Analysis never started')
  release({ value: { isAnswered: true, text: JSON.stringify({ summary: 'Stale summary', entries: [{ text: 'Old edit', evidenceIds: ['e1'] }], before: [], after: [] }), usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } })
  await clock.settle()
  const ui = await $.ui.mount({ plugin: 'change-journal', surface: 'terminal', component: 'Pane', requestId: 'change-journal', props: pane })
  expect((await ui.findAll({ text: 'Stale summary' })).length).toBe(0)
  expect((await ui.findAll({ key: 'e2' })).length).toBe(1)
})
