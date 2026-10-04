import type { On } from 'claude-code'

import { divider } from './looks/rich'
import { currentLook, currentTheme, isThemeWords, looksSettings } from './looks/state'
import { pickWord } from './looks/themes'

export function installChrome(on: On): void {
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const theme = currentTheme()
    if (e.surface !== 'terminal' || !theme || !isThemeWords() || e.props.message !== null) {
      return next(e)
    }
    const word = pickWord({ words: theme.spinnerWords, seed: e.props.word })
    return next({ ...e, props: { ...e.props, word, suffix: theme.spinnerSuffix } })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const theme = currentTheme()
    const look = currentLook()
    if (e.surface === 'terminal' && look) {
      const { Box, Text } = $.ui.resolve(e)
      const width = Math.min(looksSettings().readingWidth, e.viewport?.columns ?? looksSettings().readingWidth)
      const word = theme && isThemeWords() ? pickWord({ words: theme.doneWords, seed: e.requestId }) : e.props.word
      return divider({ Box, Text, look, width, word, durationMs: e.props.durationMs })
    }
    if (e.surface !== 'terminal' || !theme || !isThemeWords()) {
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
