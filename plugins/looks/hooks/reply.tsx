import type { On } from 'claude-code'

import { promptLine, readingColumn, replyFrame } from './looks/frame'
import { currentTheme, isCentered, looksSettings, noteTranscriptExpanded, palette } from './looks/state'

const MARKDOWN_LIMIT = 10000

export function installReply(on: On): void {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const theme = currentTheme()
    if (e.surface !== 'terminal' || (!theme && !isCentered()) || e.props.text.length > MARKDOWN_LIMIT) {
      return next(e)
    }
    const { Box, Text, Markdown } = $.ui.resolve(e)
    const layout = { Box, width: looksSettings().readingWidth, isCentered: isCentered(), columns: e.viewport?.columns }
    const body = <Markdown text={e.props.text} />
    return readingColumn({ ...layout, gapAbove: 1, children: replyFrame({ Box, Text, theme, colors: palette(), isFirst: e.props.isFirstOfReply, body }) })
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (noteTranscriptExpanded(e.props.isExpanded)) {
      $.ui.invalidate('ui.render')
    }
    const theme = currentTheme()
    if (e.surface !== 'terminal' || (!theme && !isCentered())) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const layout = { Box, width: looksSettings().readingWidth, isCentered: isCentered(), columns: e.viewport?.columns }
    const isPrompt = e.props.origin.kind === 'composer' && e.props.task === undefined && e.props.from === undefined
    if (!isPrompt) {
      return readingColumn({ ...layout, isEngineNode: true, children: await next(e) })
    }
    return readingColumn({ ...layout, gapAbove: 1, children: promptLine({ Box, Text, theme, colors: palette(), text: e.props.text }) })
  })
}
