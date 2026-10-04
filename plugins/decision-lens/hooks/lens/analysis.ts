import { traceText } from './trace'
import type { Confidence, Decision, LensTurn } from './types'

export const ANALYSIS_SYSTEM =
  'You review the work trace of an AI coding agent and name the real decisions it made. You are precise, fair, and brief. Reply with one JSON object and nothing else.'

export function analysisPrompt(turn: LensTurn): string {
  return [
    `The user asked: ${turn.prompt}`,
    '',
    'Trace of the agent turn, in order:',
    traceText(turn.trace) || '- (no tool calls or narration were recorded)',
    '',
    `Final answer (excerpt): ${turn.answer.slice(0, 1500) || '(none)'}`,
    '',
    'Name up to 5 decisions that shaped the result: approach, scope, which files or tools, assumptions, and trade-offs.',
    'Skip routine steps such as reading a file to understand it. If there were no real decisions, return {"decisions": []}.',
    'Return JSON with this shape:',
    '{"decisions": [{',
    ' "title": "the decision in at most 8 words",',
    ' "choice": "what the agent did, one sentence",',
    ' "why": "the reason the trace shows, one or two sentences; say so if the trace shows no reason",',
    ' "alternatives": ["a real option it did not take", "another"],',
    ' "evidence": "a short quote or fact from the trace",',
    ' "confidence": "high, medium, or low: how sure you are that this reading is right",',
    ' "keep": "an imperative rule that would make the agent do this again, at most 20 words",',
    ' "avoid": "an imperative rule that would stop the agent doing this, at most 20 words"',
    '}]}',
  ].join('\n')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(options: { value: unknown; limit: number }): string {
  return typeof options.value === 'string' ? options.value.replace(/\s+/g, ' ').trim().slice(0, options.limit) : ''
}

function confidenceOf(value: unknown): Confidence {
  return value === 'high' || value === 'low' ? value : 'medium'
}

export function parseDecisions(reply: string): Decision[] | null {
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
  if (!isRecord(parsed) || !Array.isArray(parsed.decisions)) {
    return null
  }
  return parsed.decisions
    .filter(isRecord)
    .map((decision, index) => ({
      id: index + 1,
      title: text({ value: decision.title, limit: 80 }),
      choice: text({ value: decision.choice, limit: 300 }),
      why: text({ value: decision.why, limit: 400 }),
      alternatives: Array.isArray(decision.alternatives)
        ? decision.alternatives.map(alternative => text({ value: alternative, limit: 160 })).filter(Boolean).slice(0, 3)
        : [],
      evidence: text({ value: decision.evidence, limit: 240 }),
      confidence: confidenceOf(decision.confidence),
      keep: text({ value: decision.keep, limit: 200 }),
      avoid: text({ value: decision.avoid, limit: 200 }),
      explanation: '',
      isAsking: false,
    }))
    .filter(decision => decision.title !== '' && decision.choice !== '')
    .slice(0, 5)
}

export function askWhyPrompt(decision: Decision): string {
  const alternatives = decision.alternatives.length > 0 ? ` instead of ${decision.alternatives.join(', or ')}` : ''
  return [
    `Earlier in this conversation you made this decision: ${decision.choice}${alternatives}.`,
    'In three to five sentences, explain why. Name what you saw in the code or the conversation that led you there,',
    'what you were optimizing for, and what would have made you choose differently. Plain prose, no lists, no headings.',
  ].join(' ')
}
