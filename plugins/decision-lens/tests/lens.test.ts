import { expect, test } from 'claude-code/testing'

import { COMPOSE, engine, PANE, runTurn } from './engine'

test('a finished turn shows its decisions as cards on every surface', async ($, on) => {
  const { clock } = engine({ on })
  await runTurn({ $, clock })
  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ ...PANE, surface })
    expect(await pane.find({ type: 'Button', key: 'card-1' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: '◇ A separate mergeItems helper' })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'keep-1' })).toBeDefined()
    await pane.unmount()
  }
})

test('keep doing this saves a rule that reaches the system prompt', async ($, on) => {
  const { clock } = engine({ on })
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
  const { clock } = engine({ on, entries: { 'rules:global': stored } })
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
  const { clock } = engine({ on })
  await runTurn({ $, clock })
  await $.turn.start({ turnId: 't2', text: 'Second task with more words in it' })
  await $.turn.complete({ answer: 'Done.', durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer' })
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await pane.press({ key: 'previous' })
  expect(await pane.find({ type: 'Text', text: /turn 1 of 2/ })).toBeDefined()
  await $.command.run({ command: 'why', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 90 } })
  expect(await pane.find({ type: 'Text', text: /turn 2 of 2/ })).toBeDefined()
})
