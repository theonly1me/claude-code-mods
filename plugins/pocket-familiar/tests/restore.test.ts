import { expect, mock, test } from 'claude-code/testing'

test('stored sessions contribute to growth after a restart', async ($, on) => {
  mock.clock(on)
  mock.store(on, { 'progress:older': { completed: 9, harvests: 36, kills: 0 } })
  on('session.id', () => ({ value: 'new' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('turn.complete', ($, event) => ({ text: event.answer }))
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  const command = { command: 'pet', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as const
  expect((await $.command.run(command)).text).toContain('hatchling')
  await $.turn.start({ text: 'Complete one turn', turnId: 'one' })
  await $.turn.complete({ reason: 'answer', answer: 'Done', durationMs: 100, isAborted: false, turnId: 'one' })
  expect((await $.command.run(command)).text).toContain('juvenile')
})
