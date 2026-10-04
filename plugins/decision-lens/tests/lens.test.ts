import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { On } from 'claude-code'

const PANE = {
  plugin: 'decision-lens',
  component: 'Pane',
  requestId: 'decision-lens',
  props: { title: 'Decision Lens', isFocused: true, bodyColumns: 90, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const
const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const DECISIONS = JSON.stringify({
  decisions: [
    {
      title: 'Merge lines inside addItem',
      choice: 'Changed addItem to merge the same SKU.',
      why: 'One entry point keeps carts consistent.',
      alternatives: ['A separate mergeItems helper'],
      evidence: 'Adding the same SKU twice creates two lines',
      confidence: 'high',
      keep: 'Fix behavior at the single entry point.',
      avoid: 'Do not change existing functions without asking.',
    },
  ],
})
const COMPOSE = { model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

function engine(options: { on: On; entries?: Readonly<Record<string, unknown>> }): MockClock {
  const { on } = options
  const clock = mock.clock(on)
  mock.store(on, options.entries ?? {})
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: 'ok' }))
  on('prompt.compose', () => ({ sections: [{ id: 'base', text: 'You are Claude.', scope: 'shared' }] }))
  on('model.complete', () => ({ value: { isAnswered: true, text: DECISIONS, usage: USAGE } }))
  on('model.fork', () => ({ value: { isAnswered: true, text: 'I saw the duplicate lines in the test output.', usage: USAGE } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  return clock
}

async function runTurn(options: { $: Engine; clock: MockClock }): Promise<void> {
  const { $, clock } = options
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.turn.start({ turnId: 't1', text: 'Merge duplicate cart lines' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/demo/cart.js', old_string: 'a', new_string: 'b' })
  await $.turn.complete({ answer: 'Merged.', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(1600)
}

test('a finished turn shows its decisions as cards on every surface', async ($, on) => {
  const clock = engine({ on })
  await runTurn({ $, clock })
  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ ...PANE, surface })
    expect(await pane.find({ type: 'Text', text: '◆ Merge lines inside addItem' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: '◇ A separate mergeItems helper' })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'keep-1' })).toBeDefined()
    await pane.unmount()
  }
})

test('keep doing this saves a rule that reaches the system prompt', async ($, on) => {
  const clock = engine({ on })
  await runTurn({ $, clock })
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await pane.press({ key: 'keep-1' })
  expect(await pane.find({ type: 'Text', text: '✓ keep rule saved' })).toBeDefined()

  const composed = await $.prompt.compose(COMPOSE)
  const section = composed.sections.find(candidate => candidate.id === 'decision-lens:rules')
  expect(section?.scope).toBe('session')
  expect(section?.text).toContain('Keep doing:\n- Fix behavior at the single entry point.')
})

test('stored rules load at start, and ask why answers through the session model', async ($, on) => {
  const stored = [{ id: 'a', kind: 'avoid', text: 'Never add dependencies.', scope: 'global', createdAt: 1 }]
  const clock = engine({ on, entries: { 'rules:global': stored } })
  await runTurn({ $, clock })
  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.at(-1)?.text).toContain('Avoid:\n- Never add dependencies.')

  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await pane.press({ key: 'why-1' })
  expect(await pane.find({ type: 'Text', text: 'I saw the duplicate lines in the test output.' })).toBeDefined()
})

test('no rules leaves the system prompt untouched', async ($, on) => {
  engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map(section => section.id)).toEqual(['base'])
})

test('/why always opens on the latest turn, even after browsing back', async ($, on) => {
  const clock = engine({ on })
  await runTurn({ $, clock })
  await $.turn.start({ turnId: 't2', text: 'Second task with more words in it' })
  await $.turn.complete({ answer: 'Done.', durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer' })
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await pane.press({ key: 'previous' })
  expect(await pane.find({ type: 'Text', text: /turn 1 of 2/ })).toBeDefined()
  await $.command.run({ command: 'why', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 90 } })
  expect(await pane.find({ type: 'Text', text: /turn 2 of 2/ })).toBeDefined()
})
