import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { COMPOSE, engine, PANE, runTurn } from './engine'

const PRESENTATION = { isFullscreen: true, columns: 160 } as const

async function why(options: { $: Engine; args: string }): Promise<string> {
  const result = await options.$.command.run({ command: 'why', args: options.args, origin: { kind: 'composer' }, presentation: PRESENTATION })
  return 'text' in result && typeof result.text === 'string' ? result.text : ''
}

test('/why opens the pane with the keys and a hint row that names them', async ($, on) => {
  const recorder = engine({ on })
  await runTurn({ $, clock: recorder.clock })
  expect(await why({ $, args: '' })).toMatch(/Esc gives them back/)
  expect(recorder.opened).toHaveLength(1)
  expect(recorder.opened[0]).toMatchObject({ id: 'decision-lens', focus: true })
  expect(recorder.opened[0]).not.toHaveProperty('closeOnEscape')

  const focused = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await focused.find({ type: 'Text', text: /1-5: pick a card {2}k: keep {2}a: avoid {2}w: ask why/ })).toBeDefined()
  expect(await focused.find({ type: 'Button', key: 'card-1' })).toMatchObject({ props: { hotkey: '1' } })
  expect(await focused.find({ type: 'Button', key: 'keep-1' })).toMatchObject({ props: { hotkey: 'k' } })
  await focused.unmount()

  const unfocused = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PANE.props, isFocused: false } })
  expect(await unfocused.find({ type: 'Text', text: /ctrl\+x tab: use the keys here/ })).toBeDefined()
})

test('/why keep 1 saves the card rule without opening the pane', async ($, on) => {
  const recorder = engine({ on })
  await runTurn({ $, clock: recorder.clock })
  expect(await why({ $, args: 'keep 1' })).toBe('Saved keep rule: Fix behavior at the single entry point.')
  expect(await why({ $, args: 'keep 1' })).toMatch(/already saved/)
  expect(recorder.opened).toHaveLength(0)
  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.at(-1)?.text).toContain('Keep doing:\n- Fix behavior at the single entry point.')
})

test('/why avoid N names a missing card and the usage', async ($, on) => {
  const recorder = engine({ on })
  await runTurn({ $, clock: recorder.clock })
  expect(await why({ $, args: 'avoid 2' })).toMatch(/There is no card 2/)
  expect(await why({ $, args: 'avoid 1' })).toBe('Saved avoid rule: Do not change existing functions without asking.')
  expect(await why({ $, args: 'please' })).toMatch(/\/why keep N, \/why avoid N, \/why ask N/)
})

test('/why ask 1 opens the pane and the answer lands on the card', async ($, on) => {
  const recorder = engine({ on })
  await runTurn({ $, clock: recorder.clock })
  expect(await why({ $, args: 'ask 1' })).toMatch(/Asking Claude why it chose "Merge lines inside addItem"/)
  expect(recorder.opened[0]).toMatchObject({ focus: true })
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await pane.find({ type: 'Text', text: 'I saw the duplicate lines in the test output.' })).toBeDefined()
})

test('the rules tab numbers each rule and removes one on press', async ($, on) => {
  const recorder = engine({ on })
  await runTurn({ $, clock: recorder.clock })
  await why({ $, args: 'keep 1' })
  await why({ $, args: 'rules' })
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await pane.find({ type: 'Text', text: /Tab: next button {2}Enter: press it/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: '1. ' })).toBeDefined()
  const [rule] = await pane.findAll({ type: 'Button', text: 'Remove' })
  expect(rule).toBeDefined()
  await pane.press({ key: String(rule?.props.key) })
  expect(await pane.find({ type: 'Text', text: /No rules yet/ })).toBeDefined()
})
