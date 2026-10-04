import type { EngineInterface, On } from 'claude-code'

import { CHOICE_DIGITS, CHOICE_LABELS, flagLine, pullBackNote, statusText } from './scope/messages'
import { allowFolder, openFlags, recordPrompt, resolveFlag, resolveFolder, scopeView } from './scope/state'
import type { BandChoice, Flag } from './scope/types'

const AMBER = '#f5a524'
const CHOICES: readonly BandChoice[] = ['pull', 'fine', 'folder']

function latestFlag(): Flag | undefined {
  return openFlags().at(-1)
}

function choiceForDigit(text: string): BandChoice | undefined {
  const typed = text.trim()
  return CHOICES.find(choice => CHOICE_DIGITS[choice] === typed)
}

function folderLabel(flag: Flag): string {
  return flag.folder === '.' ? 'Allow the top folder' : `Allow ${flag.folder}/`
}

async function pullBack($: EngineInterface, options: { flag: Flag }): Promise<void> {
  const note = pullBackNote(options.flag)
  if (!scopeView().isWorking) {
    await $.prompt.submit({ text: note })
    return
  }
  const appended = await $.session
    .append({ message: { type: 'user', content: [{ type: 'text', text: note }] } })
    .catch(() => undefined)
  $.ui.toast(appended === undefined || appended.deny !== undefined ? 'Claude could not take the note mid-turn. Run /scope after the turn.' : 'Asked Claude to pull back')
}

async function perform($: EngineInterface, options: { choice: BandChoice; flag: Flag }): Promise<void> {
  const { choice, flag } = options
  if (choice === 'pull') {
    resolveFlag({ id: flag.id, status: 'pulled' })
    await pullBack($, { flag })
  } else if (choice === 'fine') {
    resolveFlag({ id: flag.id, status: 'fine' })
  } else {
    allowFolder(flag.folder)
    resolveFolder(flag.folder)
    $.ui.toast(`Scope Guard allows ${flag.folder === '.' ? 'the top folder' : `${flag.folder}/`} for this task`)
  }
  $.ui.status(statusText(openFlags().length))
  $.ui.invalidate('ui.render')
}

export function installBand(on: On): void {
  on('prompt.submit', async ($, e, next) => {
    const flag = latestFlag()
    const choice = e.origin.kind === 'composer' && flag ? choiceForDigit(e.text) : undefined
    if (flag && choice === 'pull' && !scopeView().isWorking) {
      resolveFlag({ id: flag.id, status: 'pulled' })
      $.ui.status(statusText(openFlags().length))
      $.ui.invalidate('ui.render')
      return next({ ...e, text: pullBackNote(flag) })
    }
    if (flag && choice) {
      await perform($, { choice, flag })
      return { drop: `Scope Guard: ${CHOICE_LABELS[choice]}` }
    }
    const text = e.text.trim()
    if (e.origin.kind === 'composer' && text !== '' && !text.startsWith('/')) {
      recordPrompt({ text, isNewTask: e.turnId === undefined })
      $.ui.status(statusText(openFlags().length))
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const flag = latestFlag()
    if (!flag || e.props.hasSurvey) {
      return below
    }
    const { Box, Text, Button } = $.ui.resolve(e)
    const more = openFlags().length - 1
    const labels: Record<BandChoice, string> = { ...CHOICE_LABELS, folder: folderLabel(flag) }
    return (
      <Box flexDirection="column">
        <Text>
          <Text color={AMBER} bold>▌ SCOPE </Text>
          <Text>{flagLine(flag)}</Text>
          {more > 0 && <Text dimColor>{`  +${more} more`}</Text>}
        </Text>
        <Text dimColor italic>{`  ${flag.reason}`}</Text>
        <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
          {CHOICES.map(choice => (
            <Button key={choice} plain hotkey={CHOICE_DIGITS[choice]} label={labels[choice]} onPress={() => perform($, { choice, flag })} />
          ))}
          <Text dimColor>type the number, Enter</Text>
        </Box>
        {below}
      </Box>
    )
  })
}
