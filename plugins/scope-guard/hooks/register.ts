import type { PluginOptions, Register } from 'claude-code'

import { installBand } from './band'
import { installGuard } from './guard'
import { scopeReport, statusText } from './scope/messages'
import { configureScope, openFlags, resetScope, scopeView, setMode, setRoot } from './scope/state'
import type { ScopeMode, ScopeSettings } from './scope/types'

const MODE_KEY = 'mode'
const MODES: readonly ScopeMode[] = ['ask', 'flag', 'off']

function modeFrom(value: unknown): ScopeMode | undefined {
  return MODES.find(mode => mode === value)
}

function settingsFrom(options: PluginOptions): ScopeSettings {
  const model = options.confirmModel
  const manyFiles = Number(options.manyFiles)
  return {
    mode: modeFrom(options.mode) ?? 'ask',
    confirmModel: typeof model === 'string' && model.trim() !== '' ? model.trim() : 'claude-sonnet-5-5',
    manyFiles: Number.isFinite(manyFiles) && manyFiles >= 2 ? Math.round(manyFiles) : 8,
  }
}

function modeForAction(action: string): ScopeMode | undefined {
  if (action === 'on') {
    const configured = scopeView().settings.mode
    return configured === 'off' ? 'ask' : configured
  }
  return modeFrom(action)
}

export const register: Register = (on, options) => {
  resetScope()
  configureScope(settingsFrom(options))
  installGuard(on)
  installBand(on)

  on('session.start', async ($, e, next) => {
    setRoot(e.cwd)
    await $.command.register({
      name: 'scope',
      description: 'Scope Guard: show the task, allowed paths, and recent flags. on, off, ask, or flag sets the mode.',
      argumentHint: '[on|off|ask|flag]',
      immediate: true,
    })
    const saved = modeFrom(await $.store.get(MODE_KEY))
    if (saved) {
      setMode(saved)
    }
    return next(e)
  })

  on('command.run', { command: 'scope' }, async ($, e) => {
    const action = e.args.trim().toLowerCase()
    const mode = modeForAction(action)
    if (mode) {
      setMode(mode)
      await $.store.set(MODE_KEY, mode)
    } else if (action !== '') {
      return { text: `Unknown option "${action}". Use /scope, /scope on, /scope off, /scope ask, or /scope flag.` }
    }
    $.ui.status(mode === 'off' ? undefined : statusText(openFlags().length))
    $.ui.invalidate('ui.render')
    const view = scopeView()
    return {
      text: scopeReport({
        mode: view.mode,
        prompts: view.prompts,
        allowed: [...view.allowedPaths, ...[...view.allowedFolders].map(folder => `${folder}/`)],
        flags: view.flags,
      }),
    }
  })
}
