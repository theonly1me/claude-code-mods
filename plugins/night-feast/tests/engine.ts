import { mock } from 'claude-code/testing'
import type { On } from 'claude-code'

export const ACTIVE_PATH = '/home/demo/.claude/mods/active-game'

export const DOCK_PROPS = {
  title: 'Night Feast',
  isFocused: false,
  bodyColumns: 70,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
} as const

export const COMMAND = {
  command: 'feast',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 160 },
} as const

const USAGE = { startedAt: 0, context: { window: 200000, tokens: 80000, percent: 40 }, rateLimits: [] }

export type Recorder = { files: Map<string, string>; panes: Set<string>; toasts: string[] }

export function engine(options: { on: On; files?: Readonly<Record<string, string>> }) {
  const { on } = options
  const recorder: Recorder = { files: new Map(Object.entries(options.files ?? {})), panes: new Set(), toasts: [] }
  const clock = mock.clock(on)
  mock.store(on, { lifetimeFeeds: 10 })
  mock.env(on, { HOME: '/home/demo' })
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('session.usage', () => ({ value: USAGE }))
  on('turn.complete', () => ({ text: '' }))
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
  on('ui.panes', () => ({
    value: [...recorder.panes].map(id => ({ id, title: 'Night Feast', isShown: true, isFocused: false, isPlaced: true })),
  }))
  on('ui.open', ($, event) => {
    recorder.panes.add(event.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, event) => {
    recorder.panes.delete(event.id)
    return { value: undefined }
  })
  on('ui.toast', ($, event) => {
    recorder.toasts.push(event.text)
    return { value: undefined }
  })
  return { recorder, clock }
}
