import type { On, TurnStepChunk } from 'claude-code'

import { reasonFrom } from './journal/reason'
import type { StepNarration } from './journal/reason'
import { recordReason } from './journal/state'

function noteChunk(options: { chunk: TurnStepChunk; narration: StepNarration }): StepNarration {
  const { chunk, narration } = options
  if (chunk.kind === 'text') {
    return { ...narration, text: narration.text + chunk.text }
  }
  if (chunk.kind === 'thinking') {
    return { ...narration, thinking: narration.thinking + chunk.text }
  }
  if (chunk.kind === 'tool') {
    recordReason({ toolUseId: chunk.id, reason: reasonFrom(narration) })
  }
  return narration
}

export function installReasons(on: On): void {
  on('turn.step', async function* ($, e, next) {
    const stream = next(e)
    let narration: StepNarration = { text: '', thinking: '' }
    for await (const chunk of stream) {
      narration = noteChunk({ chunk, narration })
      yield chunk
    }
    return await stream.result
  })
}
