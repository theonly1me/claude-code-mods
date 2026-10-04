import type { EngineInterface, On } from 'claude-code'

import { totals } from './journal/output'
import { journalView } from './journal/state'
import type { EditEntry, TestRun, TurnEntry } from './journal/types'
import { truncate } from './shared/text/meter'

export const PANE_ID = 'change-journal'
const TURNS_SHOWN = 4
const BAR_CELLS = 12

const STATUS_STYLE: Record<string, { glyph: string; color: string }> = {
  applied: { glyph: '●', color: '#3fb950' },
  failed: { glyph: '✕', color: '#f85149' },
  denied: { glyph: '⊘', color: '#d29922' },
  command: { glyph: '⚙', color: '#58a6ff' },
}

function styleOf(edit: EditEntry): { glyph: string; color: string } {
  const key = edit.source === 'Command' ? 'command' : edit.status
  return STATUS_STYLE[key] ?? { glyph: '·', color: '#8b93a1' }
}

function turnTitle(turn: TurnEntry): string {
  return turn.summary?.title ?? turn.prompt
}

async function openInBrowser($: EngineInterface, options: { path: string }): Promise<void> {
  const opened = await $.process.run(['open', options.path], { timeoutMs: 5000 }).catch(() => undefined)
  if (opened?.exitCode !== 0) {
    await $.process.run(['xdg-open', options.path], { timeoutMs: 5000 }).catch(() => undefined)
  }
}

export function installPane(on: On): void {
  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const journal = journalView()
    const width = Math.max(30, e.props.bodyColumns)
    const pagePath = `${journal.folder}/index.html`
    const sum = totals()
    const maxChurn = Math.max(1, ...journal.edits.map(edit => edit.added + edit.removed))
    const turns = journal.turns
      .filter(turn => journal.edits.some(edit => edit.turn === turn.index) || journal.tests.some(test => test.turn === turn.index))
      .slice(-TURNS_SHOWN)
      .reverse()
    const latestReason = [...journal.edits].reverse().find(edit => edit.reason !== '')?.reason

    function editRow(edit: EditEntry) {
      const style = styleOf(edit)
      const churn = edit.added + edit.removed
      const addCells = Math.round((edit.added / maxChurn) * BAR_CELLS)
      const removeCells = Math.max(churn > 0 && addCells === 0 ? 1 : 0, Math.round((edit.removed / maxChurn) * BAR_CELLS))
      return (
        <Box key={`edit-${edit.id}`} flexDirection="row" gap={1}>
          <Text color={style.color}>{`  ${style.glyph}`}</Text>
          <Box flexGrow={1}>
            <Text wrap="truncate-start">{edit.path}</Text>
          </Box>
          <Text color="#3fb950">{`+${edit.added}`}</Text>
          <Text color="#f85149">{`−${edit.removed}`}</Text>
          <Text>
            <Text color="#3fb950">{'▇'.repeat(addCells)}</Text>
            <Text color="#f85149">{'▇'.repeat(removeCells)}</Text>
            <Text dimColor>{'·'.repeat(Math.max(0, BAR_CELLS - addCells - removeCells))}</Text>
          </Text>
        </Box>
      )
    }

    function testRow(test: TestRun) {
      return (
        <Text color={test.isPassing ? '#3fb950' : '#f85149'}>
          {`  ${test.isPassing ? '✓' : '✗'} ${truncate({ text: test.command, width: width - 6 })}`}
        </Text>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>Change Journal</Text>
          <Text dimColor>{`${sum.files} files  +${sum.added} −${sum.removed}  ✓${sum.passing} ✗${sum.failing}`}</Text>
        </Box>
        <Text dimColor>{'─'.repeat(width)}</Text>
        {turns.length === 0 && <Text dimColor>No changes yet. Edits appear here and on the page as Claude makes them.</Text>}
        {turns.map(turn => (
          <Box key={`turn-${turn.index}`} flexDirection="column" marginBottom={1}>
            <Text>
              <Text color="#f0883e">{`Turn ${turn.index} `}</Text>
              <Text bold>{truncate({ text: turnTitle(turn), width: width - 10 })}</Text>
            </Text>
            {journal.edits.filter(edit => edit.turn === turn.index).map(editRow)}
            {journal.tests.filter(test => test.turn === turn.index).map(testRow)}
          </Box>
        ))}
        {latestReason !== undefined && (
          <Text italic dimColor>{`Why: ${truncate({ text: latestReason, width: width * 2 - 6 })}`}</Text>
        )}
        <Box flexDirection="row" gap={2} marginTop={1}>
          <Button key="open-page" hotkey="o" label="Open page" variant="primary" onPress={() => openInBrowser($, { path: pagePath })} />
          <Button key="copy-path" hotkey="c" label="Copy path" onPress={() => $.ui.copy({ text: pagePath, surface: e.surface })} />
        </Box>
      </Box>
    )
  })
}
