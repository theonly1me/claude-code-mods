import type { BoxProps, ElementConstructor, RenderElement, RenderNode, TextProps } from 'claude-code'

import { mixHex } from './look'
import type { Look } from './look'

const DIVIDER_MIN = 6

type Elements = { Box: ElementConstructor<BoxProps>; Text: ElementConstructor<TextProps> }

export function chip(options: { Text: ElementConstructor<TextProps>; look: Look; text: string }): RenderElement {
  const { Text, look } = options
  return (
    <Text bold color={look.chipText} backgroundColor={look.chipBackground}>
      {` ${options.text} `}
    </Text>
  )
}

export function gradientText(options: { Text: ElementConstructor<TextProps>; look: Look; text: string; bold?: boolean }): RenderElement {
  const { Text, look } = options
  const characters = Array.from(options.text)
  return (
    <Text bold={options.bold ?? false}>
      {characters.map((character, index) => (
        <Text key={`g-${index}`} color={mixHex({ from: look.divider.from, to: look.divider.to, amount: characters.length < 2 ? 0 : index / (characters.length - 1) })}>
          {character}
        </Text>
      ))}
    </Text>
  )
}

function rule(options: { Text: ElementConstructor<TextProps>; look: Look; length: number }): RenderElement {
  const { pattern } = options.look.divider
  const text = pattern.repeat(Math.ceil(options.length / pattern.length)).slice(0, options.length)
  return gradientText({ Text: options.Text, look: options.look, text })
}

export function replyPanel(options: Elements & { look: Look; isFirst: boolean; body: RenderNode }): RenderElement {
  const { Box, Text, look } = options
  return (
    <Box flexDirection="column">
      {options.isFirst && (
        <Box flexDirection="row" marginBottom={0}>
          {chip({ Text, look, text: look.replyLabel })}
        </Box>
      )}
      <Box flexDirection="column" borderStyle={look.border} borderColor={look.borderColor} backgroundColor={look.panel} paddingX={1}>
        {options.body}
      </Box>
    </Box>
  )
}

export function userRow(options: Elements & { look: Look; text: string; promptText: string }): RenderElement {
  const { Box, Text, look } = options
  return (
    <Box flexDirection="row">
      <Box flexShrink={0} marginRight={1}>
        {chip({ Text, look, text: look.userLabel })}
      </Box>
      <Box flexShrink={1}>
        <Text bold color={options.promptText}>
          {options.text}
        </Text>
      </Box>
    </Box>
  )
}

export function formatDuration(durationMs: number): string {
  const seconds = Math.max(1, Math.round(durationMs / 1000))
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function divider(options: Elements & { look: Look; width: number; word: string; durationMs: number }): RenderElement {
  const { Box, Text, look } = options
  const label = ` ${options.word} for ${formatDuration(options.durationMs)} `
  const side = Math.max(DIVIDER_MIN, Math.floor((options.width - label.length) / 2))
  return (
    <Box marginTop={1}>
      <Text wrap="truncate-end">
        {rule({ Text, look, length: side })}
        <Text bold color={look.divider.to}>
          {label}
        </Text>
        {rule({ Text, look, length: side })}
      </Text>
    </Box>
  )
}
