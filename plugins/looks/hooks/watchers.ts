import type { On } from 'claude-code'

import { activeChoice, SAVED_BASE_KEY, setBaseThemeInfo, setTone, setVerbose } from './looks/state'
import { toneOf } from './looks/themes'

export function installWatchers(on: On): void {
  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    if (e.origin?.kind === 'composer' && typeof result.value === 'string' && activeChoice() !== 'off') {
      setBaseThemeInfo({ current: result.value, saved: result.value })
      setTone(toneOf(result.value))
      await $.store.set(SAVED_BASE_KEY, result.value)
      $.ui.invalidate('ui.render')
    }
    return result
  })

  on('config.set', { key: 'verbose' }, async ($, e, next) => {
    const result = await next(e)
    if (typeof result.value === 'boolean') {
      setVerbose(result.value)
      $.ui.invalidate('ui.render')
    }
    return result
  })
}
