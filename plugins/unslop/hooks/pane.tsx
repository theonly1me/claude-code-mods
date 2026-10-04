import type { EngineInterface, On } from 'claude-code'

import { fixPrompt, KIND_LABELS, shortExcerpt, statusLine } from './slop/notes'
import { clearRemoved, counts, markNotified, ON_STORE_KEY, openFindings, setOn, unslopView } from './slop/state'
import type { Finding } from './slop/types'

export const PANE_ID = 'unslop'
const ACCENT = '#5eead4'
const OPEN = '#fbbf24'
const REMOVED = '#4ade80'
const PANE_ROWS = 18

function showCounts($: EngineInterface): void {
  $.ui.status(statusLine(counts()))
  $.ui.invalidate('ui.render')
}

function fix($: EngineInterface): number {
  const open = openFindings()
  if (open.length === 0) {
    return 0
  }
  markNotified(open.map(finding => finding.id))
  showCounts($)
  $.clock.after(0, () => {
    $.prompt.submit({ text: fixPrompt(open) }).catch(() => $.ui.toast('Unslop could not send the fix request. Try /unslop fix again.'))
  })
  return open.length
}

function pressFix($: EngineInterface): void {
  if (fix($) === 0) {
    $.ui.toast('No open slop to fix.')
  }
}

function clear($: EngineInterface): number {
  const cleared = clearRemoved()
  showCounts($)
  return cleared
}

function byFile(findings: readonly Finding[]): [string, Finding[]][] {
  const groups = new Map<string, Finding[]>()
  findings.forEach(finding => groups.set(finding.path, [...(groups.get(finding.path) ?? []), finding]))
  return [...groups.entries()].reverse()
}

function plural(options: { count: number; word: string }): string {
  return `${options.count} ${options.word}${options.count === 1 ? '' : 's'}`
}

export function installPane(on: On): void {
  on('command.run', { command: 'unslop' }, async ($, e) => {
    const action = e.args.trim().toLowerCase()
    if (action === 'fix') {
      const sent = fix($)
      return { text: sent === 0 ? 'No open slop to fix.' : `Asked Claude to remove ${plural({ count: sent, word: 'piece' })} of slop.` }
    }
    if (action === 'on' || action === 'off') {
      setOn(action === 'on')
      await $.store.set(ON_STORE_KEY, action === 'on')
      $.ui.invalidate('ui.render')
      return { text: action === 'on' ? 'Unslop is on. It checks every edit and keeps the plain chat style.' : 'Unslop is paused. Edits are not checked and the chat style rule is off.' }
    }
    if (action === 'clear') {
      return { text: `Cleared ${plural({ count: clear($), word: 'removed finding' })}.` }
    }
    await $.ui.open({ id: PANE_ID, title: 'Unslop', focus: true, rows: PANE_ROWS })
    const { removed, open } = counts()
    return { text: `${removed} removed, ${open} open. In the pane, f sends open slop to Claude and Esc returns to the prompt.` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const view = unslopView()
    const { removed, open, waiting } = counts()
    const hint = e.props.isFocused
      ? 'f fix open  c clear removed  Tab move  Enter press  Esc to prompt'
      : 'ctrl+x tab to use the keys  /unslop fix sends open slop to Claude'
    const groups = byFile(view.findings)
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold color={ACCENT}>{'✂ UNSLOP  '}</Text>
          <Text color={REMOVED}>{`${removed} removed  `}</Text>
          <Text color={OPEN}>{`${open} open`}</Text>
          {waiting > 0 && <Text dimColor>{`  (${waiting} not sent to Claude yet)`}</Text>}
          {!view.isOn && <Text dimColor>{'  paused: /unslop on'}</Text>}
        </Text>
        <Text dimColor>{hint}</Text>
        <Box flexDirection="row" gap={2} marginY={1}>
          <Button key="fix" hotkey="f" label="Fix open ones" onPress={() => pressFix($)} />
          <Button key="clear" hotkey="c" label="Clear removed" onPress={() => clear($)} />
        </Box>
        {groups.length === 0 && <Text dimColor>No slop yet. Unslop checks each edit Claude makes and lists what it finds here.</Text>}
        {groups.map(([path, findings]) => (
          <Box key={`file-${path}`} flexDirection="column" marginBottom={1}>
            <Text bold>{path}</Text>
            {findings.map(finding => (
              <Box key={`finding-${finding.id}`} flexDirection="column">
                <Text wrap="truncate-end">
                  <Text color={finding.status === 'removed' ? REMOVED : OPEN}>{finding.status === 'removed' ? '  ✓ removed ' : '  ● open    '}</Text>
                  <Text bold>{`${KIND_LABELS[finding.kind]}`}</Text>
                  <Text dimColor>{finding.line === undefined ? '  ' : `  line ${finding.line}  `}</Text>
                  <Text>{shortExcerpt(finding.excerpt)}</Text>
                </Text>
                {finding.status === 'open' && (
                  <Box paddingLeft={4}>
                    <Text dimColor>{finding.advice}</Text>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
