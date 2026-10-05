import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { engine, runTheme, start, VIEWPORT } from './engine'

const TABLE = '| Moment | Your skill | Bundled skill |\n| --- | --- | --- |\n| fix this | scoped-fix | Reproduce, then fix |'

async function reply(options: { $: Engine; id: string; text: string }) {
  return options.$.ui.mount({
    plugin: 'looks',
    surface: 'terminal',
    component: 'AssistantMessage',
    requestId: options.id,
    viewport: VIEWPORT,
    props: { text: options.text, isFirstOfReply: true },
  })
}

async function widths(mounted: Awaited<ReturnType<typeof reply>>): Promise<unknown[]> {
  return (await mounted.findAll({ type: 'Box' })).map(box => box.props.width).filter(width => width !== undefined)
}

test('in the left layout a themed reply is never capped to the reading width', async ($, on) => {
  engine({ on })
  await start($)
  await runTheme({ $, args: 'synthwave' })
  const mounted = await reply({ $, id: 'left', text: 'Short answer.' })
  expect(await widths(mounted)).not.toContain(100)
})

test('in the centered layout a reply keeps the reading width', { options: { layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  const mounted = await reply({ $, id: 'centered', text: 'Short answer.' })
  expect(await widths(mounted)).toContain(100)
})

test('in the centered layout a reply with a table gets the full width so its borders never wrap', { options: { layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  const mounted = await reply({ $, id: 'table', text: `Here is the table:\n\n${TABLE}` })
  expect(await widths(mounted)).not.toContain(100)
  expect(await mounted.drawn()).not.toMatchObject({ props: { paddingLeft: 30 } })
})

test('a pipe in plain text is not mistaken for a table', { options: { layout: 'centered' } }, async ($, on) => {
  engine({ on })
  await start($)
  const mounted = await reply({ $, id: 'pipe', text: 'Use a | b to pick one.' })
  expect(await widths(mounted)).toContain(100)
})
