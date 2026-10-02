import { atom, read, update } from 'claude-code'
import type { Register, CoreEngineInterface, Timer } from 'claude-code'
import { classifyActivity, currentActivity, activityLabel, isTestEdit } from './shared/activity'
import type { Activity } from './shared/activity'
import { selectedScene, sceneDimensions, sceneCommands, sceneTitles } from './shared/scene'
import type { Claim } from './shared/scene'
import { createWorld, beginWorld, finishWorld, finishActivity, advanceWorld, worldDescription, snapshotWorld, restoreWorld } from './shared/world'
import { parseProgress, totalProgress, petStage } from './shared/progress'
import { createBitmap } from './shared/render/bitmap'
import { encodeCells } from './shared/render/cells'
import { colorText } from './shared/client-render'
import { drawGame } from './shared/game/draw'

const claimAtom = atom({ plugin: 'bugbound', key: 'claim' } as const, { enabled: true, selectedAt: 0, expanded: true, playing: false })
function noop(): undefined { return undefined }
async function readScenes($: CoreEngineInterface) {
  const bugbound = await $.state.get({ plugin: 'bugbound', key: 'claim' })
  const farm = await $.state.get({ plugin: 'little-harvest', key: 'claim' })
  const dojo = await $.state.get({ plugin: 'samurai-dojo', key: 'claim' })
  const pet = await $.state.get({ plugin: 'pocket-familiar', key: 'claim' })
  return [{ name: 'bugbound', claim: bugbound.value }, { name: 'little-harvest', claim: farm.value }, { name: 'samurai-dojo', claim: dojo.value }, { name: 'pocket-familiar', claim: pet.value }] as const
}

