import type { Question, Round } from './types'

export type Choice =
  | { kind: 'answer'; text: string }
  | { kind: 'own' }
  | { kind: 'skip' }
  | { kind: 'send' }
  | { kind: 'dismiss' }

export type LabeledChoice = { digit: string; label: string; choice: Choice }

export function choicesFor(options: {
  round: Round | undefined
  question: Question | undefined
  lateCount: number
  isWorking: boolean
}): LabeledChoice[] {
  const { round, question } = options
  if (!round) {
    return []
  }
  if (question) {
    const isIdea = round.mode === 'brainstorm'
    const answers: Choice[] = isIdea
      ? [{ kind: 'answer', text: 'Worth doing' }, { kind: 'skip' }]
      : question.options.map(text => ({ kind: 'answer', text }))
    const labels = isIdea ? ['Worth doing', 'Not now'] : question.options
    const extras: { label: string; choice: Choice }[] = isIdea
      ? [{ label: 'Skip', choice: { kind: 'skip' } }]
      : [
          { label: 'Type my own', choice: { kind: 'own' } },
          { label: 'Skip', choice: { kind: 'skip' } },
        ]
    return [
      ...answers.map((choice, index) => ({ label: labels[index] ?? '', choice })),
      ...extras,
    ].map((entry, index) => ({ digit: String(index + 1), ...entry }))
  }
  if (round.status === 'done' && options.lateCount > 0 && !options.isWorking) {
    return [
      { digit: '1', label: 'Send them now', choice: { kind: 'send' } },
      { digit: '2', label: 'Dismiss', choice: { kind: 'dismiss' } },
    ]
  }
  return []
}

export function choiceForDigit(options: { choices: readonly LabeledChoice[]; text: string }): LabeledChoice | undefined {
  const typed = options.text.trim()
  return /^[1-9]$/.test(typed) ? options.choices.find(entry => entry.digit === typed) : undefined
}
