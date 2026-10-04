import type { EngineInterface, Register } from 'claude-code'

import { installCapture } from './capture'
import { ANALYSIS_SYSTEM, analysisPrompt, parseDecisions } from './lens/analysis'
import { rulesFromStore, rulesSection, RULES_SECTION_ID, storeKeyFor } from './lens/rules'
import { configureLens, finishAnalysis, followLatest, lensView, nextAnalysis, selectedTurn, setRules, showTab } from './lens/state'
import { summaryLine } from './lens/view'
import { installPane, PANE_ID } from './pane'
import { noop } from './shared/noop'

const ANALYSIS_POLL_MS = 1500

let isAnalyzing = false

function projectKey(cwd: string): string {
  return cwd.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function loadRules($: EngineInterface, options: { cwd: string }): Promise<void> {
  const project = projectKey(options.cwd)
  const projectRules = rulesFromStore(await $.store.get(storeKeyFor({ scope: 'project', project })))
  const globalRules = rulesFromStore(await $.store.get(storeKeyFor({ scope: 'global', project })))
  setRules({ project, rules: [...globalRules, ...projectRules] })
}

async function analyzeNext($: EngineInterface): Promise<void> {
  if (isAnalyzing) {
    return
  }
  const turn = nextAnalysis()
  if (!turn) {
    return
  }
  isAnalyzing = true
  const result = await $.model
    .complete({ model: lensView().helperModel, system: ANALYSIS_SYSTEM, prompt: analysisPrompt(turn), maxTokens: 1800, timeoutMs: 45000 })
    .catch(() => undefined)
  finishAnalysis({ id: turn.id, decisions: result?.isAnswered ? parseDecisions(result.text) : null })
  isAnalyzing = false
  $.ui.status(summaryLine(turn))
  $.ui.invalidate('ui.render')
}

export const register: Register = (on, options) => {
  const model = options.helperModel
  configureLens({
    helperModel: typeof model === 'string' && model.trim() !== '' ? model.trim() : 'haiku',
    isAnalysisOn: options.explainTurns !== false,
  })
  installCapture(on)
  installPane(on)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'why',
      description: 'Decision Lens: see why Claude made its last decisions and steer them. "rules" lists your steering rules.',
      argumentHint: '[rules]',
      immediate: true,
    })
    await loadRules($, { cwd: e.cwd })
    $.clock.every(ANALYSIS_POLL_MS, () => {
      analyzeNext($).catch(noop)
    })
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const text = rulesSection(lensView().rules)
    if (text === undefined) {
      return composed
    }
    return { sections: [...composed.sections, { id: RULES_SECTION_ID, text, scope: 'session' }] }
  })

  on('command.run', { command: 'why' }, async ($, e) => {
    const isRules = e.args.trim().toLowerCase() === 'rules'
    showTab(isRules ? 'rules' : 'decisions')
    followLatest()
    await $.ui.open({ id: PANE_ID, title: 'Decision Lens', closeOnEscape: true, rows: 30 })
    $.ui.invalidate('ui.render')
    const turn = selectedTurn()
    const count = turn?.status === 'ready' ? turn.decisions.length : 0
    const rules = lensView().rules.length
    return { text: `Decision Lens opened: ${count} decisions in the latest turn, ${rules} steering rules active.` }
  })
}
