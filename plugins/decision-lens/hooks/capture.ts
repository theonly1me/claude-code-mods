import type { On, TurnStepChunk } from 'claude-code'

import { completeLensTurn, noteNarration, noteToolEnd, noteToolStart, startLensTurn } from './lens/state'
import { toolSummary } from './lens/trace'

type PendingBlock = { kind: 'said' | 'thought'; index: number; text: string }

function flush(pending: PendingBlock[]): PendingBlock[] {
  pending.forEach(block => noteNarration({ kind: block.kind, text: block.text }))
  return []
}

function absorb(options: { chunk: TurnStepChunk; pending: PendingBlock[] }): PendingBlock[] {
  const { chunk, pending } = options
  if (chunk.kind === 'tool') {
    return flush(pending)
  }
  if (chunk.kind !== 'text' && chunk.kind !== 'thinking') {
    return pending
  }
  const kind = chunk.kind === 'text' ? 'said' : 'thought'
  const last = pending.at(-1)
  if (last && last.kind === kind && last.index === chunk.index) {
    last.text += chunk.text
    return pending
  }
  return [...pending, { kind, index: chunk.index, text: chunk.text }]
}

export function installCapture(on: On): void {
  on('turn.start', ($, e, next) => {
    startLensTurn({ turnId: e.turnId, prompt: e.text })
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const stream = next(e)
    let pending: PendingBlock[] = []
    for await (const chunk of stream) {
      if (e.agentId === undefined) {
        pending = absorb({ chunk, pending })
      }
      yield chunk
    }
    flush(pending)
    return await stream.result
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    noteToolStart({ toolUseId: e.tool_use_id, summary: toolSummary({ tool: String(e.tool), input: e }) })
    const ran = await next(e)
    const outcome = ran.deny !== undefined ? 'denied' : ran.isError === true ? 'error' : 'ok'
    noteToolEnd({ toolUseId: e.tool_use_id, outcome })
    return ran
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      const turn = completeLensTurn({ answer: e.answer })
      if (turn?.status === 'waiting') {
        $.ui.status('◆ reading the decisions in this turn')
      }
    }
    return next(e)
  })
}
