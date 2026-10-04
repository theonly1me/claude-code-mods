import type { EngineInterface, Register } from 'claude-code'

import { noop } from './shared/noop'
import { plural } from './shared/text/meter'
import { configureStage, installStage, STAGE_HIDDEN_KEY, toggleStageHidden } from './shared/pixel/stage'
import { FRAME_MS, MAX_COLUMNS, MIN_COLUMNS, STAGE_ROWS } from './sim/constants'
import { CROP_LABELS, stageForLines } from './sim/crops'
import { farm, parseNumstat, projectRoot, setProjectRoot, userChanges } from './sim/ledger'
import { installWork } from './work'

const LIFETIME_KEY = 'lifetimeBushels'
const GIT_POLL_MS = 20000
const HOUR_POLL_MS = 60000

function summary(): string {
  const { plots, ripe, lifetimeBushels } = farm.summary()
  return `little harvest · ${plots} plots · ${ripe} ripe · ${lifetimeBushels} bushels`
}

function plotLines(): string[] {
  const plots = farm.plots()
  if (plots.length === 0) {
    return ['No plots yet. Every file that changes in this session becomes a plot.']
  }
  return [
    'Plots:',
    ...plots.map(plot => {
      const stage = stageForLines(plot.lines) + (plot.isWilted ? ', wilted' : '')
      return `  ${CROP_LABELS[plot.crop].padEnd(9)} ${stage.padEnd(16)} ${plot.path} (${plural({ count: plot.lines, word: 'line' })})`
    }),
  ]
}

async function syncHour($: EngineInterface): Promise<void> {
  const date = new Date(await $.clock.now())
  farm.setHour(date.getHours() + date.getMinutes() / 60)
}

async function pollGit($: EngineInterface): Promise<void> {
  const result = await $.process
    .run(['git', 'diff', '--numstat', 'HEAD'], { cwd: projectRoot(), timeoutMs: 3000 })
    .catch(() => undefined)
  if (!result || result.exitCode !== 0) {
    return
  }
  userChanges(parseNumstat(result.stdout)).forEach(change => farm.tend(change))
}

export const register: Register = on => {
  configureStage({
    rasterKey: 'little-harvest:stage',
    rows: STAGE_ROWS,
    minColumns: MIN_COLUMNS,
    maxColumns: MAX_COLUMNS,
    frameMs: FRAME_MS,
    scene: {
      resize: columns => farm.resize(columns),
      tick: dtMs => farm.tick(dtMs),
      frame: () => farm.frame(),
      summary,
    },
  })
  installStage(on)
  installWork(on)

  on('session.start', async ($, e, next) => {
    setProjectRoot(e.cwd)
    await $.command.register({
      name: 'farm',
      description: 'Show or hide Little Harvest and list every plot your changes planted',
      immediate: true,
    })
    farm.restore({ lifetimeBushels: Number((await $.store.get(LIFETIME_KEY)) ?? 0) })
    await syncHour($)
    await pollGit($)
    $.clock.every(HOUR_POLL_MS, () => {
      syncHour($).catch(noop)
    })
    $.clock.every(GIT_POLL_MS, () => {
      pollGit($).catch(noop)
    })
    return next(e)
  })

  on('command.run', { command: 'farm' }, async $ => {
    const isHidden = toggleStageHidden()
    await $.store.set(STAGE_HIDDEN_KEY, isHidden)
    $.ui.invalidate('ui.render')
    const { sessionBushels, lifetimeBushels } = farm.summary()
    return {
      text: [
        isHidden ? 'The farm is closed.' : 'The farm is open.',
        `Barn: ${plural({ count: sessionBushels, word: 'bushel' })} this session, ${lifetimeBushels} in all.`,
        ...plotLines(),
      ].join('\n'),
    }
  })

  on('turn.start', ($, e, next) => {
    farm.beginTurn()
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const harvested = farm.endTurn()
      if (harvested > 0) {
        await $.store.set(LIFETIME_KEY, farm.summary().lifetimeBushels)
        $.ui.toast(`Harvested ${harvested} ripe ${harvested === 1 ? 'crop' : 'crops'} into the barn`)
      }
    }
    return next(e)
  })
}
