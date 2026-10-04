import type { BoxProps, ElementConstructor, RenderElement, RenderNode, TextProps } from 'claude-code'

import { moreHint } from './result'
import type { LineTone, ResultLine } from './result'
import type { Look } from './look'
import type { Palette, Theme } from './themes'
import type { ToolState, ToolSummary } from './summary'

const DEFAULT_TOOL_MARK = '\u23fa'
const DEFAULT_PROMPT_MARK = '\u276f'

export type ColumnLayout = { Box: ElementConstructor<BoxProps>; width: number; isCentered: boolean; columns: number | undefined }

export function readingColumn(options: ColumnLayout & { children: RenderNode; isEngineNode?: boolean; gapAbove?: number }): RenderElement {
  const { Box } = options
  const pad = options.isCentered && options.columns !== undefined ? Math.max(0, Math.floor((options.columns - options.width) / 2)) : 0
  if (options.isEngineNode) {
    return (
      <Box flexDirection="column" paddingLeft={pad}>
        {options.children}
      </Box>
    )
  }
  return (
    <Box flexDirection="row" paddingLeft={pad} marginTop={options.gapAbove ?? 0}>
      <Box flexDirection="column" width={options.width} flexShrink={1}>
        {options.children}
      </Box>
    </Box>
  )
}

function markColor(options: { state: ToolState; colors: Palette }): string {
  if (options.state.isErrored || options.state.isInterrupted) {
    return options.colors.failed
  }
  return options.state.isRunning ? options.colors.muted : options.colors.accent
}

export function toolLine(options: {
  Text: ElementConstructor<TextProps>
  summary: ToolSummary
  state: ToolState
  theme: Theme | undefined
  colors: Palette
  look?: Look
}): RenderElement {
  const { Text, summary, colors } = options
  const isFailed = options.state.isErrored || options.state.isInterrupted
  return (
    <Text wrap="truncate-end">
      <Text color={markColor({ state: options.state, colors })}>{`${options.theme?.toolMark ?? DEFAULT_TOOL_MARK} `}</Text>
      {options.look ? (
        <Text bold color={options.look.chipText} backgroundColor={options.look.chipBackground}>{` ${summary.verb} `}</Text>
      ) : (
        <Text bold color={options.theme ? colors.secondary : undefined}>{summary.verb}</Text>
      )}
      {summary.target !== '' && <Text>{`  ${summary.target}`}</Text>}
      {summary.added > 0 && <Text color={colors.added}>{`  +${summary.added}`}</Text>}
      {summary.removed > 0 && <Text color={colors.removed}>{`  -${summary.removed}`}</Text>}
      {summary.hint !== '' && <Text color={isFailed ? colors.failed : undefined} dimColor={!isFailed}>{`  ${summary.hint}`}</Text>}
    </Text>
  )
}

export function promptLine(options: { Box: ElementConstructor<BoxProps>; Text: ElementConstructor<TextProps>; theme: Theme | undefined; colors: Palette; text: string }): RenderElement {
  const { Box, Text, theme } = options
  return (
    <Box flexDirection="row">
      <Box flexShrink={0}>
        <Text bold color={theme ? options.colors.accent : undefined} dimColor={!theme}>{`${theme?.promptMark ?? DEFAULT_PROMPT_MARK} `}</Text>
      </Box>
      <Box flexShrink={1}>
        <Text color={theme ? options.colors.promptText : undefined}>{options.text}</Text>
      </Box>
    </Box>
  )
}

export function replyFrame(options: {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  theme: Theme | undefined
  colors: Palette
  isFirst: boolean
  body: RenderNode
}): RenderElement {
  const { Box, Text, theme, colors } = options
  return (
    <Box flexDirection="row">
      <Box width={2} flexShrink={0}>
        <Text color={theme ? colors.accent : undefined}>{options.isFirst ? DEFAULT_TOOL_MARK : ' '}</Text>
      </Box>
      {theme && <Box width={1} flexShrink={0} marginRight={1} backgroundColor={colors.muted} />}
      <Box flexDirection="column" flexGrow={1} flexShrink={1}>
        {options.body}
      </Box>
    </Box>
  )
}

function toneColor(options: { tone: LineTone; colors: Palette }): string | undefined {
  const { tone, colors } = options
  return tone === 'added' ? colors.added : tone === 'removed' ? colors.removed : tone === 'failed' ? colors.failed : undefined
}

export function resultBlock(options: {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  colors: Palette
  lines: readonly ResultLine[]
  more: number
  look?: Look
}): RenderElement {
  const { Box, Text, colors } = options
  const bar = <Text color={options.look?.borderColor ?? colors.muted}>{`${options.look?.bar ?? '\u2502'} `}</Text>
  return (
    <Box flexDirection="column" paddingLeft={2}>
      {options.lines.map((line, index) => (
        <Text key={`line-${index}`} wrap="truncate-end">
          {bar}
          <Text color={toneColor({ tone: line.tone, colors })} dimColor={line.tone === 'plain'}>
            {line.text}
          </Text>
        </Text>
      ))}
      {options.more > 0 && (
        <Text wrap="truncate-end">
          {bar}
          <Text dimColor>{moreHint(options.more)}</Text>
        </Text>
      )}
    </Box>
  )
}
