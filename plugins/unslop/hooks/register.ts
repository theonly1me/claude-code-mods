import type { Register } from 'claude-code'

import { installEdits } from './edits'
import { installPane } from './pane'
import { statusLine, STYLE_SECTION_ID, STYLE_TEXT } from './slop/notes'
import { configureUnslop, counts, ON_STORE_KEY, resetUnslop, setOn, unslopView } from './slop/state'

const DEFAULT_COMMENT_BLOCK_LINES = 4
const MIN_COMMENT_BLOCK_LINES = 2

function textOption(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : 'haiku'
}

function blockLinesOption(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_COMMENT_BLOCK_LINES ? Math.round(value) : DEFAULT_COMMENT_BLOCK_LINES
}

export const register: Register = (on, options) => {
  configureUnslop({
    chatStyle: options.chatStyle !== false,
    modelPass: options.modelPass !== false,
    detectModel: textOption(options.detectModel),
    commentBlockLines: blockLinesOption(options.commentBlockLines),
  })
  installEdits(on)
  installPane(on)

  on('session.start', async ($, e, next) => {
    resetUnslop({ root: e.cwd })
    await $.command.register({
      name: 'unslop',
      description: 'Unslop: see the slop found in Claude\'s changes and what was removed. fix asks Claude to remove open slop; on or off pauses it.',
      argumentHint: '[fix|clear|on|off]',
      immediate: true,
    })
    setOn((await $.store.get(ON_STORE_KEY)) !== false)
    $.ui.status(statusLine(counts()))
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const { isOn, settings } = unslopView()
    if (!isOn || !settings.chatStyle) {
      return composed
    }
    return { sections: [...composed.sections, { id: STYLE_SECTION_ID, text: STYLE_TEXT, scope: 'session' }] }
  })
}