export const register: Register = on => {
  const world = createWorld()
  const active = new Map<string, Activity>()
  let claim: Claim = { ...claimAtom.initial }
  let requestId: string | undefined
  let dimensions = { columns: 72, rows: 8 }
  let progressKey = ''
  let timer: Timer | undefined
  let saved = Promise.resolve()
  let generation = 0

  function sceneBitmap() {
    const bitmap = createBitmap({ width: dimensions.columns, height: dimensions.rows * 2 })
    drawGame({ bitmap, game: world.game, tick: world.tick })
    return bitmap
  }
  function paint() { return encodeCells(sceneBitmap()) }
  on('session.start', async ($, event, next) => {
    await $.command.register({ name: 'bugbound', description: 'Show Bugbound. Options: show, hide, compact, expanded, play, watch', immediate: true })
    claim = await read($, claimAtom)
    await update($, claimAtom, () => claim)
    progressKey = 'progress:' + await $.session.id()
    const values = []
    for (const key of await $.store.keys()) if (key.startsWith('progress:')) values.push(parseProgress(await $.store.get(key)))
    const total = totalProgress(values)
    world.completed = total.completed; world.harvests = total.harvests; world.kills = total.kills
    world.contributions = parseProgress(await $.store.get(progressKey))
    world.beds = Array.from({ length: Math.min(4, Math.floor(world.harvests / 4)) }, () => 4)
    const lifecycle = await $.state.get({ plugin: 'bugbound', key: 'lifecycle' })
    if (lifecycle.value !== undefined) restoreWorld({ world, snapshot: lifecycle.value })
    if (timer === undefined) {
    timer = $.clock.every(80, () => {
      advanceWorld({ world, playing: claim.playing })

      if (requestId !== undefined && !claim.playing) $.ui.blit({ requestId, key: 'stage', cells: paint() }).catch(noop)
      if (world.tick % 10 === 0) $.ui.invalidate('ui.render')
    })
    }
    return next(event)
  })
  on('turn.start', async ($, event, next) => {
    generation += 1; active.clear(); world.pending = 0
    progressKey = 'progress:' + await $.session.id()
    world.contributions = parseProgress(await $.store.get(progressKey))
    if (timer === undefined) {
    timer = $.clock.every(80, () => {
      advanceWorld({ world, playing: claim.playing })

      if (requestId !== undefined && !claim.playing) $.ui.blit({ requestId, key: 'stage', cells: paint() }).catch(noop)
      if (world.tick % 10 === 0) $.ui.invalidate('ui.render')
    })
    }
    beginWorld(world)
    await $.state.set({ plugin: 'bugbound', key: 'lifecycle' }, snapshotWorld(world))
    $.ui.invalidate('ui.render')
    return next(event)
  })
  on('tool.call', async ($, event, next) => {
    const toolGeneration = generation
    const activity = classifyActivity(event)
    active.set(event.tool_use_id, activity)
    world.pending = active.size
    world.activity = currentActivity({ active, isWorking: world.working })

    $.ui.invalidate('ui.render')
    try {
      const result = await next(event)
      const successful = result.deny === undefined && result.isError !== true
      if (toolGeneration === generation) finishActivity({ world, activity, successful, testEdit: isTestEdit(event), denied: result.deny !== undefined })

      return result
    } finally {
      if (toolGeneration === generation) { active.delete(event.tool_use_id); world.pending = active.size; if (active.size > 0 || !world.working) world.activity = currentActivity({ active, isWorking: world.working }) }
      await $.state.set({ plugin: 'bugbound', key: 'lifecycle' }, snapshotWorld(world))
      $.ui.invalidate('ui.render')
    }
  })
  on('turn.complete', async ($, event, next) => {
    if (event.agentId !== undefined) return next(event)
    finishWorld({ world, successful: event.reason === 'answer' && !event.isAborted })

    const snapshot = { ...world.contributions }; const key = progressKey
    saved = saved.catch(noop).then(() => $.store.set(key, snapshot))
    await saved
    await $.state.set({ plugin: 'bugbound', key: 'lifecycle' }, snapshotWorld(world))
    $.ui.invalidate('ui.render')
    return next(event)
  })
  on('session.end', async ($, event, next) => {
    generation += 1
    timer?.cancel(); timer = undefined; requestId = undefined
    await saved.catch(noop)
    active.clear(); world.working = false; world.activity = 'idle'
    world.contributions = { completed: 0, harvests: 0, kills: 0 }
    world.crops = 0; world.beds = []
    await $.state.set({ plugin: 'bugbound', key: 'lifecycle' }, snapshotWorld(world))
    return next(event)
  })
  on('command.run', { command: 'bugbound' }, async ($, event) => {
    const action = event.args.trim() || 'show'
    if (!['show', 'hide', 'compact', 'expanded', 'toggle', 'play', 'watch'].includes(action)) return { text: 'Use /bugbound show, hide, compact, or expanded, play, or watch.' }
    const selectedAt = await $.clock.now()
    claim = { ...claim, selectedAt, enabled: action === 'hide' ? false : action === 'toggle' ? !claim.enabled : true, expanded: action === 'compact' ? false : action === 'expanded' ? true : claim.expanded, playing: action === 'play' ? true : action === 'watch' ? false : claim.playing }
    await update($, claimAtom, () => claim)
    return { text: `Bugbound ${claim.enabled ? 'open' : 'hidden'} · ${worldDescription({ world, scene: 'bugbound' })}` }
  })
  on('ui.render', { component: 'AbovePrompt' }, async ($, event, next) => {
    requestId = undefined
    if (event.props.hasSurvey) return next(event)
    const entries = await readScenes($)
    const winner = selectedScene(entries)
    const theirs = await next(event)
    const { Box, Text, Button } = $.ui.resolve(event)
    if (winner !== 'bugbound') {

      return theirs
    }
    dimensions = sceneDimensions({ columns: event.props.bodyColumns, rows: event.props.maxRows, expanded: claim.expanded, reservedRows: 5 })
    if (dimensions.rows < 2 || dimensions.columns < 24) return Box({ flexDirection: 'column', children: [Text({ children: ['Bugbound · ' + activityLabel(world.activity)] }), theirs] })
    const buttons = entries.filter(entry => entry.claim !== undefined).map(entry => Button({ key: entry.name, label: sceneTitles[entry.name], plain: true, dimColor: entry.name !== winner, onPress: () => $.command.run({ command: sceneCommands[entry.name], args: 'show' }) }))
    const header = Text({ children: ['Bugbound · ' + activityLabel(world.activity) + ' · ' + worldDescription({ world, scene: 'bugbound' })], color: 'cyan', wrap: 'truncate' })
    if (event.surface !== 'terminal') return Box({ flexDirection: 'column', children: [header, colorText({ elements: { Box, Text }, bitmap: sceneBitmap() }), Box({ flexDirection: 'row', children: buttons }), theirs] })
    const { Raster } = $.ui.resolve(event)
    if (claim.playing) { const { Client } = $.ui.resolve(event); return Box({ flexDirection: 'column', children: [header, Client({ key: 'game', module: './game-client.ts', props: { activity: world.activity, passedChecks: world.game.passedChecks, failedChecks: world.game.failedChecks, builds: world.game.builds }, width: dimensions.columns, height: dimensions.rows }), Box({ flexDirection: 'row', children: buttons }), theirs] }) }
    requestId = event.requestId
    return Box({ flexDirection: 'column', children: [header, Raster({ key: 'stage', columns: dimensions.columns, rows: dimensions.rows, cells: paint() }), Box({ flexDirection: 'row', columnGap: 2, children: buttons }), theirs] })
  })
}
