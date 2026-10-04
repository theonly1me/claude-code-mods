import { mock } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'

export const ACTIVE_FILE = '/home/demo/.claude/mods/active-game'

export const PANE_PROPS = {
  title: 'Pocket Familiar',
  isFocused: false,
  bodyColumns: 70,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
} as const

export const SAVED = { familiar: { fullness: 40, joy: 50, energy: 60, lifetimeXp: 19, lastSeenAt: 0 } }

export type Harness = { toasts: string[]; files: Map<string, string>; opened: string[]; closed: string[] }

export function petCommand(args: string) {
  return {
    command: 'pet',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  } as const
}

export function engine(options: { on: On; store?: Readonly<Record<string, unknown>>; files?: Readonly<Record<string, string>> }): Harness {
  const { on } = options
  const harness: Harness = { toasts: [], files: new Map(Object.entries({ [ACTIVE_FILE]: '', ...options.files })), opened: [], closed: [] }
  let panes: UiPane[] = []
  mock.clock(on)
  mock.store(on, options.store ?? {})
  mock.env(on, { HOME: '/home/demo' })
  on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [] }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('ui.toast', ($, event) => {
    harness.toasts.push(event.text)
    return { value: undefined }
  })
  on('fs.read', ($, event) => {
    const text = harness.files.get(event.path)
    if (text === undefined) {
      throw new Error(`missing ${event.path}`)
    }
    return { value: text }
  })
  on('fs.write', ($, event) => {
    harness.files.set(event.path, event.text)
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: panes }))
  on('ui.open', ($, event) => {
    harness.opened.push(event.id)
    panes = [{ id: event.id, title: event.title ?? event.id, isShown: true, isFocused: false, isPlaced: true }]
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, event) => {
    harness.closed.push(event.id)
    panes = []
    return { value: undefined }
  })
  return harness
}
