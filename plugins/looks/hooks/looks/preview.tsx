import type { BoxProps, ElementConstructor, RenderElement, TextProps } from 'claude-code'

import { promptLine, replyFrame, toolLine } from './frame'
import { paletteOf, themeOf } from './themes'
import type { ThemeChoice, Tone } from './themes'

const SAMPLE_PROMPT = 'make the cart total include tax'
const SAMPLE_REPLY = 'Totals now include tax, and the cart tests pass.'
const SETTLED = { isRunning: false, isErrored: false, isInterrupted: false }
const SAMPLE_EDIT = { verb: 'Edit', target: 'src/cart.ts', hint: '', added: 4, removed: 1 }
const SAMPLE_TESTS = { verb: 'Run', target: 'npm test', hint: '12 lines', added: 0, removed: 0 }

export function labelOf(choice: ThemeChoice): string {
  return themeOf(choice)?.label ?? 'Off'
}

export function baseLine(options: { choice: ThemeChoice; current?: string; saved?: string }): string {
  if (options.choice === 'off') {
    return `Base theme: ${options.current ?? 'yours'}. A theme switches it to a matching one, and Off restores it.`
  }
  return `Base theme: ${options.current ?? 'unchanged'} while ${labelOf(options.choice)} is on. Off restores ${options.saved ?? 'yours'}.`
}

export function themePreview(options: {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  choice: ThemeChoice
  tone: Tone
}): RenderElement {
  const { Box, Text } = options
  const theme = themeOf(options.choice)
  const colors = paletteOf({ choice: options.choice, tone: options.tone })
  const spinner = theme ? `${theme.spinnerWords[0] ?? ''}${theme.spinnerSuffix}  (12s)` : 'Thinking…  (12s)'
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.muted} paddingX={1}>
      <Text bold color={theme ? colors.accent : undefined}>{`Preview: ${theme?.label ?? 'Off'}`}</Text>
      {theme ? promptLine({ Box, Text, theme, colors, text: SAMPLE_PROMPT }) : <Text>{`> ${SAMPLE_PROMPT}`}</Text>}
      {toolLine({ Text, summary: SAMPLE_EDIT, state: SETTLED, theme, colors })}
      {toolLine({ Text, summary: SAMPLE_TESTS, state: SETTLED, theme, colors })}
      {replyFrame({ Box, Text, theme, colors, isFirst: true, body: <Text>{SAMPLE_REPLY}</Text> })}
      <Text color={theme ? colors.accent : undefined} dimColor={!theme}>{spinner}</Text>
    </Box>
  )
}
