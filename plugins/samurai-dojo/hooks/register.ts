import { atom, read, update } from 'claude-code'
import type { Register, CoreEngineInterface, Timer } from 'claude-code'
import { classifyActivity, currentActivity, activityLabel, isTestEdit } from './shared/activity'
import type { Activity } from './shared/activity'
import { selectedScene, sceneDimensions, sceneCommands, sceneLabels } from './shared/scene'
import type { Claim } from './shared/scene'
import { createWorld, beginWorld, finishWorld, finishActivity, advanceWorld, worldDescription, snapshotWorld, restoreWorld } from './shared/world'
import { parseProgress, totalProgress, petStage } from './shared/progress'
import { createBitmap } from './shared/render/bitmap'
import { encodeCells } from './shared/render/cells'
import { colorText } from './shared/client-render'
import { createDojo } from './sim/dojo'
import { drawTraining } from './training'
import { stampScaled } from './shared/render/bitmap'

const claimAtom = atom({ plugin: 'samurai-dojo', key: 'claim' } as const, { enabled: false, selectedAt: 0, expanded: false, playing: false })
function noop(): undefined { return undefined }
async function readScenes($: CoreEngineInterface) {
  const nightFeast = await $.state.get({ plugin: 'night-feast', key: 'claim' })
  const farm = await $.state.get({ plugin: 'little-harvest', key: 'claim' })
  const dojo = await $.state.get({ plugin: 'samurai-dojo', key: 'claim' })
  const pet = await $.state.get({ plugin: 'pocket-familiar', key: 'claim' })
  return [{ name: 'night-feast', claim: nightFeast.value }, { name: 'little-harvest', claim: farm.value }, { name: 'samurai-dojo', claim: dojo.value }, { name: 'pocket-familiar', claim: pet.value }] as const
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
  const dojo = createDojo()
  function sceneBitmap() {
    const bitmap = createBitmap({ width: dimensions.columns, height: dimensions.rows * 2 })
    if (world.activity === 'searching' || dojo.hasCombat()) { const scale = Math.max(1, Math.floor(bitmap.height / 16)); dojo.resize(Math.ceil(dimensions.columns / scale)); const frame = dojo.frame(); stampScaled({ target: bitmap, source: frame, x: 0, y: bitmap.height - frame.height * scale, scale }) } else drawTraining({ bitmap, world })
    return bitmap
  }
  function paint() { return encodeCells(sceneBitmap()) }
  on('session.start', async ($, event, next) => {
    await $.command.register({ name: 'dojo', description: 'Show Samurai Dojo. Options: show, hide, compact, expanded', immediate: true })
    claim = { ...await read($, claimAtom), enabled: false, expanded: false, playing: false }
    await update($, claimAtom, () => claim)
    progressKey = 'progress:' + await $.session.id()
    const values = []
    for (const key of await $.store.keys()) if (key.startsWith('progress:')) values.push(parseProgress(await $.store.get(key)))
    const total = totalProgress(values)
    world.completed = total.completed; world.harvests = total.harvests; world.kills = total.kills
    world.contributions = parseProgress(await $.store.get(progressKey))
    world.beds = Array.from({ length: Math.min(4, Math.floor(world.harvests / 4)) }, () => 4)
    const lifecycle = await $.state.get({ plugin: 'samurai-dojo', key: 'lifecycle' })
    if (lifecycle.value !== undefined) restoreWorld({ world, snapshot: lifecycle.value })
    if (timer === undefined) {
    timer = $.clock.every(80, () => {
      advanceWorld({ world, playing: claim.playing })
      const kills = dojo.tick({ dtMs: 80 }); world.kills += kills.length; world.contributions.kills += kills.length
      if (kills.length > 0) { const key = progressKey; const snapshot = { ...world.contributions }; saved = saved.catch(noop).then(() => $.store.set(key, snapshot)); saved.catch(noop) }
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
      const kills = dojo.tick({ dtMs: 80 }); world.kills += kills.length; world.contributions.kills += kills.length
      if (kills.length > 0) { const key = progressKey; const snapshot = { ...world.contributions }; saved = saved.catch(noop).then(() => $.store.set(key, snapshot)); saved.catch(noop) }
      if (requestId !== undefined && !claim.playing) $.ui.blit({ requestId, key: 'stage', cells: paint() }).catch(noop)
      if (world.tick % 10 === 0) $.ui.invalidate('ui.render')
    })
    }
    beginWorld(world)
    await $.state.set({ plugin: 'samurai-dojo', key: 'lifecycle' }, snapshotWorld(world))
    $.ui.invalidate('ui.render')
    return next(event)
  })
  on('tool.call', async ($, event, next) => {
    const toolGeneration = generation
    const activity = classifyActivity(event)
    active.set(event.tool_use_id, activity)
    world.pending = active.size
    world.activity = currentActivity({ active, isWorking: world.working })
    const monster = activity === 'searching' ? dojo.spawn({ isElite: event.agentId !== undefined }) : undefined
    $.ui.invalidate('ui.render')
    try {
      const result = await next(event)
      const successful = result.deny === undefined && result.isError !== true
      if (toolGeneration === generation) finishActivity({ world, activity, successful, testEdit: isTestEdit(event), denied: result.deny !== undefined })
      if (monster !== undefined) dojo.defeat({ id: monster, isFailure: !successful })
      return result
    } catch (error) { if (monster !== undefined) dojo.defeat({ id: monster, isFailure: true }); throw error } finally {
      if (toolGeneration === generation) { active.delete(event.tool_use_id); world.pending = active.size; if (active.size > 0 || !world.working) world.activity = currentActivity({ active, isWorking: world.working }) }
      await $.state.set({ plugin: 'samurai-dojo', key: 'lifecycle' }, snapshotWorld(world))
      $.ui.invalidate('ui.render')
    }
  })
  on('turn.complete', async ($, event, next) => {
    if (event.agentId !== undefined) return next(event)
    finishWorld({ world, successful: event.reason === 'answer' && !event.isAborted })
    if (event.reason === 'answer' && !event.isAborted) dojo.celebrate()
    const snapshot = { ...world.contributions }; const key = progressKey
    saved = saved.catch(noop).then(() => $.store.set(key, snapshot))
    await saved
    await $.state.set({ plugin: 'samurai-dojo', key: 'lifecycle' }, snapshotWorld(world))
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
    await $.state.set({ plugin: 'samurai-dojo', key: 'lifecycle' }, snapshotWorld(world))
    return next(event)
  })
  on('command.run', { command: 'dojo' }, async ($, event) => {
    const action = event.args.trim() || 'toggle'
    if (!['show', 'hide', 'compact', 'expanded', 'toggle'].includes(action)) return { text: 'Use /dojo show, hide, compact, or expanded.' }
    const selectedAt = await $.clock.now()
    claim = { ...claim, selectedAt, enabled: action === 'hide' ? false : action === 'toggle' ? !claim.enabled : true, expanded: action === 'compact' ? false : action === 'expanded' ? true : claim.expanded, playing: action === 'play' ? true : action === 'watch' ? false : claim.playing }
    await update($, claimAtom, () => claim)
    return { text: `Samurai Dojo ${claim.enabled ? 'open' : 'hidden'} · ${worldDescription({ world, scene: 'samurai-dojo' })}` }
  })
  on('ui.render', { component: 'AbovePrompt' }, async ($, event, next) => {
    requestId = undefined
    if (event.props.hasSurvey) return next(event)
    const entries = await readScenes($)
    const winner = selectedScene(entries)
    const theirs = await next(event)
    const { Box, Text, Button } = $.ui.resolve(event)
    if (winner !== 'samurai-dojo') {

      return theirs
    }
    dimensions = sceneDimensions({ columns: event.props.bodyColumns, rows: event.props.maxRows, expanded: claim.expanded, reservedRows: 6 })
    if (dimensions.rows < 2 || dimensions.columns < 24) return Box({ flexDirection: 'column', children: [Text({ children: ['Samurai Dojo · ' + activityLabel(world.activity)] }), theirs] })
    const buttons = entries.filter(entry => entry.claim !== undefined).map(entry => Button({ key: entry.name, label: sceneLabels[entry.name], dimColor: entry.name !== winner, onPress: () => entry.name === winner ? undefined : $.command.run({ command: sceneCommands[entry.name], args: 'show' }) }))
    const controls = Box({ flexDirection: 'row', columnGap: 1, children: [Button({ key: 'size', label: claim.expanded ? 'Compact' : 'Expand', onPress: async () => { claim = { ...claim, expanded: !claim.expanded }; await update($, claimAtom, () => claim); $.ui.invalidate('ui.render') } }), Button({ key: 'hide', label: 'Hide', onPress: async () => { claim = { ...claim, enabled: false, playing: false }; await update($, claimAtom, () => claim); $.ui.invalidate('ui.render') } })] })
    const header = Text({ children: ['Samurai Dojo · ' + activityLabel(world.activity) + ' · ' + worldDescription({ world, scene: 'samurai-dojo' })], color: 'cyan', wrap: 'truncate' })
    if (event.surface !== 'terminal') return Box({ flexDirection: 'column', children: [header, colorText({ elements: { Box, Text }, bitmap: sceneBitmap() }), Box({ flexDirection: 'row', columnGap: 1, children: buttons }), controls, theirs] })
    const { Raster } = $.ui.resolve(event)

    requestId = event.requestId
    return Box({ flexDirection: 'column', children: [header, Raster({ key: 'stage', columns: dimensions.columns, rows: dimensions.rows, cells: paint() }), Box({ flexDirection: 'row', columnGap: 1, children: buttons }), controls, theirs] })
  })
}
