import type { Answer, ChatMessage, Question, RoundMode } from './types'

export const ROUND_SYSTEM =
  'You are a sharp senior engineer pairing with a developer. An AI agent has just started on their request. You ask the developer the few questions whose answers would change the result the most. Reply with one JSON object and nothing else.'

export const CHAT_SYSTEM =
  'You are a sharp, friendly thinking partner for a developer while their AI coding agent works. Keep replies under 120 words, plain and specific. Push back when an idea is weak, and end with a question when one would help.'

export function roundPrompt(options: { mode: RoundMode; task: string; files: string }): string {
  const context = [`The developer asked the agent: ${options.task.slice(0, 3000)}`, '', 'Files in the project (partial):', options.files || '(unknown)', '']
  if (options.mode === 'brainstorm') {
    return [
      ...context,
      'Suggest 3 to 5 ideas the developer may not have considered for this task: better approaches, risks, or extras worth doing now.',
      'Each idea starts with "What if". Return JSON: {"questions": [{"text": "What if ...?", "why": "one sentence on the payoff", "options": []}]}',
    ].join('\n')
  }
  return [
    ...context,
    'Ask 3 to 5 questions about requirements, edge cases, scope, and trade-offs that the request leaves open.',
    'Never ask what the code can answer. Each question must be specific to this request, never generic.',
    'Give 2 or 3 likely answers per question, at most 6 words each, that do not overlap.',
    'Return JSON: {"questions": [{"text": "the question", "why": "one sentence on what the answer changes", "options": ["answer", "answer"]}]}',
  ].join('\n')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clean(options: { value: unknown; limit: number }): string {
  return typeof options.value === 'string' ? options.value.replace(/\s+/g, ' ').trim().slice(0, options.limit) : ''
}

export function parseQuestions(reply: string): Question[] | null {
  const start = reply.indexOf('{')
  const end = reply.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(reply.slice(start, end + 1))
  } catch {
    return null
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.questions)) {
    return null
  }
  return parsed.questions
    .filter(isRecord)
    .map(question => ({
      text: clean({ value: question.text, limit: 220 }),
      why: clean({ value: question.why, limit: 200 }),
      options: Array.isArray(question.options)
        ? question.options.map(option => clean({ value: option, limit: 48 })).filter(Boolean).slice(0, 3)
        : [],
    }))
    .filter(question => question.text !== '')
    .slice(0, 5)
}

export function answerNote(answer: Answer): string {
  if (answer.mode === 'brainstorm') {
    return [
      '[Grill] While you work, the user marked this idea as worth doing for the current task:',
      answer.question,
      'Fold it in if it fits the request. If it does not fit, say why in your final answer.',
    ].join('\n')
  }
  return [
    '[Grill] While you work, the user answered a clarifying question about the current task.',
    `Q: ${answer.question}`,
    `A: ${answer.answer}`,
    'If this changes your plan, adjust your work now. Do not reply to this note on its own.',
  ].join('\n')
}

export function answersMessage(answers: readonly Answer[]): string {
  const lines = answers.map(answer =>
    answer.mode === 'brainstorm' ? `- Idea to include: ${answer.question}` : `- ${answer.question} ${answer.answer}`,
  )
  return ['Here are my answers to the grill questions. Please apply them to the work you just did:', ...lines].join('\n')
}

export function chatPrompt(options: { task: string; chat: readonly ChatMessage[] }): string {
  const transcript = options.chat.map(message => `${message.role === 'you' ? 'Developer' : 'You'}: ${message.text}`).join('\n')
  return [
    options.task ? `The developer's current task for their agent: ${options.task.slice(0, 1500)}` : '',
    'Conversation so far:',
    transcript,
    'Reply as "You" with your next message only.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function sharePrompt(chat: readonly ChatMessage[]): string {
  return [
    'Summarize this side conversation into notes the developer can hand to their AI coding agent.',
    'Write 2 to 5 short bullet points with the decisions and ideas worth acting on. No preamble.',
    '',
    chat.map(message => `${message.role === 'you' ? 'Developer' : 'Partner'}: ${message.text}`).join('\n'),
  ].join('\n')
}
