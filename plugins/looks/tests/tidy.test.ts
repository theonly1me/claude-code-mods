import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { engine, SETTLED, start } from './engine'

const LONG_OUTPUT = Array.from({ length: 9 }, (_, index) => `line ${index + 1}`).join('\n')

async function mountResult(options: { $: Engine; tool: string; output: unknown; isErrored?: boolean }) {
  return options.$.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'ToolResult',
    requestId: `result-${options.tool}`,
    props: { tool_use_id: `result-${options.tool}`, tool: options.tool, output: options.output, isErrored: options.isErrored ?? false },
  })
}

async function colorOf(options: { mounted: Awaited<ReturnType<typeof mountResult>>; text: string }): Promise<unknown> {
  const matches = await options.mounted.findAll({ type: 'Text', text: options.text })
  return matches.at(-1)?.props.color
}

async function mountUse(options: { $: Engine; tool: string; input: unknown; output: unknown }) {
  return options.$.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'ToolUse',
    requestId: `use-${options.tool}`,
    props: { ...SETTLED, tool_use_id: `use-${options.tool}`, tool: options.tool, input: options.input, output: options.output },
  })
}

test('by default a tool call is one header line and its output sits under it in a bar', async ($, on) => {
  engine({ on })
  await start($)
  const use = await mountUse({ $, tool: 'Bash', input: { command: 'npm test' }, output: { stdout: 'ok 1', stderr: '' } })
  expect(await use.find({ type: 'Text', text: 'Run' })).toBeDefined()
  expect(await use.find({ text: 'engine row' })).toBeUndefined()

  const result = await mountResult({ $, tool: 'Bash', output: { stdout: 'ok 1\nok 2\n', stderr: '' } })
  expect(await result.find({ type: 'Text', text: 'ok 2' })).toBeDefined()
  expect(await result.find({ type: 'Text', text: '│ ' })).toBeDefined()
  expect(await result.find({ text: 'engine row' })).toBeUndefined()
})

test('long output is cut to six lines with a hint for the rest', async ($, on) => {
  engine({ on })
  await start($)
  const result = await mountResult({ $, tool: 'Bash', output: { stdout: LONG_OUTPUT, stderr: '' } })
  expect(await result.find({ type: 'Text', text: 'line 6' })).toBeDefined()
  expect(await result.find({ type: 'Text', text: 'line 7' })).toBeUndefined()
  expect(await result.find({ type: 'Text', text: '3 more lines (ctrl+o for all)' })).toBeDefined()
})

test('an edit shows its changed lines in green and red, without the context', async ($, on) => {
  engine({ on })
  await start($)
  const output = { structuredPatch: [{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 2, lines: [' keep', '-old', '+new'] }] }
  const result = await mountResult({ $, tool: 'Edit', output })
  expect((await colorOf({ mounted: result, text: '+new' }))).toBe('green')
  expect((await colorOf({ mounted: result, text: '-old' }))).toBe('red')
  expect(await result.find({ type: 'Text', text: ' keep' })).toBeUndefined()
})

test('reads, searches, and calls with no output add no result lines', async ($, on) => {
  engine({ on })
  await start($)
  for (const tool of ['Read', 'Grep', 'Glob']) {
    const result = await mountResult({ $, tool, output: { numFiles: 2 } })
    expect(await result.find({ type: 'Text' })).toBeUndefined()
    expect(await result.find({ text: 'engine row' })).toBeUndefined()
  }
  const quiet = await mountResult({ $, tool: 'Bash', output: { stdout: '', stderr: '' } })
  expect(await quiet.find({ type: 'Text' })).toBeUndefined()
})

test('a failed call shows the first lines of its error in red', async ($, on) => {
  engine({ on })
  await start($)
  const result = await mountResult({ $, tool: 'Bash', output: 'Error: exit code 1\nboom', isErrored: true })
  expect(await colorOf({ mounted: result, text: 'Error: exit code 1' })).toBe('red')
  expect(await colorOf({ mounted: result, text: 'boom' })).toBe('red')
})

test('tools Looks does not know keep the engine result', async ($, on) => {
  engine({ on })
  await start($)
  const result = await mountResult({ $, tool: 'TodoWrite', output: {} })
  expect(await result.find({ text: 'engine row' })).toBeDefined()
})

test('toolCalls plain leaves every row to Claude Code', { options: { toolCalls: 'plain' } }, async ($, on) => {
  engine({ on })
  await start($)
  const use = await mountUse({ $, tool: 'Bash', input: { command: 'ls' }, output: { stdout: 'a', stderr: '' } })
  expect(await use.find({ text: 'engine row' })).toBeDefined()
  const result = await mountResult({ $, tool: 'Bash', output: { stdout: 'a', stderr: '' } })
  expect(await result.find({ text: 'engine row' })).toBeDefined()
})
