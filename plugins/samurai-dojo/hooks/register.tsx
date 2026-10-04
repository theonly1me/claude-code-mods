import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { configureStage, installStage } from './shared/pixel/stage'
import { FRAME_MS, MAX_COLUMNS, MIN_COLUMNS, STAGE_ROWS } from './sim/constants'
import { createDojo } from './sim/dojo'
import { nextRankOf } from './sim/rank'

const LIFETIME_KEY = 'lifetimeKills'

const tallyAtom = atom({ plugin: 'samurai-dojo', key: 'tally' } as const, {
  codex: 0,
  gemini: 0,
  chatgpt: 0,
})

export const register: Register = on => {
  const dojo = createDojo()

  function totalSlain(): number {
    const { codex, gemini, chatgpt } = dojo.tally()
    return codex + gemini + chatgpt
  }

  function report(): string[] {
    const nextRank = nextRankOf(dojo.lifetimeKills())
    const progress = nextRank
      ? `${nextRank.minimumKills - dojo.lifetimeKills()} more to ${nextRank.title}.`
      : 'The highest rank.'
    return [
      dojo.summary(),
      `Rank: ${dojo.rank().title}. ${progress} Flurries this session: ${dojo.flurries()}.`,
      `Slain this session: ${totalSlain()}. Lifetime: ${dojo.lifetimeKills()}.`,
    ]
  }

  configureStage({
    game: 'samurai-dojo',
    title: 'Samurai Dojo',
    command: {
      name: 'dojo',
      description: 'Show or hide the samurai dojo (on, off, stats)',
      report,
    },
    rows: STAGE_ROWS,
    minColumns: MIN_COLUMNS,
    maxColumns: MAX_COLUMNS,
    frameMs: FRAME_MS,
    scene: {
      begin: epochMs => dojo.begin(epochMs),
      resize: columns => dojo.resize(columns),
      tick: dtMs => dojo.tick({ dtMs }),
      frame: () => dojo.frame(),
      summary: () => dojo.summary(),
      log: () => dojo.log(),
    },
  })
  installStage(on)

  on('session.start', async ($, e, next) => {
    const saved = await read($, tallyAtom)
    dojo.restore({
      tally: { codex: saved.codex, gemini: saved.gemini, chatgpt: saved.chatgpt ?? 0 },
      lifetimeKills: Number((await $.store.get(LIFETIME_KEY)) ?? 0),
    })
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const id = dojo.spawn({ isElite: e.tool === 'Agent', label: e.tool })
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
