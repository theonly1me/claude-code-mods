import type { Register, CoreEngineInterface, Timer } from 'claude-code'
import { createController, resetController, recordEvidence, shouldAnalyze, journalAvailable, summaryEffort } from './shared/analysis/controller'
import { initialEvidence, completeEvidence } from './shared/analysis/evidence'
import { analysisPrompt } from './shared/analysis/prompt'
import { parseAnalysis } from './shared/analysis/parse'
import { renderAnalysis } from './shared/analysis/view'
import { safePath, sanitize } from './shared/privacy'

const publicationRef = { plugin: 'behavior-map', key: 'analysis' } as const
function noop(): undefined { return undefined }
async function readShell($: CoreEngineInterface): Promise<string> {
  return $.process.run(['git', '-c', 'core.pager=cat', '-c', 'color.ui=false', 'diff', '--no-ext-diff', '--no-textconv', '--unified=2', 'HEAD', '--', '.', ':(exclude)**/.env*', ':(exclude)**/*.pem', ':(exclude)**/*.key', ':(exclude)**/*.p12', ':(exclude)**/*.pfx', ':(exclude)**/credentials*', ':(exclude)**/secrets*', ':(exclude)**/.aws/**', ':(exclude)**/.ssh/**', ':(exclude)**/node_modules/**'], { timeoutMs: 1000 }).then(result => sanitize(result.stdout).slice(0, 6000)).catch(() => '')
}

