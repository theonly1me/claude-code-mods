import { expect, mock, test } from 'claude-code/testing'

test('live analysis calls Sonnet medium and links rendered explanations to code', async ($, on) => {
  const clock = mock.clock(on)
  on('session.cwd', () => ({ value: '/demo' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('tool.call', () => ({ result: 'updated' }))
  let calls = 0
  on('model.complete', ($, event) => {
    calls += 1
    expect(event.model).toBe('claude-sonnet-5-5')
    expect(event.effort).toBe('medium')
    expect(event.timeoutMs).toBe(20000)
    return { value: { isAnswered: true, text: JSON.stringify({ summary: 'Guard empty carts', entries: [{ text: 'Avoid requesting payment for an empty cart', evidenceIds: ['e1'] }], before: [{ text: 'Request payment', evidenceIds: ['e1'] }], after: [{ text: 'Check cart first', evidenceIds: ['e1'] }] }), usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }
  })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'changes', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
  await $.turn.start({ text: 'Guard empty carts', turnId: 'turn-one' })
  await $.tool.call({ tool: 'Edit', file_path: '/demo/cart.ts', old_string: 'pay()', new_string: 'if (items.length) pay()' })
  await clock.advance(3000)

  expect(calls).toBe(1)
  const ui = await $.ui.mount({ plugin: 'change-journal', surface: 'terminal', component: 'Pane', requestId: 'change-journal', props: { title: 'Changes', isFocused: false, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} } })
  await ui.press({ key: 'e1' })
  expect((await ui.findAll({ type: 'Code' })).length).toBe(2)
})

test('disabled summaries keep observed edits available without model calls', { options: { liveSummaries: false } }, async ($, on) => {
  const clock = mock.clock(on)
  on('session.cwd', () => ({ value: '/demo' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('tool.call', () => ({ result: 'updated' }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'changes', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
  await $.turn.start({ text: 'Edit', turnId: 'turn-one' })
  await $.tool.call({ tool: 'Edit', file_path: '/demo/cart.ts', old_string: 'true', new_string: 'false' })
  await clock.advance(10000)

  const ui = await $.ui.mount({ plugin: 'change-journal', surface: 'desktop', component: 'Pane', requestId: 'change-journal', props: { title: 'Changes', isFocused: false, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} } })
  expect((await ui.findAll({ type: 'Button', key: 'e1' })).length).toBe(1)
})
