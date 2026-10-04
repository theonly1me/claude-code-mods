import type { EngineInterface, Register } from 'claude-code'

import { configureStage, installStage, isStageShown } from './shared/pixel/stage'
import { noop } from './shared/noop'
import { FRAME_MS, MAX_COLUMNS, MIN_COLUMNS, STAGE_ROWS } from './sim/constants'
import { createBattle } from './sim/battle'
import type { StoryEvent } from './sim/types'
import { CHAPTERS, chapterAt, maxHpFor } from './story/campaign'
import { progressFromStore } from './story/progress'
import { statusLine, storySoFar } from './story/telling'

const PROGRESS_KEY = 'progress'
const EVENT_POLL_MS = 500
const STORY_TOAST_MS = 7000

let battle = createBattle()
let hasGreeted = false

function toastFor(event: StoryEvent): string {
  const progress = battle.progress()
  if (event.kind === 'defeated') {
    return `Chapter ${event.chapter + 1} complete. ${chapterAt(event.chapter).ending}`
  }
  if (event.kind === 'chapter') {
    const chapter = chapterAt(event.chapter)
    return `Chapter ${event.chapter + 1}: ${chapter.place}. ${chapter.opening}`
  }
  if (event.kind === 'dawn') {
    return `Dawn. ${CHAPTERS[CHAPTERS.length - 1]?.ending ?? ''} The Corps rests. Night ${progress.cycle} will be harder.`
  }
  return 'The Corps regroups. Failed commands gave the demon time to recover.'
}

function greeting(): string {
  const progress = battle.progress()
  const chapter = chapterAt(progress.chapter)
  return `Chapter ${progress.chapter + 1}: ${chapter.place}. ${chapter.demon} has ${progress.demonHp} of ${maxHpFor(progress)} left. ${chapter.opening}`
}

async function tellEvents($: EngineInterface): Promise<void> {
  const isShown = isStageShown()
  if (isShown && !hasGreeted) {
    hasGreeted = true
    $.ui.toast(greeting(), { timeoutMs: STORY_TOAST_MS })
  }
  const events = battle.takeEvents()
  if (events.length === 0) {
    return
  }
  if (isShown) {
    events.forEach(event => $.ui.toast(toastFor(event), { timeoutMs: STORY_TOAST_MS }))
  }
  await $.store.set(PROGRESS_KEY, battle.progress())
}

function report(): string[] {
  const progress = battle.progress()
  return [
    statusLine(progress),
    chapterAt(progress.chapter).opening,
    `Lifetime: ${progress.attacks} attacks, ${progress.defeated} demons defeated, ${progress.dawns} dawns. /slayer-story tells the story so far.`,
  ]
}

export const register: Register = on => {
  battle = createBattle()
  hasGreeted = false
  configureStage({
    game: 'slayer-corps',
    title: 'Slayer Corps',
    command: { name: 'slayer', description: 'Show or hide the Slayer Corps fight (on, off, stats)', report },
    rows: STAGE_ROWS,
    minColumns: MIN_COLUMNS,
    maxColumns: MAX_COLUMNS,
    frameMs: FRAME_MS,
    scene: {
      begin: noop,
      resize: columns => battle.resize(columns),
      tick: dtMs => battle.tick(dtMs),
      frame: () => battle.frame(),
      summary: () => statusLine(battle.progress()),
      log: () => battle.log(),
    },
  })
  installStage(on)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'slayer-story',
      description: 'Slayer Corps: the story so far and how the fight works',
      immediate: true,
    })
    battle.restore(progressFromStore(await $.store.get(PROGRESS_KEY)))
    $.clock.every(EVENT_POLL_MS, () => {
      tellEvents($).catch(noop)
    })
    return next(e)
  })

  on('command.run', { command: 'slayer-story' }, async () => ({ text: storySoFar(battle.progress()) }))

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined) {
      battle.strike({ tool: String(e.tool), isFailure: ran.deny !== undefined || ran.isError === true })
    }
    return ran
  })

  on('prompt.submit', ($, e, next) => {
    if (e.origin.kind === 'composer' && e.turnId === undefined) {
      battle.summonNezuko()
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted) {
      battle.finish()
      await $.store.set(PROGRESS_KEY, battle.progress())
    }
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await $.store.set(PROGRESS_KEY, battle.progress())
    return next(e)
  })
}
