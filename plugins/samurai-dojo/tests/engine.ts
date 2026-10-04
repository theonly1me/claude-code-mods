import { mock } from 'claude-code/testing'
import type { On } from 'claude-code'

export const ACTIVE_PATH = '/home/demo/.claude/mods/active-game'

export const DOCK_PROPS = {
  title: 'Samurai Dojo',
  isFocused: false,
  bodyColumns: 70,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
} as const

export type Recorder = {
  files: Map<string, string>
  opened: string[]
  closed: string[]
  toasts: string[]
}

export function engine(options: { on: On; files?: Readonly<Record<string, string>>; store?: Readonly<Record<string, unknown>> }) {
  const { on } = options
  const recorder: Recorder = { files: new Map(Object.entries(options.files ?? {})), opened: [], closed: [], toasts: [] }
  const clock = mock.clock(on)
  mock.store(on, options.store ?? {})
  mock.env(on, { HOME: '/home/demo' })
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('fs.read', ($, event) => {
    const text = recorder.files.get(event.path)
    if (text === undefined) {
      throw new Error('missing')
    }
    return { value: text }
  })
  on('fs.write', ($, event) => {
    recorder.files.set(event.path, event.text)
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', ($, event) => {
    recorder.opened.push(event.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, event) => {
    recorder.closed.push(event.id)
    return { value: undefined }
  })
  on('ui.toast', ($, event) => {
    recorder.toasts.push(event.text)
    return { value: undefined }
  })
  return { recorder, clock }
}

export const COMMAND = {
  command: 'dojo',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 160 },
} as const
