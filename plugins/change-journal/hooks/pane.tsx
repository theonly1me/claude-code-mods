import type { EngineInterface, On, RenderSurface } from 'claude-code'

import { totals } from './journal/output'
import { actionsTree, COLORS, detailTree, editRow, hintText, testRow } from './journal/panel'
import type { PaneAction } from './journal/panel'
import { journalView } from './journal/state'
import type { TurnEntry } from './journal/types'
import { noop } from './shared/noop'
import { truncate } from './shared/text/meter'

export const PANE_ID = 'change-journal'
const TURNS_SHOWN = 4

let selectedEditId: number | undefined

function turnTitle(turn: TurnEntry): string {
  return turn.summary?.title ?? turn.prompt
}

function pagePath(): string {
  return `${journalView().folder}/index.html`
}

function pageTargets(): string[] {
  const selected = journalView().edits.find(edit => edit.id === selectedEditId)
  return selected ? [`file://${pagePath()}#turn=${selected.turn}&tab=changes`, pagePath()] : [pagePath()]
}

async function openInBrowser($: EngineInterface, options: { targets: string[] }): Promise<void> {
  for (const target of options.targets) {
    for (const opener of ['open', 'xdg-open']) {
      const opened = await $.process.run([opener, target], { timeoutMs: 5000 }).catch(() => undefined)
      if (opened?.exitCode === 0) {
        return
      }
    }
  }
}

async function perform($: EngineInterface, options: { action: PaneAction; surface: RenderSurface }): Promise<void> {
  const { action } = options
  if (action.kind === 'select') {
    selectedEditId = selectedEditId === action.editId ? undefined : action.editId
    $.ui.invalidate('ui.render')
  } else if (action.kind === 'open') {
    await openInBrowser($, { targets: pageTargets() })
  } else if (action.kind === 'copy') {
    const copied = await $.ui.copy({ text: pagePath(), surface: options.surface })
    $.ui.toast(copied.isCopied ? 'Copied the page path' : 'Could not copy here. Type /changes path to print it.')
  } else {
    await $.ui.close({ id: PANE_ID })
  }
}

export function installPane(on: On): void {
  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    const journal = journalView()
    const width = Math.max(30, e.props.bodyColumns)
    const sum = totals()
    const act = (action: PaneAction) => {
      perform($, { action, surface: e.surface }).catch(noop)
    }
    const maxChurn = Math.max(1, ...journal.edits.map(edit => edit.added + edit.removed))
    const turns = journal.turns
      .filter(turn => journal.edits.some(edit => edit.turn === turn.index) || journal.tests.some(test => test.turn === turn.index))
      .slice(-TURNS_SHOWN)
      .reverse()
    const numbered = turns.flatMap(turn => journal.edits.filter(edit => edit.turn === turn.index))
    const numberOf = (id: number) => numbered.findIndex(edit => edit.id === id) + 1
    const selected = numbered.find(edit => edit.id === selectedEditId)
    const latestReason = [...journal.edits].reverse().find(edit => edit.reason !== '')?.reason

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between" columnGap={2}>
          <Text bold color={COLORS.turn}>Change Journal</Text>
          <Text dimColor>{`${sum.files} files  +${sum.added} −${sum.removed}  ✓${sum.passing} ✗${sum.failing}`}</Text>
        </Box>
        <Text color={COLORS.muted}>{hintText(e.props.isFocused)}</Text>
        <Text dimColor>{'─'.repeat(width)}</Text>
        {turns.length === 0 && <Text dimColor>No changes yet. Edits appear here and on the page as Claude makes them.</Text>}
        {turns.map(turn => (
          <Box key={`turn-${turn.index}`} flexDirection="column" marginBottom={1}>
            <Text>
              <Text color={COLORS.turn}>{`Turn ${turn.index} `}</Text>
              <Text bold>{truncate({ text: turnTitle(turn), width: width - 10 })}</Text>
            </Text>
            {journal.edits
              .filter(edit => edit.turn === turn.index)
              .map(edit => editRow({ elements, act, edit, number: numberOf(edit.id), maxChurn, isSelected: edit.id === selectedEditId, width }))}
            {journal.tests.filter(test => test.turn === turn.index).map(test => testRow({ elements, test, width }))}
          </Box>
        ))}
        {selected && detailTree({ elements, edit: selected, number: numberOf(selected.id), width })}
        {!selected && latestReason !== undefined && (
          <Text italic dimColor>{`Why: ${truncate({ text: latestReason, width: width * 2 - 6 })}`}</Text>
        )}
        {actionsTree({ elements, act, hasSelection: selected !== undefined })}
      </Box>
    )
  })
}
