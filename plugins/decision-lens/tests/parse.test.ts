import { expect, test } from 'claude-code/testing'

import { parseDecisions } from '../hooks/lens/analysis'
import { rulesFromStore, rulesSection } from '../hooks/lens/rules'
import { toolSummary, traceText } from '../hooks/lens/trace'

test('decisions parse from a noisy reply and drop incomplete ones', () => {
  const reply = 'Sure: {"decisions": [{"title": "Use a map", "choice": "Stored carts in a Map", "confidence": "sky-high", "alternatives": ["An array", 3]}, {"title": ""}]}'
  const decisions = parseDecisions(reply)
  expect(decisions).toHaveLength(1)
  expect(decisions?.[0]?.confidence).toBe('medium')
  expect(decisions?.[0]?.alternatives).toEqual(['An array'])
  expect(parseDecisions('not json')).toBeNull()
})

test('rules from the store are validated and grouped into one section', () => {
  const rules = rulesFromStore([
    { id: '1', kind: 'keep', text: 'Write a test first.', scope: 'project', createdAt: 1 },
    { id: '2', kind: 'nope', text: 'bad', scope: 'project', createdAt: 1 },
    { id: '3', kind: 'avoid', text: 'Do not add dependencies.', scope: 'global', createdAt: 2 },
  ])
  expect(rules.map(rule => rule.id)).toEqual(['1', '3'])
  expect(rulesSection(rules)).toContain('Keep doing:\n- Write a test first.\n\nAvoid:\n- Do not add dependencies.')
  expect(rulesSection([])).toBeUndefined()
})

test('tool calls summarize to the field that matters', () => {
  expect(toolSummary({ tool: 'Bash', input: { command: 'npm test\nmore' } })).toBe('Bash npm test')
  expect(toolSummary({ tool: 'Read', input: { file_path: '/a/b.ts', limit: 10 } })).toBe('Read /a/b.ts')
  expect(traceText([{ kind: 'tool', text: 'Bash npm test', toolUseId: 'x', outcome: 'error' }])).toBe('- Tool call: Bash npm test -> error')
})
