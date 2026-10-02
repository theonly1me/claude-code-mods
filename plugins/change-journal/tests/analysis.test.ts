import { expect, test } from 'claude-code/testing'
import { createController, recordEvidence, shouldAnalyze } from '../hooks/shared/analysis/controller'
import { parseAnalysis } from '../hooks/shared/analysis/parse'
import { analysisPrompt } from '../hooks/shared/analysis/prompt'
import type { Evidence } from '../hooks/shared/analysis/types'

const evidence: Evidence = { id: 'e1', tool: 'Edit', status: 'successful', kind: 'edit', target: 'cart.ts', before: 'return true', after: 'return cart.length > 0', detail: 'Tool-reported edit' }

test('explanations default to Sonnet 5.5 medium and batch meaningful changes', () => {
  const controller = createController({})
  expect(controller.configuration).toEqual({ enabled: true, model: 'claude-sonnet-5-5', effort: 'medium' })
  recordEvidence({ controller, evidence, now: 1000 })
  expect(shouldAnalyze({ controller, now: 2000 })).toBe(false)
  expect(shouldAnalyze({ controller, now: 3000 })).toBe(true)
  controller.lastRequestAt = 3000
  expect(shouldAnalyze({ controller, now: 12000 })).toBe(false)
  controller.publication.requests = 5
  expect(shouldAnalyze({ controller, now: 13000 })).toBe(false)
  controller.final = true
  expect(shouldAnalyze({ controller, now: 13000 })).toBe(true)
  controller.publication.requests = 6
  expect(shouldAnalyze({ controller, now: 23000 })).toBe(false)
})

test('unknown citations and unsupported verification claims are rejected', () => {
  const unsupported = JSON.stringify({ summary: 'Tests passed', entries: [], before: [], after: [] })
  expect(parseAnalysis({ text: unsupported, evidence: [evidence] })).toBeUndefined()
  const unknown = JSON.stringify({ summary: 'Guard empty carts', entries: [{ text: 'Add guard', evidenceIds: ['missing'] }], before: [], after: [] })
  expect(parseAnalysis({ text: unknown, evidence: [evidence] })).toBeUndefined()
})

test('only bounded sanitized evidence enters the model prompt', () => {
  const prompt = analysisPrompt([{ ...evidence, after: 'api_key="sk-example-secret-1234567890"' }])
  expect(prompt).not.toContain('sk-example-secret')
  expect(prompt).toContain('[redacted]')
})
