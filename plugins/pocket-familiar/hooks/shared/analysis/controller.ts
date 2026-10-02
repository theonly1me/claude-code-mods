import type { PluginOptions, ModelEffort } from 'claude-code'
import type { AnalysisController, Evidence } from './types'

export function summaryEffort(value: unknown): ModelEffort {
  return value === 'low' || value === 'high' || value === 'xhigh' || value === 'max' ? value : 'medium'
}

export function createController(options: PluginOptions): AnalysisController {
  return {
    evidence: [], revision: '', configuration: { enabled: options.liveSummaries !== false, model: typeof options.summaryModel === 'string' ? options.summaryModel : 'claude-sonnet-5-5', effort: summaryEffort(options.summaryEffort) },
    publication: { enabled: false, heartbeat: 0, revision: '', status: 'waiting', analysis: null, requests: 0, tokens: 0 },
    turnId: '', generation: 0, dirtyAt: 0, lastRequestAt: -10000, final: false, running: false, visible: false, selected: undefined, sequence: 0,
  }
}

export function resetController(options: { controller: AnalysisController; turnId: string }): void {
  const { controller } = options
  controller.generation += 1
  controller.evidence = []; controller.revision = ''; controller.turnId = options.turnId
  controller.final = false; controller.dirtyAt = 0; controller.sequence = 0
  controller.publication = { ...controller.publication, enabled: controller.configuration.enabled && controller.visible, revision: '', requests: 0, tokens: 0, status: 'waiting', analysis: null }
}

export function recordEvidence(options: { controller: AnalysisController; evidence: Evidence; now: number }): void {
  const { controller, evidence } = options
  const found = controller.evidence.findIndex(candidate => candidate.id === evidence.id)
  if (found < 0) controller.evidence.push(evidence)
  else controller.evidence[found] = evidence
  controller.evidence = controller.evidence.slice(-128)
  const meaningful = controller.evidence.filter(candidate => candidate.status !== 'pending' && (candidate.kind === 'edit' || candidate.kind === 'check' || candidate.before !== candidate.after))
  const revision = meaningful.map(candidate => candidate.id + ':' + candidate.status).join('|')
  if (revision !== controller.revision) { controller.publication.analysis = null; controller.publication.status = 'waiting'; controller.dirtyAt = options.now }
  controller.revision = revision
}

export function shouldAnalyze(options: { controller: AnalysisController; now: number }): boolean {
  const { controller, now } = options
  return controller.visible && controller.configuration.enabled && !controller.running && controller.revision !== '' && controller.revision !== controller.publication.revision
    && controller.publication.requests < (controller.final ? 6 : 5) && now - controller.lastRequestAt >= 10000 && (controller.final || now - controller.dirtyAt >= 2000)
}

export function journalAvailable(options: { publication: AnalysisController['publication'] | undefined; now: number }): boolean {
  return options.publication?.enabled === true && options.publication.status !== 'unavailable' && options.now - options.publication.heartbeat < 5000
}
