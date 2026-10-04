import type { ElementTable, RenderElement } from 'claude-code'

import { truncate } from '../shared/text/meter'
import type { EditEntry, TestRun } from './types'

export const COLORS = {
  added: '#3fb950',
  removed: '#f85149',
  turn: '#f0883e',
  accent: '#58a6ff',
  muted: '#8b93a1',
} as const

export const MAX_NUMBERED = 9
const BAR_CELLS = 12
const DIFF_LINES = 8

const STATUS_STYLE: Record<string, { glyph: string; color: string }> = {
  applied: { glyph: '●', color: COLORS.added },
  failed: { glyph: '✕', color: COLORS.removed },
  denied: { glyph: '⊘', color: '#d29922' },
  command: { glyph: '⚙', color: COLORS.accent },
}

export type PaneAction = { kind: 'select'; editId: number } | { kind: 'open' } | { kind: 'copy' } | { kind: 'close' }

type Act = (action: PaneAction) => void

function styleOf(edit: EditEntry): { glyph: string; color: string } {
  const key = edit.source === 'Command' ? 'command' : edit.status
  return STATUS_STYLE[key] ?? { glyph: '·', color: COLORS.muted }
}

function shortPath(options: { path: string; width: number }): string {
  const { path } = options
  const width = Math.max(8, options.width)
  return path.length <= width ? path : `…${path.slice(path.length - width + 1)}`
}

export function hintText(isFocused: boolean): string {
  return isFocused
    ? '1-9: show an edit  o: open page  c: copy path  Esc: back to prompt'
    : 'ctrl+x tab: use the keys here, or type /changes open'
}

export function editRow(options: {
  elements: ElementTable
  act: Act
  edit: EditEntry
  number: number
  maxChurn: number
  isSelected: boolean
  width: number
}): RenderElement {
  const { Box, Text, Button } = options.elements
  const { edit, number, maxChurn } = options
  const style = styleOf(edit)
  const churn = edit.added + edit.removed
  const addCells = Math.round((edit.added / maxChurn) * BAR_CELLS)
  const removeCells = Math.max(churn > 0 && addCells === 0 ? 1 : 0, Math.round((edit.removed / maxChurn) * BAR_CELLS))
  const label = shortPath({ path: edit.path, width: options.width - BAR_CELLS - 22 })
  const select = () => options.act({ kind: 'select', editId: edit.id })
  return (
    <Box key={`row-${edit.id}`} flexDirection="row" columnGap={1}>
      <Text color={options.isSelected ? COLORS.accent : style.color}>{options.isSelected ? '▸' : style.glyph}</Text>
      <Box flexGrow={1}>
        {number <= MAX_NUMBERED ? (
          <Button key={`edit-${edit.id}`} plain hotkey={String(number)} label={label} onPress={select} />
        ) : (
          <Button key={`edit-${edit.id}`} plain label={label} onPress={select} />
        )}
      </Box>
      <Text color={COLORS.added}>{`+${edit.added}`}</Text>
      <Text color={COLORS.removed}>{`−${edit.removed}`}</Text>
      <Text>
        <Text color={COLORS.added}>{'▇'.repeat(addCells)}</Text>
        <Text color={COLORS.removed}>{'▇'.repeat(removeCells)}</Text>
        <Text dimColor>{'·'.repeat(Math.max(0, BAR_CELLS - addCells - removeCells))}</Text>
      </Text>
    </Box>
  )
}

export function testRow(options: { elements: ElementTable; test: TestRun; width: number }): RenderElement {
  const { Text } = options.elements
  const { test } = options
  return (
    <Text color={test.isPassing ? COLORS.added : COLORS.removed}>
      {`  ${test.isPassing ? '✓' : '✗'} ${truncate({ text: test.command, width: options.width - 6 })}`}
    </Text>
  )
}

function changedLines(edit: EditEntry): string[] {
  return edit.hunks.flatMap(hunk => hunk.lines).filter(line => line.startsWith('+') || line.startsWith('-'))
}

export function detailTree(options: { elements: ElementTable; edit: EditEntry; number: number; width: number }): RenderElement {
  const { Box, Text } = options.elements
  const { edit, width } = options
  const lines = changedLines(edit)
  const hidden = lines.length - DIFF_LINES
  const reason = edit.reason === '' ? 'No reason was recorded for this edit.' : edit.reason
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={COLORS.accent} paddingX={1} marginTop={1}>
      <Text>
        <Text bold color={COLORS.accent}>{`Edit ${options.number}  `}</Text>
        <Text bold>{shortPath({ path: edit.path, width: width - 24 })}</Text>
        <Text dimColor>{`  turn ${edit.turn}`}</Text>
      </Text>
      <Text italic>{`Why: ${reason}${edit.isReasonInferred ? ' (inferred)' : ''}`}</Text>
      {edit.note !== '' && <Text dimColor>{edit.note}</Text>}
      {lines.slice(0, DIFF_LINES).map(line => (
        <Text color={line.startsWith('+') ? COLORS.added : COLORS.removed} wrap="truncate-end">
          {line.slice(0, width)}
        </Text>
      ))}
      {hidden > 0 && <Text dimColor>{`… ${hidden} more changed lines. Press o to see the whole diff on the page.`}</Text>}
      {lines.length === 0 && <Text dimColor>The diff is on the page. Press o to open it.</Text>}
    </Box>
  )
}

export function actionsTree(options: { elements: ElementTable; act: Act; hasSelection: boolean }): RenderElement {
  const { Box, Button } = options.elements
  const { act } = options
  return (
    <Box flexDirection="row" flexWrap="wrap" columnGap={2} marginTop={1}>
      <Button key="open-page" plain hotkey="o" label={options.hasSelection ? 'Open this turn on the page' : 'Open the page'} onPress={() => act({ kind: 'open' })} />
      <Button key="copy-path" plain hotkey="c" label="Copy the page path" onPress={() => act({ kind: 'copy' })} />
      <Button key="close" plain hotkey="x" role="dismiss" label="Close" onPress={() => act({ kind: 'close' })} />
    </Box>
  )
}
