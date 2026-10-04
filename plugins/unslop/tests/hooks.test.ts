import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { COMMAND, COMPOSE, editResult, EM_DASH, engine } from './engine'

const DASH_LINE = `// Sums the cart ${EM_DASH} fast`
const CART = '/demo/src/cart.ts'

async function start($: Engine): Promise<void> {
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.turn.start({ turnId: 't1', text: 'Add a cart total' })
}

async function finish($: Engine): Promise<void> {
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
}

test('slop in an edit reaches Claude in the tool result context', async ($, on) => {
  engine({ on })
  on('tool.call', () => ({ result: editResult({ path: CART, added: [DASH_LINE, 'export const total = 0'] }) }))
  await start($)
  const ran = await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: CART, old_string: 'a', new_string: DASH_LINE })
  expect(ran.context?.[0]).toContain('Unslop found slop in what you just added to src/cart.ts')
  expect(ran.context?.[0]).toContain('line 1 (dash)')
  expect(ran.context?.[0]).toContain(DASH_LINE)
})

test('a clean edit and an ignored file add no context', async ($, on) => {
  engine({ on })
  on('tool.call', ($, event) => ({
    result: editResult({ path: event.tool === 'Edit' ? event.file_path : '', added: event.tool === 'Edit' ? [event.new_string] : [] }),
  }))
  await start($)
  const clean = await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: CART, old_string: 'a', new_string: 'export const total = 0' })
  const vendored = await $.tool.call({ tool: 'Edit', tool_use_id: 'e2', file_path: '/demo/node_modules/x/index.js', old_string: 'a', new_string: DASH_LINE })
  expect(clean.context).toBeUndefined()
  expect(vendored.context).toBeUndefined()
})

test('slop Claude removes later is counted as removed', async ($, on) => {
  const recorder = engine({ on })
  on('tool.call', () => ({ result: editResult({ path: CART, added: [DASH_LINE] }) }))
  await start($)
  recorder.files.set(CART, `${DASH_LINE}\n`)
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: CART, old_string: 'a', new_string: DASH_LINE })
  expect(recorder.statuses.at(-1)).toBe('0 removed, 1 open  /unslop')

  recorder.files.set(CART, '// Sums the cart, fast\n')
  await finish($)
  expect(recorder.statuses.at(-1)).toBe('1 removed, 0 open  /unslop')
})

test('model findings after the turn wait for /unslop fix', async ($, on) => {
  const recorder = engine({ on, isModelHeld: true })
  const test = "test('adds', () => {\n  try { cart.add(item) } catch (error) { throw error }\n})"
  recorder.files.set('/demo/src/cart.test.ts', test)
  recorder.modelReplies.push('{"findings":[{"line":"try { cart.add(item) } catch (error) { throw error }","kind":"code","fix":"Remove the try and catch."}]}')
  on('tool.call', () => ({ result: { type: 'create', filePath: '/demo/src/cart.test.ts', content: test, structuredPatch: [], originalFile: null } }))
  await start($)
  const ran = await $.tool.call({ tool: 'Write', tool_use_id: 'w1', file_path: '/demo/src/cart.test.ts', content: test })
  expect(ran.context?.[0]).toContain('This test asserts nothing')
  await finish($)
  recorder.releaseModel()
  await recorder.clock.advance(10)
  expect(recorder.statuses.at(-1)).toBe('0 removed, 2 open, 1 waiting  /unslop fix')

  const reply = await $.command.run({ ...COMMAND, args: 'fix' })
  await recorder.clock.advance(10)
  expect(reply).toEqual({ text: 'Asked Claude to remove 2 pieces of slop.' })
  expect(recorder.submitted.at(-1)).toContain('src/cart.test.ts (needless code): `try { cart.add(item) } catch (error) { throw error }` Remove the try and catch.')
  expect(recorder.statuses.at(-1)).toBe('0 removed, 2 open  /unslop')
})

test('the chat style rule joins the system prompt while Unslop is on', async ($, on) => {
  engine({ on })
  await start($)
  const composed = await $.prompt.compose(COMPOSE)
  const style = composed.sections.find(section => section.id === 'unslop:style')
  expect(style?.text).toContain('ASD-STE100')
  expect(style?.text).toContain('Do not use the em dash or the en dash')

  await $.command.run({ ...COMMAND, args: 'off' })
  expect((await $.prompt.compose(COMPOSE)).sections.some(section => section.id === 'unslop:style')).toBe(false)
})

test('the chat style setting turns the rule off', { options: { chatStyle: false } }, async ($, on) => {
  engine({ on })
  await start($)
  expect((await $.prompt.compose(COMPOSE)).sections).toHaveLength(0)
})
