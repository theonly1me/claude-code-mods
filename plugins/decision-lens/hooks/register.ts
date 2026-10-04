import type { EngineInterface, Register } from 'claude-code'

import { installCapture } from './capture'
import { ANALYSIS_SYSTEM, analysisPrompt, parseDecisions } from './lens/analysis'
import { helperFrom } from './lens/helper'
import { rulesFromStore, rulesSection, RULES_SECTION_ID, storeKeyFor } from './lens/rules'
import { configureLens, finishAnalysis, lensView, nextAnalysis, setRules } from './lens/state'
import { summaryLine } from './lens/view'
import { installPane } from './pane'
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
    .complete({
      model: lensView().helper.helperModel,
      effort: lensView().helper.helperEffort,
      system: ANALYSIS_SYSTEM,
      prompt: analysisPrompt(turn),
      maxTokens: 1800,
      timeoutMs: 45000,
    })
    .catch(() => undefined)
  finishAnalysis({ id: turn.id, decisions: result?.isAnswered ? parseDecisions(result.text) : null })
  isAnalyzing = false
  $.ui.status(summaryLine(turn))
  $.ui.invalidate('ui.render')
}

export const register: Register = (on, options) => {
  configureLens({ helper: helperFrom(options), isAnalysisOn: options.explainTurns !== false })
  installCapture(on)
  installPane(on)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'why',
      description: 'Decision Lens: why Claude made its last decisions. keep N or avoid N saves a rule from card N, ask N asks Claude why, rules lists your rules.',
      argumentHint: '[keep N|avoid N|ask N|rules]',
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
}
