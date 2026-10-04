import type { EngineInterface, Register } from 'claude-code'

import { isCreatedFile, localHour, toolKindOf } from './activity'
import { noop } from './shared/noop'
import { configureStage, installStage, STAGE_HIDDEN_KEY, toggleStageHidden } from './shared/pixel/stage'
import { meter } from './shared/text/meter'
import { FRAME_MS, MAX_COLUMNS, MIN_COLUMNS, STAGE_ROWS } from './sim/constants'
import { createFamiliar } from './sim/familiar'
import type { Familiar } from './sim/familiar'
import { savedFrom } from './sim/stats'

const SAVE_KEY = 'familiar'
const SAVE_EVERY_MS = 60 * 1000

async function save($: EngineInterface, options: { familiar: Familiar }): Promise<void> {
  await $.store.set(SAVE_KEY, options.familiar.snapshot(await $.clock.now()))
}

function announce($: EngineInterface, options: { familiar: Familiar }): void {
  options.familiar.takeEvolutions().forEach(growth => {
    $.ui.toast(growth.form === 'kit' ? 'The egg hatched into a fox kit.' : `Your familiar grew into a ${growth.title}.`)
  })
}

export const register: Register = on => {
  const familiar = createFamiliar()

  function summary(): string {
    const { stats } = familiar.view()
    return `pocket familiar · ${familiar.growth().title} · ${familiar.mood()} · fullness ${Math.round(stats.fullness)} · joy ${Math.round(stats.joy)} · energy ${Math.round(stats.energy)}`
  }

  function statsReport(): string {
    const { stats, lifetimeXp } = familiar.view()
    const next = familiar.nextGrowth()
    const growthLine = next
      ? `XP ${lifetimeXp}. ${next.minimumXp - lifetimeXp} more to become a ${next.title}.`
      : `XP ${lifetimeXp}. Fully grown.`
    const row = (options: { label: string; value: number }): string =>
      `${options.label.padEnd(9)}${meter({ value: options.value, max: 100, width: 16 })} ${String(Math.round(options.value)).padStart(3)}`
    return [
      `Your familiar is a ${familiar.growth().title}, and it is ${familiar.mood()}.`,
      row({ label: 'fullness', value: stats.fullness }),
      row({ label: 'joy', value: stats.joy }),
      row({ label: 'energy', value: stats.energy }),
      growthLine,
      'It eats when your tests pass, cheers when a turn finishes, and naps after five quiet minutes.',
    ].join('\n')
  }

  configureStage({
    rasterKey: 'pocket-familiar:stage',
    rows: STAGE_ROWS,
    minColumns: MIN_COLUMNS,
    maxColumns: MAX_COLUMNS,
    frameMs: FRAME_MS,
    scene: {
      resize: columns => familiar.resize(columns),
      tick: dtMs => familiar.tick({ dtMs }),
      frame: () => familiar.frame(),
      summary,
    },
  })
  installStage(on)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pet',
      description: 'Show or hide your fox familiar and see how it is doing',
      immediate: true,
    })
    const saved = savedFrom(await $.store.get(SAVE_KEY))
    if (saved) {
      familiar.restore({ saved, now: await $.clock.now() })
    }
    familiar.setHour(localHour())
    $.clock.every(SAVE_EVERY_MS, () => {
      familiar.setHour(localHour())
      save($, { familiar }).catch(noop)
    })
    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    familiar.userActive()
    return next(e)
  })

  on('turn.start', ($, e, next) => {
    familiar.turnStarted()
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const kind = toolKindOf({ tool: String(e.tool), command: e.tool === 'Bash' ? e.command : '' })
    familiar.toolStarted(kind)
    try {
      const ran = await next(e)
      const isFailure = ran.deny !== undefined || ran.isError === true
      const isCreation = e.tool === 'Write' && !isFailure && isCreatedFile(ran.result)
      familiar.toolFinished({ kind, isFailure, isCreation })
      announce($, { familiar })
      return ran
    } catch (error) {
      familiar.toolFinished({ kind, isFailure: true, isCreation: false })
      throw error
    }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      familiar.turnCompleted({ isSuccess: e.reason === 'answer' })
      announce($, { familiar })
      await save($, { familiar })
    }
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await save($, { familiar })
    return next(e)
  })

  on('command.run', { command: 'pet' }, async $ => {
    const isHidden = toggleStageHidden()
    await $.store.set(STAGE_HIDDEN_KEY, isHidden)
    $.ui.invalidate('ui.render')
    return { text: [isHidden ? 'The familiar is hidden.' : 'The familiar is out.', statsReport()].join('\n') }
  })
}
