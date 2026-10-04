import { expect, test } from 'claude-code/testing'

import { answerNote, answersMessage, parseQuestions, roundPrompt } from '../hooks/grill/prompts'
import { isTaskPrompt } from '../hooks/grill/state'

test('questions parse from noisy replies and drop empty entries', () => {
  const parsed = parseQuestions('ok {"questions":[{"text":"Keep empty carts?","why":"DB rows","options":["Yes","No",7,"Maybe","Extra"]},{"text":""}]}')
  expect(parsed).toEqual([{ text: 'Keep empty carts?', why: 'DB rows', options: ['Yes', 'No', 'Maybe'] }])
  expect(parseQuestions('nothing')).toBeNull()
})

test('notes to Claude name the question and the answer', () => {
  const note = answerNote({ question: 'Tax?', answer: 'No', mode: 'grill', isDelivered: true })
  expect(note).toContain('Q: Tax?\nA: No')
  expect(answerNote({ question: 'What if we cache totals?', answer: 'Worth doing', mode: 'brainstorm', isDelivered: true })).toContain('What if we cache totals?')
  expect(answersMessage([{ question: 'Tax?', answer: 'No', mode: 'grill', isDelivered: false }])).toContain('- Tax? No')
})

test('task prompts need some substance and modes change the ask', () => {
  expect(isTaskPrompt('fix it')).toBe(false)
  expect(isTaskPrompt('/compact now please with all of the details kept')).toBe(false)
  expect(isTaskPrompt('Add pagination to the orders list with a page size of twenty')).toBe(true)
  expect(roundPrompt({ mode: 'brainstorm', task: 'x', files: '' })).toContain('What if')
  expect(roundPrompt({ mode: 'grill', task: 'x', files: '' })).toContain('Never ask what the code can answer')
})
