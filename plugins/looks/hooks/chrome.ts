import type { On } from 'claude-code'

import { currentTheme } from './looks/state'
import { pickWord } from './looks/themes'

export function installChrome(on: On): void {
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const theme = currentTheme()
    if (e.surface !== 'terminal' || !theme || e.props.message !== null) {
      return next(e)
    }
    const word = pickWord({ words: theme.spinnerWords, seed: e.props.word })
    return next({ ...e, props: { ...e.props, word, suffix: theme.spinnerSuffix } })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const theme = currentTheme()
    if (e.surface !== 'terminal' || !theme) {
      return next(e)
    }
    return next({ ...e, props: { ...e.props, word: pickWord({ words: theme.doneWords, seed: e.requestId }) } })
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const theme = currentTheme()
    if (e.surface !== 'terminal' || !theme) {
      return next(e)
    }
    const tail = [e.props.tail, `${theme.toolMark} ${theme.label}`].filter(part => part !== undefined && part !== '').join('  ')
    return next({ ...e, props: { ...e.props, tail } })
  })
}
