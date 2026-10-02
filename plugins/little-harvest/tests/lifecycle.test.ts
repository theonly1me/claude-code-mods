import { expect, mock, test } from 'claude-code/testing'

test('only main-loop completion harvests crops and clearing starts a fresh contribution', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  let sessionId = 'first'
  on('session.id', () => ({ value: sessionId }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('turn.complete', ($, event) => ({ text: event.answer }))
  on('session.end', ($, event) => ({ sessionId: event.sessionId }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'Grow', turnId: 'one' })
  const completion = { reason: 'answer', answer: 'Done', durationMs: 100, isAborted: false, turnId: 'one' } as const
  await $.turn.complete({ ...completion, agentId: 'helper' })
  const command = { command: 'farm', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as const
  expect((await $.command.run(command)).text).toContain('0 harvested')
  await $.turn.complete(completion)
  await $.turn.complete(completion)
  expect((await $.command.run(command)).text).toContain('4 harvested')
  await $.turn.start({ text: 'Interrupted', turnId: 'two' })
  await $.turn.complete({ ...completion, reason: 'aborted', isAborted: true, turnId: 'two' })
  expect((await $.command.run(command)).text).toContain('4 harvested')
  await $.session.end({ reason: 'clear', sessionId: 'first', resume: { id: 'first' } })
  sessionId = 'second'
  await $.turn.start({ text: 'Fresh', turnId: 'three' })
  await $.turn.complete({ ...completion, turnId: 'three' })
  expect((await $.command.run(command)).text).toContain('8 harvested')
})
