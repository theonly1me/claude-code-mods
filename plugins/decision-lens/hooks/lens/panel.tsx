import type { ElementTable, RenderElement } from 'claude-code'

import type { Decision, LensTab, LensTurn, Rule } from './types'
import { COLORS, confidenceGlyph, decisionBody, hasRule } from './view'

export type PaneAction =
  | { kind: 'select'; number: number }
  | { kind: 'keep' | 'avoid' | 'ask'; turnId: number; decisionId: number }
  | { kind: 'turn'; step: number }
  | { kind: 'tab'; tab: LensTab }
  | { kind: 'scope' | 'remove'; ruleId: string }
  | { kind: 'close' }

type Act = (action: PaneAction) => void

function unquoted(text: string): string {
  return text.replace(/^["“”']+|["“”']+$/g, '')
}

export function hintText(options: { isFocused: boolean; tab: LensTab }): string {
  if (!options.isFocused) {
    return 'ctrl+x tab: use the keys here, or type /why keep 1'
  }
  if (options.tab === 'rules') {
    return 'Tab: next button  Enter: press it  Esc: back to prompt'
  }
  return '1-5: pick a card  k: keep  a: avoid  w: ask why  Esc: back to prompt'
}

export function headerTree(options: {
  elements: ElementTable
  act: Act
  tab: LensTab
  position: string
  ruleCount: number
  hint: string
}): RenderElement {
  const { Box, Text, Button } = options.elements
  const { act, tab } = options
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>
        <Text bold color={COLORS.accent}>Decision Lens</Text>
        <Text dimColor>{options.position}</Text>
      </Text>
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Button key="previous" plain hotkey="p" label="◀ Earlier turn" onPress={() => act({ kind: 'turn', step: -1 })} />
        <Button key="next" plain hotkey="n" label="Later turn ▶" onPress={() => act({ kind: 'turn', step: 1 })} />
        <Button key="tab-decisions" plain hotkey="d" label="Decisions" dimColor={tab !== 'decisions'} onPress={() => act({ kind: 'tab', tab: 'decisions' })} />
        <Button key="tab-rules" plain hotkey="r" label={`Rules (${options.ruleCount})`} dimColor={tab !== 'rules'} onPress={() => act({ kind: 'tab', tab: 'rules' })} />
        <Button key="close" plain hotkey="x" role="dismiss" label="Close" onPress={() => act({ kind: 'close' })} />
      </Box>
      <Text color={COLORS.muted}>{options.hint}</Text>
    </Box>
  )
}

function steerButtons(options: {
  elements: ElementTable
  act: Act
  turn: LensTurn
  decision: Decision
  rules: readonly Rule[]
  isSelected: boolean
}): RenderElement {
  const { Box, Text, Button } = options.elements
  const { act, decision, isSelected } = options
  const ids = { turnId: options.turn.id, decisionId: decision.id }
  const keyed = (key: string) => (isSelected ? { hotkey: key } : {})
  return (
    <Box flexDirection="row" flexWrap="wrap" columnGap={2} marginTop={1}>
      {hasRule({ rules: options.rules, text: decision.keep }) ? (
        <Text color={COLORS.keep}>✓ keep rule saved</Text>
      ) : (
        <Button key={`keep-${decision.id}`} plain {...keyed('k')} dimColor={!isSelected} label="▲ Keep doing this" onPress={() => act({ kind: 'keep', ...ids })} />
      )}
      {hasRule({ rules: options.rules, text: decision.avoid }) ? (
        <Text color={COLORS.avoid}>✓ avoid rule saved</Text>
      ) : (
        <Button key={`avoid-${decision.id}`} plain {...keyed('a')} dimColor={!isSelected} label="▼ Don't do this" onPress={() => act({ kind: 'avoid', ...ids })} />
      )}
      <Button key={`why-${decision.id}`} plain {...keyed('w')} dimColor={!isSelected} label="? Ask why" onPress={() => act({ kind: 'ask', ...ids })} />
    </Box>
  )
}

export function cardTree(options: {
  elements: ElementTable
  act: Act
  turn: LensTurn
  decision: Decision
  number: number
  isSelected: boolean
  rules: readonly Rule[]
}): RenderElement {
  const { Box, Text, Button } = options.elements
  const { decision, number, isSelected } = options
  return (
    <Box key={`decision-${decision.id}`} flexDirection="column" borderStyle="round" borderColor={isSelected ? COLORS.accent : COLORS.frame} paddingX={1}>
      <Box flexDirection="row" justifyContent="space-between" columnGap={1}>
        <Button key={`card-${number}`} plain hotkey={String(number)} {...(number === 1 ? ({ autoFocus: true } as const) : {})} label={`◆ ${decision.title}`} onPress={() => options.act({ kind: 'select', number })} />
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
      {decision.evidence !== '' && <Text italic dimColor>{`“${unquoted(decision.evidence)}”`}</Text>}
      {decision.isAsking && <Text color={COLORS.accent}>Asking Claude…</Text>}
      {decision.explanation !== '' && <Text>{decision.explanation}</Text>}
      {steerButtons(options)}
    </Box>
  )
}

export function ruleTree(options: { elements: ElementTable; act: Act; rule: Rule; number: number }): RenderElement {
  const { Box, Text, Button } = options.elements
  const { act, rule } = options
  const isKeep = rule.kind === 'keep'
  return (
    <Box key={`rule-${rule.id}`} flexDirection="column" marginBottom={1}>
      <Text>
        <Text color={COLORS.muted}>{`${options.number}. `}</Text>
        <Text color={isKeep ? COLORS.keep : COLORS.avoid}>{isKeep ? '▲ keep  ' : '▼ avoid '}</Text>
        {rule.text}
      </Text>
      <Box flexDirection="row" columnGap={2} paddingLeft={3}>
        <Text dimColor>{rule.scope === 'project' ? 'this project' : 'every project'}</Text>
        <Button key={`scope-${rule.id}`} label={rule.scope === 'project' ? 'Make global' : 'This project only'} onPress={() => act({ kind: 'scope', ruleId: rule.id })} />
        <Button key={`remove-${rule.id}`} label="Remove" onPress={() => act({ kind: 'remove', ruleId: rule.id })} />
      </Box>
    </Box>
  )
}
