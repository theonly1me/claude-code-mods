import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { configureStage, installStage, STAGE_HIDDEN_KEY, toggleStageHidden } from './shared/pixel/stage'
import { FRAME_MS, MAX_COLUMNS, MIN_COLUMNS, STAGE_ROWS } from './sim/constants'
import { createNight } from './sim/night'

const LIFETIME_KEY = 'lifetimeFeeds'

const sessionAtom = atom({ plugin: 'night-feast', key: 'session' } as const, { feeds: 0, garlic: 0, night: 1 })
const night = createNight()

function summary(): string {
  const stats = night.stats()
  const sky = stats.percent === null ? 'dusk' : `context ${stats.percent}%`
  return `night feast · night ${stats.night} · ${sky} · blood ${stats.blood}% · ${stats.feeds} feeds this session`
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
    rasterKey: 'night-feast:stage',
    rows: STAGE_ROWS,
    minColumns: MIN_COLUMNS,
    maxColumns: MAX_COLUMNS,
    frameMs: FRAME_MS,
    scene: {
      resize: columns => night.resize(columns),
      tick: dtMs => {
        night.tick({ dtMs })
      },
      frame: () => night.frame(),
      summary,
    },
  })
  installStage(on)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'feast',
      description: 'Show or hide the night feast and see how full the context is',
      immediate: true,
    })
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
        night.garlic()
      } else {
        night.feed()
      }
      return ran
    } catch (error) {
      night.garlic()
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

  on('command.run', { command: 'feast' }, async $ => {
    const isHidden = toggleStageHidden()
    await $.store.set(STAGE_HIDDEN_KEY, isHidden)
    $.ui.invalidate('ui.render')
    const stats = night.stats()
    const dawn = stats.percent !== null && stats.percent >= 80 ? ' Dawn is close: consider /compact.' : ''
    return {
      text: [
        isHidden ? 'The night is hidden.' : 'The night is open.',
        `${summary()}.`,
        `Lifetime feeds: ${stats.lifetimeFeeds}. Garlic this session: ${stats.garlic}.${dawn}`,
      ].join('\n'),
    }
  })
}
