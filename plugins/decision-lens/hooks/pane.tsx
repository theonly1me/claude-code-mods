import type { EngineInterface, On } from 'claude-code'

import { askWhyPrompt } from './lens/analysis'
import { newRule, storeKeyFor } from './lens/rules'
import { lensView, markAsking, moveSelection, replaceRules, selectedTurn, setExplanation, showTab } from './lens/state'
import type { Decision, LensTurn, Rule, RuleKind } from './lens/types'
import { COLORS, confidenceGlyph, decisionBody, hasRule, turnMessage } from './lens/view'

export const PANE_ID = 'decision-lens'

async function persistRules($: EngineInterface): Promise<void> {
  const { rules, project } = lensView()
  await $.store.set(storeKeyFor({ scope: 'project', project }), rules.filter(rule => rule.scope === 'project'))
  await $.store.set(storeKeyFor({ scope: 'global', project }), rules.filter(rule => rule.scope === 'global'))
}

async function addRule($: EngineInterface, options: { kind: RuleKind; text: string }): Promise<void> {
  const rules = lensView().rules
  if (options.text === '' || hasRule({ rules, text: options.text })) {
    return
  }
  const rule = newRule({ kind: options.kind, text: options.text, scope: 'project', at: await $.clock.now(), existing: rules })
  replaceRules([...rules, rule])
  await persistRules($)
  $.ui.toast(`${options.kind === 'keep' ? 'Keep' : 'Avoid'} rule saved. Claude reads it from the next request.`)
  $.ui.invalidate('ui.render')
}

async function changeRules($: EngineInterface, options: { rules: Rule[] }): Promise<void> {
  replaceRules(options.rules)
  await persistRules($)
  $.ui.invalidate('ui.render')
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

export function installPane(on: On): void {
  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const view = lensView()
    const turn = selectedTurn()
    const position = turn ? view.turns.indexOf(turn) + 1 : 0

    function card(options: { turn: LensTurn; decision: Decision }) {
      const { decision } = options
      const ids = { turnId: options.turn.id, decisionId: decision.id }
      const keepSaved = hasRule({ rules: view.rules, text: decision.keep })
      const avoidSaved = hasRule({ rules: view.rules, text: decision.avoid })
      return (
        <Box key={`decision-${decision.id}`} flexDirection="column" borderStyle="round" borderColor={COLORS.accent} paddingX={1} marginBottom={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text bold color={COLORS.accent}>{`◆ ${decision.title}`}</Text>
            <Text color={COLORS.muted}>{confidenceGlyph(decision.confidence)}</Text>
          </Box>
          {decisionBody(decision).map(part => (
            <Text>
              <Text bold>{`${part.label}  `}</Text>
              {part.text}
            </Text>
          ))}
          {decision.alternatives.map(alternative => (
            <Text dimColor>{`◇ ${alternative}`}</Text>
          ))}
          {decision.evidence !== '' && <Text italic dimColor>{`“${decision.evidence}”`}</Text>}
          {decision.isAsking && <Text color={COLORS.accent}>Asking Claude…</Text>}
          {decision.explanation !== '' && <Text>{decision.explanation}</Text>}
          <Box flexDirection="row" gap={1} marginTop={1}>
            {keepSaved ? (
              <Text color={COLORS.keep}>✓ keep rule saved</Text>
            ) : (
              <Button key={`keep-${decision.id}`} label="▲ Keep doing this" onPress={() => addRule($, { kind: 'keep', text: decision.keep })} />
            )}
            {avoidSaved ? (
              <Text color={COLORS.avoid}>✓ avoid rule saved</Text>
            ) : (
              <Button key={`avoid-${decision.id}`} label="▼ Don't do this" onPress={() => addRule($, { kind: 'avoid', text: decision.avoid })} />
            )}
            <Button key={`why-${decision.id}`} label="? Ask why" onPress={() => askWhy($, ids)} />
          </Box>
        </Box>
      )
    }

    function ruleRow(rule: Rule) {
      const isKeep = rule.kind === 'keep'
      const others = view.rules.filter(candidate => candidate.id !== rule.id)
      const flipped = { ...rule, scope: rule.scope === 'project' ? 'global' : 'project' } as const
      return (
        <Box key={`rule-${rule.id}`} flexDirection="row" gap={1}>
          <Text color={isKeep ? COLORS.keep : COLORS.avoid}>{isKeep ? '▲ keep ' : '▼ avoid'}</Text>
          <Box flexGrow={1}>
            <Text>{rule.text}</Text>
          </Box>
          <Text dimColor>{rule.scope}</Text>
          <Button key={`scope-${rule.id}`} label={rule.scope === 'project' ? 'Make global' : 'This project'} onPress={() => changeRules($, { rules: view.rules.map(candidate => (candidate.id === rule.id ? flipped : candidate)) })} />
          <Button key={`remove-${rule.id}`} label="Remove" onPress={() => changeRules($, { rules: others })} />
        </Box>
      )
    }

    const message = turnMessage({ turn, isAnalysisOn: view.isAnalysisOn })
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text>
            <Text bold>Decision Lens</Text>
            <Text dimColor>{view.tab === 'decisions' && turn ? `  turn ${position} of ${view.turns.length}` : ''}</Text>
          </Text>
          <Box flexDirection="row" gap={1}>
            <Button key="previous" hotkey="p" label="◀" onPress={() => { moveSelection(-1); $.ui.invalidate('ui.render') }} />
            <Button key="next" hotkey="n" label="▶" onPress={() => { moveSelection(1); $.ui.invalidate('ui.render') }} />
            <Button key="tab-decisions" hotkey="d" label="Decisions" variant={view.tab === 'decisions' ? 'primary' : 'secondary'} onPress={() => { showTab('decisions'); $.ui.invalidate('ui.render') }} />
            <Button key="tab-rules" hotkey="r" label={`Rules (${view.rules.length})`} variant={view.tab === 'rules' ? 'primary' : 'secondary'} onPress={() => { showTab('rules'); $.ui.invalidate('ui.render') }} />
          </Box>
        </Box>
        {view.tab === 'decisions' && turn && <Text italic dimColor>{`“${turn.prompt}”`}</Text>}
        {view.tab === 'decisions' && message !== undefined && <Text dimColor>{message}</Text>}
        {view.tab === 'decisions' && turn && turn.status === 'ready' && turn.decisions.map(decision => card({ turn, decision }))}
        {view.tab === 'rules' && (
          <Text dimColor>Claude reads these rules in every session: project rules here, global rules everywhere.</Text>
        )}
        {view.tab === 'rules' && view.rules.length === 0 && (
          <Text dimColor>No rules yet. Press Keep doing this or Don't do this on a decision to add one.</Text>
        )}
        {view.tab === 'rules' && view.rules.map(ruleRow)}
      </Box>
    )
  })
}
