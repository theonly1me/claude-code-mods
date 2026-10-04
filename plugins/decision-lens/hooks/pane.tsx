import type { EngineInterface, On } from 'claude-code'

import { askWhyPrompt } from './lens/analysis'
import { parseWhy, WHY_USAGE } from './lens/command'
import type { SteerKind } from './lens/command'
import { cardTree, headerTree, hintText, ruleTree } from './lens/panel'
import type { PaneAction } from './lens/panel'
import { newRule, storeKeyFor } from './lens/rules'
import {
  decisionNumbered,
  findDecision,
  followLatest,
  lensView,
  markAsking,
  moveSelection,
  replaceRules,
  selectCard,
  selectedTurn,
  setExplanation,
  showTab,
} from './lens/state'
import type { Rule, RuleKind } from './lens/types'
import { hasRule, turnMessage } from './lens/view'
import { noop } from './shared/noop'

export const PANE_ID = 'decision-lens'

async function persistRules($: EngineInterface): Promise<void> {
  const { rules, project } = lensView()
  await $.store.set(storeKeyFor({ scope: 'project', project }), rules.filter(rule => rule.scope === 'project'))
  await $.store.set(storeKeyFor({ scope: 'global', project }), rules.filter(rule => rule.scope === 'global'))
}

async function addRule($: EngineInterface, options: { kind: RuleKind; text: string }): Promise<boolean> {
  const rules = lensView().rules
  if (options.text === '' || hasRule({ rules, text: options.text })) {
    return false
  }
  const rule = newRule({ kind: options.kind, text: options.text, scope: 'project', at: await $.clock.now(), existing: rules })
  replaceRules([...rules, rule])
  await persistRules($)
  $.ui.toast(`${options.kind === 'keep' ? 'Keep' : 'Avoid'} rule saved. Claude reads it from the next request.`)
  return true
}

async function changeRules($: EngineInterface, options: { rules: Rule[] }): Promise<void> {
  replaceRules(options.rules)
  await persistRules($)
}

async function askWhy($: EngineInterface, options: { turnId: number; decisionId: number }): Promise<void> {
  const decision = markAsking(options)
  if (!decision) {
    return
  }
  $.ui.invalidate('ui.render')
  const result = await $.model.fork({ prompt: askWhyPrompt(decision) }).catch(() => undefined)
  const text = result?.isAnswered ? result.text.trim() : 'Claude could not answer right now. Try again after the current turn.'
  setExplanation({ ...options, text })
  $.ui.invalidate('ui.render')
}

function ruleChange(action: { kind: 'scope' | 'remove'; ruleId: string }): Rule[] {
  const { rules } = lensView()
  if (action.kind === 'remove') {
    return rules.filter(rule => rule.id !== action.ruleId)
  }
  return rules.map(rule =>
    rule.id === action.ruleId ? { ...rule, scope: rule.scope === 'project' ? 'global' : 'project' } : rule,
  )
}

async function perform($: EngineInterface, options: { action: PaneAction }): Promise<void> {
  const { action } = options
  if (action.kind === 'select') {
    selectCard(action.number)
  } else if (action.kind === 'turn') {
    moveSelection(action.step)
  } else if (action.kind === 'tab') {
    showTab(action.tab)
  } else if (action.kind === 'close') {
    await $.ui.close({ id: PANE_ID })
    return
  } else if (action.kind === 'scope' || action.kind === 'remove') {
    await changeRules($, { rules: ruleChange(action) })
  } else if (action.kind === 'ask') {
    await askWhy($, { turnId: action.turnId, decisionId: action.decisionId })
  } else if (action.kind === 'keep' || action.kind === 'avoid') {
    const decision = findDecision({ turnId: action.turnId, decisionId: action.decisionId })
    if (decision) {
      await addRule($, { kind: action.kind, text: action.kind === 'keep' ? decision.keep : decision.avoid })
    }
  }
  $.ui.invalidate('ui.render')
}

async function steer($: EngineInterface, options: { steer: SteerKind; number: number }): Promise<string> {
  const numbered = decisionNumbered(options.number)
  if (!numbered) {
    return `There is no card ${options.number} on the turn shown in /why. ${WHY_USAGE}`
  }
  const { turn, decision } = numbered
  selectCard(options.number)
  if (options.steer === 'ask') {
    askWhy($, { turnId: turn.id, decisionId: decision.id }).catch(noop)
    await $.ui.open({ id: PANE_ID, title: 'Decision Lens', focus: true, rows: 30 })
    return `Asking Claude why it chose "${decision.title}". The answer appears on card ${options.number} in /why.`
  }
  const text = options.steer === 'keep' ? decision.keep : decision.avoid
  const isAdded = await addRule($, { kind: options.steer, text })
  $.ui.invalidate('ui.render')
  return isAdded ? `Saved ${options.steer} rule: ${text}` : `That rule is already saved: ${text}`
}

export function installPane(on: On): void {
  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    const view = lensView()
    const turn = selectedTurn()
    const act = (action: PaneAction) => {
      perform($, { action }).catch(noop)
    }
    const hasCards = view.tab === 'decisions' && turn?.status === 'ready' && turn.decisions.length > 0
    const position = view.tab === 'decisions' && turn ? `  turn ${view.turns.indexOf(turn) + 1} of ${view.turns.length}` : ''
    const message = view.tab === 'decisions' ? turnMessage({ turn, isAnalysisOn: view.isAnalysisOn }) : undefined
    const header = headerTree({
      elements,
      act,
      tab: view.tab,
      position,
      ruleCount: view.rules.length,
      hint: hintText({ isFocused: e.props.isFocused, tab: view.tab }),
    })
    if (view.tab === 'rules') {
      return (
        <Box flexDirection="column">
          {header}
          <Text dimColor>Claude reads these rules in every session: project rules here, global rules everywhere.</Text>
          {view.rules.length === 0 && <Text dimColor>No rules yet. Press k or a on a decision card, or type /why keep 1.</Text>}
          {view.rules.map((rule, index) => ruleTree({ elements, act, rule, number: index + 1 }))}
        </Box>
      )
    }
    return (
      <Box flexDirection="column">
        {header}
        {turn && <Text italic dimColor>{`“${turn.prompt}”`}</Text>}
        {message !== undefined && <Text dimColor>{message}</Text>}
        {hasCards &&
          turn.decisions.map((decision, index) =>
            cardTree({ elements, act, turn, decision, number: index + 1, isSelected: index + 1 === view.selectedNumber, rules: view.rules }),
          )}
      </Box>
    )
  })

  on('command.run', { command: 'why' }, async ($, e) => {
    const command = parseWhy(e.args)
    if (command.kind === 'unknown') {
      return { text: WHY_USAGE }
    }
    if (command.kind === 'steer') {
      return { text: await steer($, { steer: command.steer, number: command.number }) }
    }
    showTab(command.tab)
    followLatest()
    await $.ui.open({ id: PANE_ID, title: 'Decision Lens', focus: true, rows: 30 })
    $.ui.invalidate('ui.render')
    const turn = selectedTurn()
    const count = turn?.status === 'ready' ? turn.decisions.length : 0
    return {
      text: `Decision Lens: ${count} decisions in the latest turn, ${lensView().rules.length} steering rules. The pane has the keys now; Esc gives them back.`,
    }
  })
}
