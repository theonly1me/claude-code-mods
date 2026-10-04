import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const TASK = 'Fix the rounding bug in math.js'
const BAND = {
  plugin: 'scope-guard',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const
const EDIT_RESULT = {
  filePath: '/demo/docs/notes.md',
  oldString: 'a',
  newString: 'b',
  originalFile: 'a\n',
  structuredPatch: [],
  userModified: false,
  replaceAll: false,
}

type Recorder = { questions: string[]; edits: string[]; submitted: string[]; toasts: string[] }

function engine(options: { on: On; verdict?: string; answer?: string; store?: Readonly<Record<string, unknown>> }): Recorder {
  const { on } = options
  const recorder: Recorder = { questions: [], edits: [], submitted: [], toasts: [] }
  mock.clock(on)
  mock.store(on, options.store ?? {})
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('fs.read', () => {
    throw new Error('missing')
  })
  on('model.complete', () =>
    options.verdict === undefined
      ? { value: { isAnswered: false, reason: 'empty-reply', usage: USAGE } }
      : { value: { isAnswered: true, text: JSON.stringify({ verdict: options.verdict, reason: 'The request is about math.js only.' }), usage: USAGE } },
  )
  on('tool.call', ($, event) => {
    if (event.tool === 'AskUserQuestion') {
      const [question] = event.questions
      recorder.questions.push(question?.question ?? '')
      if (options.answer === undefined) {
        return { deny: 'dismissed' }
      }
      return { result: { questions: event.questions, answers: { [question?.question ?? '']: options.answer } } }
    }
    if (event.tool === 'Edit' || event.tool === 'Write') {
      recorder.edits.push(event.file_path)
    }
    return { result: EDIT_RESULT }
  })
  on('prompt.submit', ($, event) => {
    recorder.submitted.push(event.text)
    return { text: event.text }
  })
  on('ui.toast', ($, event) => {
    recorder.toasts.push(event.text)
    return { value: undefined }
  })
  on('ui.status', () => ({ value: undefined }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('turn.complete', () => ({ text: '' }))
  return recorder
}

async function startTask($: Engine): Promise<void> {
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: TASK, wait: false, origin: { kind: 'composer' } })
  await $.turn.start({ turnId: 't1', text: TASK })
}

function editOf(path: string) {
  return { tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b' } as const
}

test('clear drift asks first, and Stop denies the edit with a reason for Claude', async ($, on) => {
  const recorder = engine({ on, verdict: 'clear', answer: 'Stop' })
  await startTask($)
  const ran = await $.tool.call(editOf('/demo/docs/notes.md'))

  expect(recorder.questions).toEqual(['Claude wants to edit docs/notes.md, outside your request. The request is about math.js only. Allow it?'])
  expect(ran.deny).toMatch(/^Scope Guard: the user stopped this change/)
  expect(recorder.edits).toEqual([])
})

test('Allow for this task runs the edit and skips the question for that folder', async ($, on) => {
  const recorder = engine({ on, verdict: 'clear', answer: 'Allow for this task' })
  await startTask($)
  await $.tool.call(editOf('/demo/docs/notes.md'))
  await $.tool.call(editOf('/demo/docs/guide.md'))

  expect(recorder.questions).toHaveLength(1)
  expect(recorder.edits).toEqual(['/demo/docs/notes.md', '/demo/docs/guide.md'])
})

test('a file the request names never reaches the model or the dialog', async ($, on) => {
  const recorder = engine({ on, verdict: 'clear', answer: 'Stop' })
  await startTask($)
  const ran = await $.tool.call(editOf('/demo/math.js'))

  expect(ran.deny).toBeUndefined()
  expect(recorder.questions).toEqual([])
})

test('mild drift runs and shows a band whose keys resolve it', async ($, on) => {
  const recorder = engine({ on, verdict: 'mild' })
  await startTask($)
  await $.tool.call(editOf('/demo/docs/notes.md'))
  const band = await $.ui.mount(BAND)

  expect(recorder.edits).toEqual(['/demo/docs/notes.md'])
  expect(await band.find({ type: 'Text', text: 'Claude chose to edit docs/notes.md, which looks outside your request.' })).toBeDefined()
  expect((await band.find({ type: 'Button', key: 'folder' }))?.props.label).toBe('Allow docs/')
  await band.press({ key: 'fine' })
  expect((await band.findAll({ type: 'Button' })).length).toBe(0)
})

test('a number typed with Enter answers the flag, and pull back after the turn becomes the prompt', async ($, on) => {
  const recorder = engine({ on, verdict: 'mild' })
  await startTask($)
  await $.tool.call(editOf('/demo/docs/notes.md'))
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

  const answered = await $.prompt.submit({ text: '7', wait: false, origin: { kind: 'composer' } })
  expect(answered.text).toMatch(/^Scope Guard: the user asks you to stay inside their request\. You chose to edit docs\/notes\.md/)
  const ordinary = await $.prompt.submit({ text: '7', wait: false, origin: { kind: 'composer' } })
  expect(ordinary).toEqual({ text: '7' })
})

test('without the model the rules decide, and a dismissed dialog flags the edit', async ($, on) => {
  const recorder = engine({ on })
  await startTask($)
  await $.tool.call(editOf('/demo/docs/notes.md'))
  const band = await $.ui.mount(BAND)
  expect(recorder.questions).toEqual([])
  expect(await band.find({ type: 'Button', key: 'pull' })).toBeDefined()

  await $.tool.call({ tool: 'Bash', command: 'rm -rf docs/old' })
  expect(recorder.questions).toHaveLength(1)
  expect(await band.find({ type: 'Text', text: /\+1 more/ })).toBeDefined()
})

test('flag mode never opens the dialog, and /scope reports the task and flags', async ($, on) => {
  const recorder = engine({ on, verdict: 'clear', answer: 'Stop', store: { mode: 'flag' } })
  await startTask($)
  const ran = await $.tool.call(editOf('/demo/docs/notes.md'))
  expect(ran.deny).toBeUndefined()
  expect(recorder.questions).toEqual([])

  const command = { command: 'scope', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as const
  const report = await $.command.run({ ...command, args: '' })
  expect(report.text).toContain('Task: "Fix the rounding bug in math.js"')
  expect(report.text).toContain('open    edit docs/notes.md')
  const off = await $.command.run({ ...command, args: 'off' })
  expect(off.text).toMatch(/^Scope Guard is off/)
})
