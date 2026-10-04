import { expect, test } from 'claude-code/testing'

import { COMMAND, editResult, EM_DASH, engine, PANE } from './engine'

const CART = '/demo/src/cart.ts'
const LINES = [`// Sums the cart ${EM_DASH} fast`, '// Step one: add', '// Step two: sum', '// Step three: return', '// Step four: done', 'export const total = 0']

test('the pane lists findings by file and its buttons fix and clear them', async ($, on) => {
  const recorder = engine({ on })
  on('tool.call', () => ({ result: editResult({ path: CART, added: LINES }) }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.turn.start({ turnId: 't1', text: 'Add a cart total' })
  recorder.files.set(CART, LINES.join('\n'))
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: CART, old_string: 'a', new_string: LINES.join('\n') })

  const reply = await $.command.run({ ...COMMAND, args: '' })
  expect(reply).toEqual({ text: '0 removed, 2 open. In the pane, f sends open slop to Claude and Esc returns to the prompt.' })

  const pane = await $.ui.mount(PANE)
  expect(await pane.find({ type: 'Text', text: /f fix open  c clear removed/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'src/cart.ts' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'comment block' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'line 1  ' })).toBeDefined()

  await pane.press({ key: 'fix' })
  await recorder.clock.advance(10)
  expect(recorder.submitted.at(-1)).toContain('Unslop found slop in your recent changes')

  recorder.files.set(CART, 'export const total = 0')
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(await pane.find({ type: 'Text', text: '  ✓ removed ' })).toBeDefined()
  await pane.press({ key: 'clear' })
  expect(await pane.find({ type: 'Text', text: /No slop yet/ })).toBeDefined()
})

test('an unfocused pane says how to reach its keys, and fix with nothing open says so', async ($, on) => {
  const recorder = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const pane = await $.ui.mount({ ...PANE, props: { ...PANE.props, isFocused: false } })
  expect(await pane.find({ type: 'Text', text: /ctrl\+x tab to use the keys/ })).toBeDefined()
  expect(await $.command.run({ ...COMMAND, args: 'fix' })).toEqual({ text: 'No open slop to fix.' })
  await recorder.clock.advance(10)
  expect(recorder.submitted).toHaveLength(0)
})
