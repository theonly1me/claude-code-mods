import { mock } from 'claude-code/testing'
import type { MockClock } from 'claude-code/testing'
import type { On } from 'claude-code'

export const EM_DASH = String.fromCodePoint(0x2014)
export const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
export const PANE = {
  plugin: 'unslop',
  surface: 'terminal',
  component: 'Pane',
  requestId: 'unslop',
  props: { title: 'Unslop', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const
export const COMPOSE = { model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const
export const COMMAND = { command: 'unslop', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const

export type Recorder = {
  clock: MockClock
  files: Map<string, string>
  statuses: (string | undefined)[]
  toasts: string[]
  submitted: string[]
  modelReplies: string[]
  releaseModel: () => void
}

export function editResult(options: { path: string; added: readonly string[] }) {
  return {
    filePath: options.path,
    oldString: 'a',
    newString: options.added.join('\n'),
    originalFile: 'a\n',
    structuredPatch: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: options.added.length, lines: ['-a', ...options.added.map(line => `+${line}`)] }],
    userModified: false,
    replaceAll: false,
  }
}

export function engine(options: { on: On; isModelHeld?: boolean }): Recorder {
  const { on } = options
  const held: (() => void)[] = []
  const recorder: Recorder = {
    clock: mock.clock(on),
    files: new Map(),
    statuses: [],
    toasts: [],
    submitted: [],
    modelReplies: [],
    releaseModel: () => held.splice(0).forEach(release => release()),
  }
  mock.store(on, {})
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', ($, event) => ({ value: recorder.files.get(event.path) ?? '' }))
  on('model.complete', async () => {
    if (options.isModelHeld === true) {
      await new Promise<void>(resolve => held.push(resolve))
    }
    return { value: { isAnswered: true, text: recorder.modelReplies.shift() ?? '{"findings":[]}', usage: USAGE } }
  })
  on('prompt.submit', ($, event) => {
    recorder.submitted.push(event.text)
    return { text: event.text }
  })
  on('prompt.compose', () => ({ sections: [] }))
  on('ui.status', ($, event) => {
    recorder.statuses.push(event.text)
    return { value: undefined }
  })
  on('ui.toast', ($, event) => {
    recorder.toasts.push(event.text)
    return { value: undefined }
  })
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('turn.complete', () => ({ text: '' }))
  return recorder
}
