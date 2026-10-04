import type { EngineInterface, On } from 'claude-code'

import { choiceForDigit, choicesFor } from './grill/choices'
import type { Choice, LabeledChoice } from './grill/choices'
import { answerNote, answersMessage } from './grill/prompts'
import {
  answerCurrent,
  currentQuestion,
  dismissRound,
  grillView,
  isTaskPrompt,
  markAllDelivered,
  markUndelivered,
  rememberTask,
  setWorking,
  skipCurrent,
  startRound,
  undeliveredAnswers,
} from './grill/state'

export const ANSWER_PANE = 'grill-answer'
const FLAME = '#ff7a45'
const IDEA = '#facc15'

function currentChoices(): LabeledChoice[] {
  const { round, isWorking } = grillView()
  return choicesFor({ round, question: currentQuestion(), lateCount: undeliveredAnswers().length, isWorking })
}

function keyFor(entry: LabeledChoice): string {
  return entry.choice.kind === 'answer' ? `option-${entry.digit}` : entry.choice.kind
}

function takeAnswersToSend(): string | undefined {
  const answers = undeliveredAnswers()
  markAllDelivered()
  dismissRound()
  return answers.length > 0 ? answersMessage(answers) : undefined
}

async function deliver($: EngineInterface, options: { answer: string }): Promise<void> {
  const answer = answerCurrent({ answer: options.answer, isDelivered: grillView().isWorking })
  if (answer?.isDelivered) {
    const appended = await $.session
      .append({ message: { type: 'user', content: [{ type: 'text', text: answerNote(answer) }] } })
      .catch(() => undefined)
    if (appended === undefined || appended.deny !== undefined) {
      markUndelivered(answer)
      $.ui.toast('Claude could not take this mid-turn. Send it when the turn ends.')
    } else {
      $.ui.toast(answer.mode === 'brainstorm' ? 'Idea sent to Claude' : 'Answer sent to Claude')
    }
  }
  $.ui.invalidate('ui.render')
}

async function perform($: EngineInterface, options: { choice: Choice }): Promise<void> {
  const { choice } = options
  if (choice.kind === 'answer') {
    await deliver($, { answer: choice.text })
    return
  }
  if (choice.kind === 'own') {
    await $.ui.open({ id: ANSWER_PANE, title: 'Your answer', focus: true, closeOnEscape: true, rows: 5 })
    return
  }
  if (choice.kind === 'send') {
    const message = takeAnswersToSend()
    $.ui.invalidate('ui.render')
    if (message !== undefined) {
      await $.prompt.submit({ text: message })
    }
    return
  }
  if (choice.kind === 'skip') {
    skipCurrent()
  } else {
    dismissRound()
  }
  $.ui.invalidate('ui.render')
}

export function installQuestions(on: On): void {
  on('prompt.submit', async ($, e, next) => {
    const picked = e.origin.kind === 'composer' ? choiceForDigit({ choices: currentChoices(), text: e.text }) : undefined
    if (picked?.choice.kind === 'send') {
      const message = takeAnswersToSend()
      $.ui.invalidate('ui.render')
      return message === undefined ? { drop: `Grill: ${picked.label}` } : next({ ...e, text: message })
    }
    if (picked) {
      await perform($, { choice: picked.choice })
      return { drop: `Grill: ${picked.label}` }
    }
    const mode = grillView().mode
    const isNewTask = e.origin.kind === 'composer' && e.turnId === undefined && isTaskPrompt(e.text)
    if (isNewTask) {
      rememberTask(e.text)
    }
    if (isNewTask && (mode === 'grill' || mode === 'brainstorm')) {
      startRound({ prompt: e.text, mode })
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('turn.start', ($, e, next) => {
    setWorking(true)
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      setWorking(false)
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const { round } = grillView()
    if (!round || e.props.hasSurvey) {
      return below
    }
    const { Box, Text, Button } = $.ui.resolve(e)
    const question = currentQuestion()
    const isIdea = round.mode === 'brainstorm'
    const color = isIdea ? IDEA : FLAME
    const choices = currentChoices()
    const buttons = choices.map(entry => (
      <Button key={keyFor(entry)} plain hotkey={entry.digit} label={entry.label} onPress={() => perform($, { choice: entry.choice })} />
    ))
    let header
    if (round.status === 'thinking') {
      header = <Text color={color}>{`▌ ${isIdea ? 'Brainstorm' : 'Grill'} is reading your request while Claude starts…`}</Text>
    } else if (question) {
      header = (
        <Box flexDirection="column">
          <Text>
            <Text color={color} bold>{`▌ ${isIdea ? 'IDEA' : 'GRILL'} `}</Text>
            <Text dimColor>{`${round.index + 1}/${round.questions.length}  `}</Text>
            <Text bold>{question.text}</Text>
          </Text>
          {question.why !== '' && <Text dimColor italic>{`  ${question.why}`}</Text>}
        </Box>
      )
    } else if (choices.length > 0) {
      header = <Text color={color}>{`▌ Claude finished before reading ${undeliveredAnswers().length} of your answers.`}</Text>
    } else {
      return below
    }
    return (
      <Box flexDirection="column">
        {header}
        {choices.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
            {buttons}
            <Text dimColor>type the number, Enter</Text>
          </Box>
        )}
        {below}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: ANSWER_PANE }, async ($, e) => {
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>Answer from the terminal or the desktop app.</Text>
    }
    const { Box, Text, Input } = $.ui.resolve(e)
    const question = currentQuestion()
    if (!question) {
      return <Text dimColor>There is no open question.</Text>
    }
    return (
      <Box flexDirection="column">
        <Text>
          <Text color={FLAME} bold>GRILL </Text>
          <Text bold>{question.text}</Text>
        </Text>
        <Input
          key="answer"
          autoFocus
          placeholder="Type your answer and press Enter"
          onSubmit={async value => {
            if (value.trim() !== '') {
              await deliver($, { answer: value.trim() })
            }
            await $.ui.close({ id: ANSWER_PANE })
          }}
        />
      </Box>
    )
  })
}
