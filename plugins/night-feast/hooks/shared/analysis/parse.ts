import type { Analysis, Evidence, Explanation } from './types'
import { sanitize } from '../privacy'

function explanations(options: { value: unknown; evidence: Evidence[] }): Explanation[] | undefined {
  if (!Array.isArray(options.value) || options.value.length > 12) return undefined
  const results: Explanation[] = []
  for (const entry of options.value) {
    if (typeof entry !== 'object' || entry === null || !('text' in entry) || typeof entry.text !== 'string' || entry.text.length > 500 || !('evidenceIds' in entry) || !Array.isArray(entry.evidenceIds) || entry.evidenceIds.length === 0) return undefined
    const identifiers: string[] = []
    for (const identifier of entry.evidenceIds) {
      if (typeof identifier !== 'string' || !options.evidence.some(item => item.id === identifier && item.status !== 'pending')) return undefined
      identifiers.push(identifier)
    }
    if (/\b(?:tests?\s+(?:pass|passed|passing)|verified|checks?\s+(?:pass|passed))\b/i.test(entry.text) && !options.evidence.some(item => identifiers.includes(item.id) && item.kind === 'check' && item.status === 'successful')) return undefined
    results.push({ text: sanitize(entry.text), evidenceIds: identifiers })
  }
  return results
}

export function parseAnalysis(options: { text: string; evidence: Evidence[] }): Analysis | undefined {
  let value: unknown
  try { value = JSON.parse(options.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) } catch { return undefined }
  if (typeof value !== 'object' || value === null || !('summary' in value) || typeof value.summary !== 'string' || value.summary.length > 500 || !('entries' in value) || !('before' in value) || !('after' in value)) return undefined
  const entries = explanations({ value: value.entries, evidence: options.evidence })
  const before = explanations({ value: value.before, evidence: options.evidence })
  const after = explanations({ value: value.after, evidence: options.evidence })
  if (entries === undefined || before === undefined || after === undefined) return undefined
  if (/\b(?:tests?\s+(?:pass|passed|passing)|verified|checks?\s+(?:pass|passed))\b/i.test(value.summary) && !options.evidence.some(item => item.kind === 'check' && item.status === 'successful')) return undefined
  return { summary: sanitize(value.summary), entries, before, after }
}
