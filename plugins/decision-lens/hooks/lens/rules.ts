import type { Rule, RuleKind, RuleScope } from './types'

export const RULES_SECTION_ID = 'decision-lens:rules'

function isRule(value: unknown): value is Rule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'text' in value &&
    typeof value.text === 'string' &&
    'kind' in value &&
    (value.kind === 'keep' || value.kind === 'avoid') &&
    'scope' in value &&
    (value.scope === 'project' || value.scope === 'global') &&
    'createdAt' in value &&
    typeof value.createdAt === 'number'
  )
}

export function rulesFromStore(value: unknown): Rule[] {
  return Array.isArray(value) ? value.filter(isRule) : []
}

export function storeKeyFor(options: { scope: RuleScope; project: string }): string {
  return options.scope === 'global' ? 'rules:global' : `rules:project:${options.project}`
}

export function newRule(options: { kind: RuleKind; text: string; scope: RuleScope; at: number; existing: readonly Rule[] }): Rule {
  return {
    id: `${options.at.toString(36)}-${options.existing.length}`,
    kind: options.kind,
    text: options.text.replace(/\s+/g, ' ').trim().slice(0, 240),
    scope: options.scope,
    createdAt: options.at,
  }
}

export function rulesSection(rules: readonly Rule[]): string | undefined {
  if (rules.length === 0) {
    return undefined
  }
  const keep = rules.filter(rule => rule.kind === 'keep').map(rule => `- ${rule.text}`)
  const avoid = rules.filter(rule => rule.kind === 'avoid').map(rule => `- ${rule.text}`)
  return [
    '# Steering rules from the user',
    'The user set these rules with the Decision Lens after reviewing your past decisions. Follow them unless the user asks for something else in this conversation.',
    keep.length > 0 ? `\nKeep doing:\n${keep.join('\n')}` : '',
    avoid.length > 0 ? `\nAvoid:\n${avoid.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
