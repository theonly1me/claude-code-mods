import type { EngineInterface, Register } from 'claude-code'

import { isCreatedFile, localHour, toolKindOf } from './activity'
import { noop } from './shared/noop'
import { configureStage, installStage } from './shared/pixel/stage'
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

  configureStage({
    game: 'pocket-familiar',
    title: 'Pocket Familiar',
    command: {
      name: 'pet',
      description: 'Show or hide your fox familiar (on, off, stats)',
      report: () => familiar.report(),
    },
    rows: STAGE_ROWS,
    minColumns: MIN_COLUMNS,
    maxColumns: MAX_COLUMNS,
    frameMs: FRAME_MS,
    scene: {
      begin: epochMs => familiar.begin(epochMs),
      resize: columns => familiar.resize(columns),
      tick: dtMs => familiar.tick({ dtMs }),
      frame: () => familiar.frame(),
      summary: () => familiar.summary(),
      log: () => familiar.log(),
    },
  })
  installStage(on)

  on('session.start', async ($, e, next) => {
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
}
