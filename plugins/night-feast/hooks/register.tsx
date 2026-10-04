import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { configureStage, installStage } from './shared/pixel/stage'
import { FRAME_MS, MAX_COLUMNS, MIN_COLUMNS, STAGE_ROWS } from './sim/constants'
import { createNight } from './sim/night'

const LIFETIME_KEY = 'lifetimeFeeds'

const sessionAtom = atom({ plugin: 'night-feast', key: 'session' } as const, { feeds: 0, garlic: 0, night: 1 })
const night = createNight()

function report(): string[] {
  const stats = night.stats()
  const dawn = stats.percent !== null && stats.percent >= 80 ? ' Dawn is close: consider /compact.' : ''
  return [night.summary(), `Lifetime feeds: ${stats.lifetimeFeeds}. Garlic this session: ${stats.garlic}.${dawn}`]
}

function applyMeasure($: EngineInterface, options: { percent: number | null }): void {
  const outcome = night.measure(options.percent)
  if (outcome.toast !== undefined) {
    $.ui.toast(outcome.toast)
  }
  if (outcome.isNewNight) {
    $.ui.toast(`Night ${night.stats().night} begins. The context was compacted.`)
  }
}

async function saveProgress($: EngineInterface): Promise<void> {
  const stats = night.stats()
  await update($, sessionAtom, () => ({ feeds: stats.feeds, garlic: stats.garlic, night: stats.night }))
  await $.store.set(LIFETIME_KEY, stats.lifetimeFeeds)
}

export const register: Register = on => {
  configureStage({
    game: 'night-feast',
    title: 'Night Feast',
    command: {
      name: 'feast',
      description: 'Show or hide the night feast (on, off, stats)',
      report,
    },
    rows: STAGE_ROWS,
    minColumns: MIN_COLUMNS,
    maxColumns: MAX_COLUMNS,
    frameMs: FRAME_MS,
    scene: {
      begin: () => undefined,
      resize: columns => night.resize(columns),
      tick: dtMs => {
        night.tick({ dtMs })
      },
      frame: () => night.frame(),
      summary: () => night.summary(),
      log: () => night.log(),
    },
  })
  installStage(on)

  on('session.start', async ($, e, next) => {
    const saved = await read($, sessionAtom)
    night.restore({ ...saved, lifetimeFeeds: Number((await $.store.get(LIFETIME_KEY)) ?? 0) })
    const usage = await $.session.usage().catch(() => undefined)
    applyMeasure($, { percent: usage?.context.percent ?? null })
    return next(e)
  })

  on('session.measure', ($, e, next) => {
    if (e.changed.includes('context')) {
      applyMeasure($, { percent: e.context.percent ?? null })
    }
    return next(e)
  })

  on('classic.SessionStart', ($, e, next) => {
    if (e.source === 'compact') {
      night.compacted()
    }
    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    if (e.origin.kind === 'composer' && e.turnId === undefined) {
      night.arrive()
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    try {
      const ran = await next(e)
      if (ran.deny !== undefined || ran.isError === true) {
        night.garlic(e.tool)
      } else {
        night.feed(e.tool)
      }
      return ran
    } catch (error) {
      night.garlic(e.tool)
      throw error
    }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      night.celebrate()
      const usage = await $.session.usage().catch(() => undefined)
      if (usage) {
        applyMeasure($, { percent: usage.context.percent ?? null })
      }
      await saveProgress($)
    }
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await $.store.set(LIFETIME_KEY, night.stats().lifetimeFeeds)
    return next(e)
  })
}
