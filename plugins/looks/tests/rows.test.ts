import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { engine, SETTLED, start, VIEWPORT } from './engine'

const CASES = [
  {
    tool: 'Read',
    input: { file_path: '/demo/src/math.js' },
    output: { type: 'text', file: { filePath: '/demo/src/math.js', content: '', numLines: 42, startLine: 1, totalLines: 42 } },
    shows: ['Read', '  src/math.js', '  42 lines'],
  },
  {
    tool: 'Edit',
    input: { file_path: '/demo/src/math.js', old_string: 'a', new_string: 'b' },
    output: { structuredPatch: [{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 3, lines: [' x', '-a', '+b', '+c'] }] },
    shows: ['Edit', '  src/math.js', '  +2', '  -1'],
  },
  {
    tool: 'Write',
    input: { file_path: '/demo/src/new.js', content: 'one\ntwo\nthree' },
    output: { type: 'create', filePath: '/demo/src/new.js', content: 'one\ntwo\nthree', structuredPatch: [], originalFile: null },
    shows: ['Create', '  src/new.js', '  3 lines'],
  },
  {
    tool: 'Bash',
    input: { command: 'npm test\n# again', description: 'Run the tests' },
    output: { stdout: 'ok 1\nok 2\n', stderr: '', interrupted: false },
    shows: ['Run', '  npm test', '  2 lines'],
  },
  {
    tool: 'Grep',
    input: { pattern: 'add\\(', path: '/demo/src' },
    output: { numFiles: 3, filenames: ['a', 'b', 'c'] },
    shows: ['Search', '  "add\\(" in src', '  3 files'],
  },
  {
    tool: 'Glob',
    input: { pattern: '**/*.test.js' },
    output: { numFiles: 1, filenames: ['math.test.js'] },
    shows: ['Find', '  **/*.test.js', '  1 file'],
  },
] as const

async function mountTool(options: { $: Engine; tool: string; input: unknown; output?: unknown; isErrored?: boolean }) {
  return options.$.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'ToolUse',
    requestId: `call-${options.tool}`,
    viewport: VIEWPORT,
    props: { ...SETTLED, isErrored: options.isErrored ?? false, tool_use_id: `call-${options.tool}`, tool: options.tool, input: options.input, output: options.output },
  })
}

test('common tools draw as one compact line', { options: { toolCalls: 'compact', layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  for (const entry of CASES) {
    const row = await mountTool({ $, tool: entry.tool, input: entry.input, output: entry.output })
    for (const text of entry.shows) {
      expect(await row.find({ type: 'Text', text })).toBeDefined()
    }
    expect(await row.find({ text: 'engine row' })).toBeUndefined()
  }
})

test('a failed call shows the first line of its error', { options: { toolCalls: 'compact', layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  const row = await mountTool({ $, tool: 'Bash', input: { command: 'npm test' }, output: 'Error: 2 tests failed\nmore', isErrored: true })
  expect(await row.find({ type: 'Text', text: '  failed: Error: 2 tests failed' })).toBeDefined()
})

test('other tools get a one-line row named after the tool', { options: { toolCalls: 'compact', layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  const row = await mountTool({ $, tool: 'mcp__claude_ai_Docs__search_pages', input: { query: 'release notes', limit: 3 }, output: {} })
  expect(await row.find({ type: 'Text', text: 'Docs search pages' })).toBeDefined()
  expect(await row.find({ type: 'Text', text: '  release notes' })).toBeDefined()
  expect(await row.drawn()).toMatchObject({ type: 'Box', props: { paddingLeft: 30 } })
})

test('plan and question tools keep the engine rows, centered by padding', { options: { toolCalls: 'compact', layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  const row = await mountTool({ $, tool: 'ExitPlanMode', input: { plan: 'step one' }, output: {} })
  expect(await row.find({ text: 'engine row' })).toBeDefined()
  expect(await row.drawn()).toMatchObject({ type: 'Box', props: { paddingLeft: 30 } })

  const result = await $.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'ToolResult',
    requestId: 'call-plan',
    viewport: VIEWPORT,
    props: { tool_use_id: 'call-plan', tool: 'ExitPlanMode', output: {}, isErrored: false },
  })
  expect(await result.find({ text: 'engine row' })).toBeDefined()
})

test('results of compact tools are folded into their line', { options: { toolCalls: 'compact', layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  const result = await $.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'ToolResult',
    requestId: 'call-Read',
    props: { tool_use_id: 'call-Read', tool: 'Read', output: {}, isErrored: false },
  })
  expect(await result.find({ text: 'engine row' })).toBeUndefined()
})

test('an expanded group and the ctrl+o transcript show the full rows', { options: { toolCalls: 'compact', layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  const calls = [
    { tool: 'Read', input: { file_path: '/demo/a.js' }, ...SETTLED },
    { tool: 'Read', input: { file_path: '/demo/b.js' }, ...SETTLED },
    { tool: 'Bash', input: { command: 'ls' }, ...SETTLED },
  ]
  const folded = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'ToolGroup', requestId: 'g1', props: { calls, isActive: false, isExpanded: false } })
  expect(await folded.find({ type: 'Text', text: 'Read 2 files, ran 1 command' })).toBeDefined()
  const expanded = await $.ui.mount({ plugin: 'looks', surface: 'terminal', component: 'ToolGroup', requestId: 'g2', props: { calls, isActive: false, isExpanded: true } })
  expect(await expanded.find({ text: 'engine row' })).toBeDefined()

  await $.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'UserMessage',
    requestId: 'm1',
    props: { text: 'fix it', origin: { kind: 'composer' }, isExpanded: true },
  })
  const row = await mountTool({ $, tool: 'Read', input: { file_path: '/demo/a.js' }, output: {} })
  expect(await row.find({ text: 'engine row' })).toBeDefined()
})
