import { mock } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { On } from 'claude-code'

export const PANE = {
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
export const COMPOSE = { model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

export type Recorder = { clock: MockClock; opened: unknown[] }

export function engine(options: { on: On; entries?: Readonly<Record<string, unknown>> }): Recorder {
  const { on } = options
  const recorder: Recorder = { clock: mock.clock(on), opened: [] }
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
  on('ui.open', ($, event) => {
    recorder.opened.push(event)
    return { value: { isPlaced: true } }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  return recorder
}

export async function runTurn(options: { $: Engine; clock: MockClock }): Promise<void> {
  const { $, clock } = options
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.turn.start({ turnId: 't1', text: 'Merge duplicate cart lines' })
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/demo/cart.js', old_string: 'a', new_string: 'b' })
  await $.turn.complete({ answer: 'Merged.', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(1600)
}
