import type { Confidence, Decision, LensTurn, Rule } from './types'

export const COLORS = {
  accent: '#a78bfa',
  keep: '#34d399',
  avoid: '#fb7185',
  muted: '#8b93a1',
  frame: '#4b5563',
} as const

const CONFIDENCE_GLYPHS: Record<Confidence, string> = { high: '●●●', medium: '●●○', low: '●○○' }

export function confidenceGlyph(confidence: Confidence): string {
  return CONFIDENCE_GLYPHS[confidence]
}

export function turnMessage(options: { turn: LensTurn | undefined; isAnalysisOn: boolean }): string | undefined {
  const { turn } = options
  if (!turn) {
    return 'No turns yet. After Claude finishes a turn, its decisions appear here.'
  }
  if (turn.status === 'recording') {
    return 'Claude is still working on this turn.'
  }
  if (turn.status === 'waiting' || turn.status === 'running') {
    return 'Reading the decisions in this turn.'
  }
  if (turn.status === 'failed') {
    return 'The helper model did not answer, so decisions for this turn are not available.'
  }
  if (turn.status === 'skipped') {
    return options.isAnalysisOn
      ? 'This turn had no tool calls or real choices to explain.'
      : 'Turn analysis is off. Turn on "Explain each turn" in /plugin.'
  }
  return turn.decisions.length === 0 ? 'No real decisions in this turn. Claude took the obvious path.' : undefined
}

export function hasRule(options: { rules: readonly Rule[]; text: string }): boolean {
  return options.rules.some(rule => rule.text === options.text)
}

export function decisionBody(decision: Decision): { label: string; text: string }[] {
  return [
    { label: 'Did', text: decision.choice },
    { label: 'Why', text: decision.why },
  ].filter(part => part.text !== '')
}

export function summaryLine(turn: LensTurn | undefined): string | undefined {
  if (!turn || turn.status !== 'ready') {
    return undefined
  }
  const count = turn.decisions.length
  return count === 0 ? undefined : `◆ ${count} decision${count === 1 ? '' : 's'} · /why`
}
