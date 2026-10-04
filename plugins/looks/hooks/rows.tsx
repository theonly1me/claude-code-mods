import type { On } from 'claude-code'

import { readingColumn, toolLine } from './looks/frame'
import { summarizeGroup } from './looks/group'
import { currentTheme, displayPath, isCentered, isCompactView, isGroupUnfolded, looksSettings, palette } from './looks/state'
import { isSummarized, summarizeTool } from './looks/summary'

const DEFAULT_GROUP_MARK = '\u23fa'
const RUNNING = { isRunning: true, isErrored: false, isInterrupted: false }

export function installRows(on: On): void {
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (e.surface !== 'terminal') {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const layout = { Box, width: looksSettings().readingWidth, isCentered: isCentered(), columns: e.viewport?.columns }
    const state = { isRunning: e.props.isRunning, isErrored: e.props.isErrored, isInterrupted: e.props.isInterrupted }
    const summary = isCompactView()
      ? summarizeTool({ tool: e.props.tool, input: e.props.input, output: e.props.output, state, path: displayPath })
      : undefined
    if (!summary) {
      return isCentered() ? readingColumn({ ...layout, isEngineNode: true, children: await next(e) }) : next(e)
    }
    return readingColumn({ ...layout, children: toolLine({ Text, summary, state, theme: currentTheme(), colors: palette() }) })
  })

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (e.surface !== 'terminal') {
      return next(e)
    }
    const { Box } = $.ui.resolve(e)
    if (isCompactView() && isSummarized(e.props.tool)) {
      return <Box />
    }
    if (!isCentered()) {
      return next(e)
    }
    const layout = { Box, width: looksSettings().readingWidth, isCentered: true, columns: e.viewport?.columns }
    return readingColumn({ ...layout, isEngineNode: true, children: await next(e) })
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (e.surface !== 'terminal') {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const layout = { Box, width: looksSettings().readingWidth, isCentered: isCentered(), columns: e.viewport?.columns }
    if (isGroupUnfolded(e.props.isExpanded) || !isCompactView()) {
      return isCentered() ? readingColumn({ ...layout, isEngineNode: true, children: await next(e) }) : next(e)
    }
    const theme = currentTheme()
    const colors = palette()
    const group = summarizeGroup(e.props.calls)
    const last = e.props.calls.at(-1)
    const lastSummary = last && (e.props.isActive || e.props.calls.length === 1) ? summarizeTool({ tool: last.tool, input: last.input, output: undefined, state: RUNNING, path: displayPath }) : undefined
    const hint = group.running > 0 ? '\u2026' : group.failed > 0 ? `${group.failed} failed` : ''
    const markColor = group.failed > 0 ? colors.failed : group.running > 0 ? colors.muted : colors.accent
    return readingColumn({
      ...layout,
      children: (
        <Text wrap="truncate-end">
          <Text color={markColor}>{`${theme?.toolMark ?? DEFAULT_GROUP_MARK} `}</Text>
          <Text bold color={theme ? colors.secondary : undefined}>{group.text}</Text>
          {lastSummary && lastSummary.target !== '' && <Text dimColor>{`  ${lastSummary.target}`}</Text>}
          {hint !== '' && <Text color={group.failed > 0 ? colors.failed : undefined} dimColor={group.failed === 0}>{`  ${hint}`}</Text>}
        </Text>
      ),
    })
  })
}
