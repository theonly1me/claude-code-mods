import type { Register } from 'claude-code'

export const register: Register = on => {
  const calls: { model: string | undefined; effort: string | undefined; maxTokens: number | undefined; timeoutMs: number | undefined; answered: boolean }[] = []
  on('session.start', async ($, event, next) => {
    const result = await next(event)
    await $.command.run({ command: 'changes', args: 'show' })
    return result
  })
  on('model.complete', async ($, event, next) => {
    const result = await next(event)
    calls.push({ model: event.model, effort: event.effort, maxTokens: event.maxTokens, timeoutMs: event.timeoutMs, answered: result.value?.isAnswered === true })
    return result
  })
  on('turn.complete', async ($, event, next) => {
    const result = await next(event)
    if (event.agentId !== undefined) return result
    let ready = false
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const journal = await $.state.get({ plugin: 'change-journal', key: 'analysis' })
      if (journal.value?.status === 'ready' && journal.value.analysis !== null) { ready = true; break }
      await $.clock.sleep(1000)
    }
    const directory = await $.session.cwd()
    await $.fs.write(directory + '/mod-smoke.json', JSON.stringify({ ready, calls }))
    return result
  })
}
