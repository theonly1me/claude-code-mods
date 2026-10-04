import { mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { ConfigRow, On } from 'claude-code'

export type Recorder = { baseTheme: string; sets: string[]; toasts: string[]; opened: string[] }

export const COMMAND = { command: 'looks', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const
export const SETTLED = { isRunning: false, isErrored: false, isInterrupted: false } as const
export const VIEWPORT = { columns: 160, rows: 50, isFullscreen: true } as const

function themeRow(value: string): ConfigRow {
  return {
    key: 'theme',
    label: 'Theme',
    kind: 'choice',
    value,
    options: ['auto', 'dark', 'light', 'light-daltonized', 'dark-daltonized', 'light-ansi', 'dark-ansi'],
    provider: { plugin: 'engine', tier: 'core' },
    isLocked: false,
  }
}

export function engine(options: { on: On; baseTheme?: string; store?: Readonly<Record<string, unknown>> }): Recorder {
  const { on } = options
  const recorder: Recorder = { baseTheme: options.baseTheme ?? 'dark-daltonized', sets: [], toasts: [], opened: [] }
  mock.store(on, options.store ?? {})
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('config.list', () => ({ value: [themeRow(recorder.baseTheme)] }))
  on('config.set', ($, event) => {
    recorder.sets.push(String(event.value))
    recorder.baseTheme = String(event.value)
    return { value: event.value }
  })
  on('ui.open', ($, event) => {
    recorder.opened.push(event.id)
    return { value: { isPlaced: true } }
  })
  on('ui.toast', ($, event) => {
    recorder.toasts.push(event.text)
    return { value: undefined }
  })
  on('ui.render', ($, event) => {
    const { Text } = $.ui.resolve(event)
    return Text({ children: ['engine row'] })
  })
  return recorder
}

export async function start($: Engine): Promise<void> {
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
}

export async function runTheme(options: { $: Engine; args: string }): Promise<string | undefined> {
  const result = await options.$.command.run({ ...COMMAND, args: options.args })
  return result.text
}