export const register: Register = (on, options) => {
  const controller = createController(options)
  let root = ''
  let timer: Timer | undefined
  let abort = new AbortController()
  on('session.start', async ($, event, next) => {
    root = await $.session.cwd()
    await $.command.register({ name: 'behavior', description: 'Open Behavior Map. Options: show, hide', immediate: true })
    controller.publication.heartbeat = await $.clock.now()
    await $.state.set(publicationRef, controller.publication)
    return next(event)
  })
  on('turn.start', async ($, event, next) => {
    abort.abort(); abort = new AbortController()
    resetController({ controller, turnId: event.turnId })
    controller.running = false
    root = await $.session.cwd()
    timer?.cancel()
    timer = $.clock.every(1000, () => {
      const tickGeneration = controller.generation
      const tick = async () => {
        const now = await $.clock.now()
        controller.publication.heartbeat = now
        const shared = await $.state.get({ plugin: 'change-journal', key: 'analysis' })
        await $.state.set(publicationRef, controller.publication)
        if (!shouldAnalyze({ controller, now }) || journalAvailable({ publication: shared.value, now })) return
        const generation = controller.generation
        const revision = controller.revision
        const evidence = controller.evidence.map(item => ({ ...item }))
        controller.running = true; controller.lastRequestAt = now
        controller.publication.requests += 1; controller.publication.status = 'running'
        await $.state.set(publicationRef, controller.publication)
        const result = await $.model.complete({ model: controller.configuration.model, effort: controller.configuration.effort, prompt: analysisPrompt(evidence), maxTokens: 4096, timeoutMs: 20000 }, { signal: abort.signal })
        if (generation !== controller.generation) return
        controller.running = false
        controller.publication.tokens += result.usage.input_tokens + result.usage.output_tokens
        if (revision !== controller.revision) return
        const analysis = result.isAnswered ? parseAnalysis({ text: result.text, evidence }) : undefined
        controller.publication = { ...controller.publication, revision, analysis: analysis ?? controller.publication.analysis, status: analysis === undefined ? 'unavailable' : 'ready' }
        await $.state.set(publicationRef, controller.publication)
        $.ui.invalidate('ui.render')
      }
      tick().catch(() => { if (tickGeneration === controller.generation) { controller.running = false; controller.publication.status = 'unavailable' } })
    })
    await $.state.set(publicationRef, controller.publication)
    return next(event)
  })
  on('tool.call', async ($, event, next) => {
    const generation = controller.generation
    controller.sequence += 1
    let previous = ''
    if (event.tool === 'Write' && typeof event.file_path === 'string' && safePath({ path: event.file_path, root }) !== undefined) previous = await $.fs.read(event.file_path).catch(() => '')
    const shellBefore = event.tool === 'Bash' ? await readShell($) : ''
    const evidence = initialEvidence({ event, root, previous, sequence: controller.sequence })
    recordEvidence({ controller, evidence, now: await $.clock.now() })
    $.ui.invalidate('ui.render')
    try {
      const result = await next(event)
      const shellAfter = event.tool === 'Bash' && result.deny === undefined ? await readShell($) : shellBefore
      if (generation === controller.generation) recordEvidence({ controller, evidence: completeEvidence({ evidence, result, shellBefore, shellAfter }), now: await $.clock.now() })
      return result
    } catch (error) {
      if (generation === controller.generation) recordEvidence({ controller, evidence: { ...evidence, status: 'failed' }, now: await $.clock.now() })
      throw error
    } finally { $.ui.invalidate('ui.render') }
  })
  on('turn.complete', ($, event, next) => {
    if (event.agentId === undefined) controller.final = true
    return next(event)
  })
  on('session.end', async ($, event, next) => {
    timer?.cancel(); timer = undefined; abort.abort()
    resetController({ controller, turnId: '' })
    controller.running = false
    controller.publication.enabled = false
    await $.state.set(publicationRef, controller.publication)
    return next(event)
  })
  on('config.set', { key: 'behavior-map.liveSummaries' }, async ($, event, next) => {
    const result = await next(event)
    if (result.deny !== undefined) return result
    controller.configuration.enabled = result.value === true
    controller.publication.enabled = controller.configuration.enabled
    if (!controller.configuration.enabled) abort.abort()
    else abort = new AbortController()
    await $.state.set(publicationRef, controller.publication)
    return result
  })
  on('config.set', { key: 'behavior-map.summaryModel' }, async ($, event, next) => {
    const result = await next(event)
    if (result.deny === undefined && typeof result.value === 'string') controller.configuration.model = result.value
    return result
  })
  on('config.set', { key: 'behavior-map.summaryEffort' }, async ($, event, next) => {
    const result = await next(event)
    if (result.deny === undefined) controller.configuration.effort = summaryEffort(result.value)
    return result
  })
  on('command.run', { command: 'behavior' }, async ($, event) => {
    const action = event.args.trim() || 'show'
    if (action === 'hide') { controller.visible = false; await $.ui.close({ id: 'behavior-map' }); $.ui.invalidate('ui.render'); return { text: 'Behavior Map hidden.' } }
    if (action !== 'show') return { text: 'Use /behavior show or hide.' }
    controller.visible = true
    await $.ui.open({ id: 'behavior-map', title: 'Behavior Map', rows: 16, columns: 56, closeOnEscape: true })
    $.ui.invalidate('ui.render')
    return {}
  })
  on('ui.render', { component: 'AbovePrompt' }, async ($, event, next) => {
    if (event.props.hasSurvey || !controller.visible || event.props.maxRows < 3) return next(event)
    const shared = await $.state.get({ plugin: 'change-journal', key: 'analysis' }); const publication = shared.value?.enabled && shared.value.analysis !== null && shared.value.revision === controller.revision ? shared.value : controller.publication
    const { Box, Text, Button } = $.ui.resolve(event)
    return Box({ flexDirection: 'column', children: [Button({ key: 'open-behavior', plain: true, label: 'Behavior Map · ' + (publication.analysis?.summary ?? `${controller.evidence.filter(item => item.kind === 'edit').length} edits · ${publication.status}`), onPress: () => $.command.run({ command: 'behavior', args: 'show' }) }), await next(event)] })
  })
  on('ui.render', { component: 'Pane' }, async ($, event, next) => {
    if (event.requestId !== 'behavior-map') return next(event)
    const shared = await $.state.get({ plugin: 'change-journal', key: 'analysis' }); const publication = shared.value?.enabled && shared.value.analysis !== null && shared.value.revision === controller.revision ? shared.value : controller.publication
    return renderAnalysis({ elements: $.ui.resolve(event), controller, publication, columns: event.props.bodyColumns, behavior: true, redraw: () => $.ui.invalidate('ui.render') })
  })
}
