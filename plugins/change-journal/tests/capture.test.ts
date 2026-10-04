import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { MockClock } from 'claude-code/testing'

type MockedEngine = { writes: Map<string, string>; clock: MockClock }

const FOLDER = '/home/demo/.claude/change-journal/demo/abc'
const EDIT_RESULT = {
  filePath: '/demo/src/cart.ts',
  oldString: 'a',
  newString: 'b',
  originalFile: 'a\n',
  structuredPatch: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-a', '+b'] }],
  userModified: false,
  replaceAll: false,
}

function engineWithWrites(on: On): MockedEngine {
  const writes = new Map<string, string>()
  const clock = mock.clock(on)
  mock.store(on)
  mock.env(on, { HOME: '/home/demo' })
  on('session.id', () => ({ value: 'abc' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('fs.read', ($, event) => ({ value: writes.get(event.path) ?? `page file ${event.path}` }))
  on('fs.write', ($, event) => {
    writes.set(event.path, event.text)
    return { value: undefined }
  })
  on('process.run', () => ({
    value: { exitCode: 128, stdout: '', stderr: 'not a git repository', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('turn.complete', () => ({ text: '' }))
  return { writes, clock }
}

test('an edit reaches the page as a diff file and an index entry', async ($, on) => {
  const { writes, clock } = engineWithWrites(on)
  on('tool.call', () => ({ result: EDIT_RESULT }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: false })
  await $.turn.start({ turnId: 't1', text: 'Rename a to b' })

  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/demo/src/cart.ts', old_string: 'a', new_string: 'b' })
  await clock.advance(1100)

  expect(writes.get(`${FOLDER}/index.html`)).toContain('page/index.html')
  expect(writes.get(`${FOLDER}/edit-1.js`)).toContain('"+b"')
  const data = writes.get(`${FOLDER}/data.js`) ?? ''
  expect(data.startsWith('window.__changeJournal = ')).toBe(true)
  expect(data).toContain('"path":"src/cart.ts"')
  expect(data).toContain('"prompt":"Rename a to b"')
})

test('denied edits, secrets files, and test commands are recorded honestly', async ($, on) => {
  const { writes, clock } = engineWithWrites(on)
  on('tool.call', ($, event) => {
    if (event.tool === 'Bash') return { result: { stdout: '', stderr: 'boom', interrupted: false }, isError: true }
    if (event.tool_use_id === 'denied') return { deny: 'not allowed' }
    return { result: EDIT_RESULT }
  })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: false })
  await $.turn.start({ turnId: 't1', text: 'Try things' })

  await $.tool.call({ tool: 'Edit', tool_use_id: 'denied', file_path: '/demo/a.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'secret', file_path: '/demo/.env', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Bash', tool_use_id: 'test', command: 'npm test' })
  await clock.advance(1100)

  const data = writes.get(`${FOLDER}/data.js`) ?? ''
  expect(data).toContain('"status":"denied"')
  expect(data).toContain('content hidden')
  expect(writes.get(`${FOLDER}/edit-2.js`)).not.toContain('+b')
  expect(data).toContain('"command":"npm test","isPassing":false')
})

test('a finished turn gets a summary with behavior flows from the helper model', async ($, on) => {
  const { writes, clock } = engineWithWrites(on)
  const prompts: string[] = []
  on('tool.call', () => ({ result: EDIT_RESULT }))
  on('model.complete', ($, event) => {
    prompts.push(event.prompt)
    const text = JSON.stringify({
      title: 'Rename a to b',
      explanation: 'The value changed.',
      before: [{ text: 'Returns a', editIds: [] }],
      after: [{ text: 'Returns b', changed: true, editIds: [1] }],
      edits: [{ id: 1, why: 'The caller expects b.' }],
    })
    return { value: { isAnswered: true, text, usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }
  })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: false })
  await $.turn.start({ turnId: 't1', text: 'Rename a to b' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/demo/src/cart.ts', old_string: 'a', new_string: 'b' })
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(3100)

  expect(prompts[0]).toContain('src/cart.ts')
  const data = writes.get(`${FOLDER}/data.js`) ?? ''
  expect(data).toContain('"summaryStatus":"ready"')
  expect(data).toContain('"text":"Returns b","isChanged":true')
  expect(data).toContain('"reason":"The caller expects b.","isReasonInferred":true')
})

test('a reload in the same session keeps the page instead of wiping it', async ($, on) => {
  const { writes, clock } = engineWithWrites(on)
  on('tool.call', () => ({ result: EDIT_RESULT }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: false })
  await $.turn.start({ turnId: 't1', text: 'Rename a to b' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/demo/src/cart.ts', old_string: 'a', new_string: 'b' })
  await clock.advance(1100)

  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: false })
  await $.turn.start({ turnId: 't2', text: 'Second change' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e2', file_path: '/demo/src/other.ts', old_string: 'a', new_string: 'b' })
  await clock.advance(1100)

  const data = writes.get(`${FOLDER}/data.js`) ?? ''
  expect(data).toContain('"path":"src/cart.ts"')
  expect(data).toContain('"path":"src/other.ts"')
  expect(data).toContain('"hunkCount":1')
  expect(writes.has(`${FOLDER}/edit-2.js`)).toBe(true)
})
