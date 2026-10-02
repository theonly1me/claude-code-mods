import { expect, mock, test } from 'claude-code/testing'
import { register as bugbound } from '../siblings/bugbound/hooks/register'
import { register as farm } from '../siblings/little-harvest/hooks/register'
import { register as dojo } from '../siblings/samurai-dojo/hooks/register'
import { register as pet } from '../siblings/pocket-familiar/hooks/register'
import { register as journal } from '../siblings/change-journal/hooks/register'
import { register as behavior } from '../siblings/behavior-map/hooks/register'

for (const reverse of [false, true]) {
  const plugins = [{ name: 'bugbound', register: bugbound }, { name: 'little-harvest', register: farm }, { name: 'samurai-dojo', register: dojo }, { name: 'pocket-familiar', register: pet }, { name: 'change-journal', register: journal }, { name: 'behavior-map', register: behavior }]
  test('all scenes coexist and switch across ' + (reverse ? 'reverse' : 'normal') + ' load order', { plugins: reverse ? plugins.reverse() : plugins }, async ($, on) => {
    const clock = mock.clock(on)
    mock.store(on)
    on('session.id', () => ({ value: 'demo' }))
    on('session.cwd', () => ({ value: '/demo' }))
    on('command.register', ($, event) => ({ value: { command: event.name } }))
    on('session.start', ($, event) => ({ cwd: event.cwd }))
    on('ui.render', ($, event) => $.ui.resolve(event).Box({ children: [$.ui.resolve(event).Text({ key: 'existing', children: ['Existing mod'] })] }))
    await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
    const props = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120, scroll: { offset: 0, bodyRows: 20 }, view: {} }
    const ui = await $.ui.mount({ plugin: 'bugbound', surface: 'terminal', component: 'AbovePrompt', props })
    expect((JSON.stringify(await ui.drawn()).match(/"type":"Raster"/g) ?? []).length).toBe(1)
    expect(JSON.stringify(await ui.drawn())).toContain('(ᵔᴥᵔ)')
    expect(JSON.stringify(await ui.drawn())).toContain('Existing mod')
    for (const command of ['farm', 'dojo', 'pet', 'bugbound']) {
      await clock.advance(1)
      await $.command.run({ command, args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } })
      expect((JSON.stringify(await ui.drawn()).match(/"type":"Raster"/g) ?? []).length).toBe(1)
    }
    const small = await $.ui.mount({ plugin: 'bugbound', surface: 'terminal', component: 'AbovePrompt', props: { ...props, bodyColumns: 18, maxRows: 5 } })
    expect((await small.findAll({ type: 'Raster' })).length).toBe(0)
    const survey = await $.ui.mount({ plugin: 'bugbound', surface: 'terminal', component: 'AbovePrompt', props: { ...props, hasSurvey: true } })
    expect((await survey.findAll({ type: 'Raster' })).length).toBe(0)
  })
}

test('the journal supplies both views with one model request', { plugins: [{ name: 'change-journal', register: journal }, { name: 'behavior-map', register: behavior }] }, async ($, on) => {
  const clock = mock.clock(on)
  on('session.cwd', () => ({ value: '/demo' }))
  on('command.register', ($, event) => ({ value: { command: event.name } }))
  on('session.start', ($, event) => ({ cwd: event.cwd }))
  on('turn.start', ($, event) => ({ turnId: event.turnId }))
  on('tool.call', () => ({ result: 'Observed' }))
  let calls = 0
  on('model.complete', () => { calls += 1; return { value: { isAnswered: true, text: JSON.stringify({ summary: 'Guard empty carts', entries: [{ text: 'Check before payment', evidenceIds: ['e1'] }], before: [{ text: 'Pay immediately', evidenceIds: ['e1'] }], after: [{ text: 'Check cart first', evidenceIds: ['e1'] }] }), usage: { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } } })
  await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'Edit', turnId: 'one' })
  await $.tool.call({ tool: 'Edit', file_path: '/demo/cart.ts', old_string: 'pay()', new_string: 'if (items.length) pay()' })
  await clock.advance(4000)
  expect(calls).toBe(1)
  const ui = await $.ui.mount({ plugin: 'behavior-map', surface: 'terminal', component: 'Pane', requestId: 'behavior-map', props: { title: 'Behavior', isFocused: false, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} } })
  expect(JSON.stringify(await ui.drawn())).toContain('Check cart first')
})
