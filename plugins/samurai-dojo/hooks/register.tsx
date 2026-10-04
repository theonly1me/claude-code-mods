import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import {
  configureStage,
  installStage,
  STAGE_HIDDEN_KEY,
  toggleStageHidden,
} from './shared/pixel/stage'
import { FRAME_MS, MAX_COLUMNS, MIN_COLUMNS, STAGE_ROWS } from './sim/constants'
import { createDojo } from './sim/dojo'
import { nextRankOf } from './sim/rank'

const LIFETIME_KEY = 'lifetimeKills'

const tallyAtom = atom({ plugin: 'samurai-dojo', key: 'tally' } as const, {
  codex: 0,
  gemini: 0,
})

export const register: Register = on => {
  const dojo = createDojo()

  function summary(): string {
    const { codex, gemini } = dojo.tally()
    return `samurai dojo · ${dojo.rank().title} · ${codex + gemini} slain this session · ${dojo.lifetimeKills()} lifetime`
  }

  configureStage({
    rasterKey: 'samurai-dojo:stage',
    rows: STAGE_ROWS,
    minColumns: MIN_COLUMNS,
    maxColumns: MAX_COLUMNS,
    frameMs: FRAME_MS,
    scene: {
      resize: columns => dojo.resize(columns),
      tick: dtMs => dojo.tick({ dtMs }),
      frame: () => dojo.frame(),
      summary,
    },
  })
  installStage(on)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dojo',
      description: 'Show or hide the samurai dojo and see your rank',
      immediate: true,
    })
    dojo.restore({
      tally: await read($, tallyAtom),
      lifetimeKills: Number((await $.store.get(LIFETIME_KEY)) ?? 0),
    })
    return next(e)
  })

  on('command.run', { command: 'dojo' }, async $ => {
    const isHidden = toggleStageHidden()
    await $.store.set(STAGE_HIDDEN_KEY, isHidden)
    $.ui.invalidate('ui.render')
    const nextRank = nextRankOf(dojo.lifetimeKills())
    const progress = nextRank
      ? `${nextRank.minimumKills - dojo.lifetimeKills()} more to ${nextRank.title}.`
      : 'The highest rank.'
    return {
      text: [
        isHidden ? 'The dojo is closed.' : 'The dojo is open.',
        summary(),
        `Rank: ${dojo.rank().title}. ${progress} Flurries this session: ${dojo.flurries()}.`,
      ].join('\n'),
    }
  })

  on('tool.call', async ($, e, next) => {
    const id = dojo.spawn({ isElite: e.tool === 'Agent' })
    try {
      const ran = await next(e)
      dojo.defeat({ id, isFailure: ran.deny !== undefined || ran.isError === true })
      return ran
    } catch (error) {
      dojo.defeat({ id, isFailure: true })
      throw error
    }
  })

  on('turn.complete', async ($, e, next) => {
    dojo.celebrate()
    await update($, tallyAtom, () => dojo.tally())
    await $.store.set(LIFETIME_KEY, dojo.lifetimeKills())
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await $.store.set(LIFETIME_KEY, dojo.lifetimeKills())
    return next(e)
  })
}
