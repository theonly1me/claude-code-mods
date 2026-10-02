import { expect, test } from 'claude-code/testing'
import { parseAnalysis } from '../hooks/shared/analysis/parse'
import { journalAvailable } from '../hooks/shared/analysis/controller'
import type { Evidence } from '../hooks/shared/analysis/types'

test('before-and-after nodes retain references to their supporting edit', () => {
  const evidence: Evidence = { id: 'e1', tool: 'Edit', status: 'successful', kind: 'edit', target: 'cart.ts', before: 'pay()', after: 'if (items.length) pay()', detail: 'Tool-reported edit' }
  const result = parseAnalysis({ evidence: [evidence], text: JSON.stringify({ summary: 'Guard empty carts', entries: [{ text: 'Adds a cart guard', evidenceIds: ['e1'] }], before: [{ text: 'Always request payment', evidenceIds: ['e1'] }], after: [{ text: 'Check cart before payment', evidenceIds: ['e1'] }] }) })
  expect(result?.after[0]?.evidenceIds).toEqual(['e1'])
})

test('a missing, disabled, or stale journal allows the map to analyze independently', () => {
  const publication = { enabled: true, heartbeat: 1000, revision: '', status: 'waiting' as const, analysis: null, requests: 0, tokens: 0 }
  expect(journalAvailable({ publication, now: 2000 })).toBe(true)
  expect(journalAvailable({ publication: undefined, now: 2000 })).toBe(false)
  expect(journalAvailable({ publication: { ...publication, enabled: false }, now: 2000 })).toBe(false)
  expect(journalAvailable({ publication, now: 7000 })).toBe(false)
})
