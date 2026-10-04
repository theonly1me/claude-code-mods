import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { On } from 'claude-code'

const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const QUESTIONS = JSON.stringify({
  questions: [
    { text: 'Should an empty cart be deleted?', why: 'Decides if empty carts exist.', options: ['Delete it', 'Keep it'] },
    { text: 'Do totals include tax?', why: 'Changes the math.', options: ['Yes', 'No'] },
  ],
})
const BAND = {
  plugin: 'grill',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const
const TASK = 'Add a cart total endpoint that sums every line in the cart'

type Recorder = { clock: MockClock; toasts: string[]; submitted: string[]; requests: { model: string; effort: unknown }[] }

function engine(options: { on: On; store?: Readonly<Record<string, unknown>> }): Recorder {
  const { on } = options
  const recorder: Recorder = { clock: mock.clock(on), toasts: [], submitted: [], requests: [] }
  mock.store(on, options.store ?? {})
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'src/cart.ts\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('model.complete', ($, event) => {
    recorder.requests.push({ model: event.model, effort: event.effort })
    return { value: { isAnswered: true, text: QUESTIONS, usage: USAGE } }
  })
  on('prompt.submit', ($, event) => {
    recorder.submitted.push(event.text)
    return { text: event.text }
  })
  on('ui.toast', ($, event) => {
    recorder.toasts.push(event.text)
    return { value: undefined }
  })
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('turn.complete', () => ({ text: '' }))
  return recorder
}

async function submitTask(options: { $: Engine; text: string }): Promise<void> {
  await options.$.prompt.submit({ text: options.text, wait: false, origin: { kind: 'composer' } })
}

test('a task prompt starts a round whose answers reach the running turn', async ($, on) => {
  const recorder = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await submitTask({ $, text: TASK })
  await $.turn.start({ turnId: 't1', text: TASK })
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Text', text: /Grill is reading your request/ })).toBeDefined()

  await recorder.clock.advance(500)
  expect(await band.find({ type: 'Text', text: 'Should an empty cart be deleted?' })).toBeDefined()
  expect(recorder.requests).toEqual([{ model: 'claude-sonnet-5-5', effort: 'medium' }])
  await band.press({ key: 'option-1' })

  expect(recorder.toasts.at(-1)).toMatch(/Answer sent to Claude|could not take this mid-turn/)
  expect(await band.find({ type: 'Text', text: 'Do totals include tax?' })).toBeDefined()
})

test('answers given after the turn ends are sent as one prompt', async ($, on) => {
  const recorder = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await submitTask({ $, text: TASK })
  await $.turn.start({ turnId: 't1', text: TASK })
  await recorder.clock.advance(500)
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  const band = await $.ui.mount(BAND)
  await band.press({ key: 'option-2' })
  await band.press({ key: 'skip' })

  expect(recorder.toasts).toHaveLength(0)
  expect(await band.find({ type: 'Text', text: /finished before reading 1 of your answers/ })).toBeDefined()
  await band.press({ key: 'send' })
  expect(recorder.submitted.at(-1)).toContain('- Should an empty cart be deleted? Keep it')
})

test('typing 1 and Enter after the turn sends the waiting answers as the prompt', async ($, on) => {
  const recorder = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await submitTask({ $, text: TASK })
  await $.turn.start({ turnId: 't1', text: TASK })
  await recorder.clock.advance(500)
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  const band = await $.ui.mount(BAND)
  await band.press({ key: 'option-2' })
  await band.press({ key: 'skip' })

  await submitTask({ $, text: '1' })

  expect(recorder.submitted.at(-1)).toContain('- Should an empty cart be deleted? Keep it')
})

test('short prompts, slash commands, and off mode never start a round', async ($, on) => {
  const recorder = engine({ on, store: { mode: 'off' } })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await submitTask({ $, text: TASK })
  await recorder.clock.advance(500)
  const band = await $.ui.mount(BAND)
  expect((await band.findAll({ type: 'Button' })).length).toBe(0)

  const command = { command: 'grill', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as const
  await $.command.run({ ...command, args: 'grill' })
  await submitTask({ $, text: 'fix it' })
  await submitTask({ $, text: '/review the whole repository for every possible problem today' })
  expect((await band.findAll({ type: 'Button' })).length).toBe(0)

  await $.command.run({ ...command, args: 'ask' })
  await recorder.clock.advance(500)
  expect(await band.find({ type: 'Button', key: 'option-1' })).toBeDefined()
})

test('the side chat answers, and sharing puts notes into the prompt', async ($, on) => {
  const recorder = engine({ on })
  const filled: string[] = []
  on('prompt.fill', ($, event) => {
    filled.push(event.text)
    return { isFilled: true, text: event.text, cursor: event.text.length }
  })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const chat = await $.ui.mount({
    plugin: 'grill',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'grill-chat',
    props: { title: 'Side chat', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
  })
  await chat.input({ key: 'message', text: 'Should totals be cached?' })
  expect(await chat.find({ type: 'Text', text: 'partner  thinking…' })).toBeDefined()
  await recorder.clock.advance(500)
  expect(await chat.find({ type: 'Text', text: /Should an empty cart be deleted/ })).toBeDefined()

  await chat.press({ key: 'share' })
  await recorder.clock.advance(500)
  expect(filled[0]).toContain('Notes from my side chat:')
})

test('a number typed with Enter answers the open question instead of reaching Claude', async ($, on) => {
  const recorder = engine({ on })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await submitTask({ $, text: TASK })
  await $.turn.start({ turnId: 't1', text: TASK })
  await recorder.clock.advance(500)

  const answered = await $.prompt.submit({ text: '2', wait: false, origin: { kind: 'composer' }, turnId: 't1' })
  expect(answered).toEqual({ drop: 'Grill: Keep it' })
  const ordinary = await $.prompt.submit({ text: '9', wait: false, origin: { kind: 'composer' }, turnId: 't1' })
  expect(ordinary).toEqual({ text: '9' })
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Text', text: 'Do totals include tax?' })).toBeDefined()
})
