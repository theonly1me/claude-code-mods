import { createController } from '../shared/analysis/controller.ts'
import { renderAnalysis } from '../shared/analysis/view.ts'

function escape(text) { return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;') }

export function analysisPreview(behavior) {
  const controller = createController({})
  controller.selected = 'e1'
  controller.evidence = [
    { id: 'e1', tool: 'Edit', status: 'successful', kind: 'edit', target: 'cart.ts', before: 'export function total(items) {', after: 'export function total(items = []) {', detail: 'Tool-reported edit' },
    { id: 'e2', tool: 'Bash', status: 'successful', kind: 'check', target: 'node --test cart.test.mjs', before: '', after: '', detail: 'Observed test command successful' },
  ]
  const publication = { ...controller.publication, status: 'ready', requests: 1, tokens: 420, analysis: { summary: 'Omitted cart items now produce a zero total.', entries: [{ text: 'Give the cart an empty default so callers can omit items.', evidenceIds: ['e1'] }], before: [{ text: 'Receive items from caller', evidenceIds: ['e1'] }, { text: 'Reduce items, missing input may throw', evidenceIds: ['e1'] }], after: [{ text: 'Default missing items to an empty array', evidenceIds: ['e1'] }, { text: 'Reduce items and return zero for an empty cart', evidenceIds: ['e1'] }] } }
  const element = type => options => ({ type, ...options })
  const tree = renderAnalysis({ elements: { Box: element('Box'), Text: element('Text'), Button: element('Button'), Code: element('Code') }, controller, publication, behavior, redraw() {} })
  const lines = []
  function visit(node) {
    if (typeof node === 'string') { lines.push(node); return }
    if (node.type === 'Button') lines.push('› ' + node.label)
    if (node.type === 'Code') lines.push(...node.source.split('\n').map(line => '  ' + line))
    else if (node.type === 'Text') lines.push((node.children ?? []).join(''))
    else (node.children ?? []).forEach(visit)
  }
  visit(tree)
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="' + (lines.length * 30 + 104) + '" viewBox="0 0 1000 ' + (lines.length * 30 + 104) + '"><rect width="100%" height="100%" rx="16" fill="#191c2e"/><text x="28" y="36" font-family="monospace" font-size="14" fill="#b393de">SYNTHETIC PREVIEW · CART DEMO</text>' + lines.map((line, index) => '<text x="28" y="' + (78 + index * 30) + '" font-family="monospace" font-size="16" fill="' + (index === 0 ? '#ffd166' : line.startsWith('Observed') ? '#a7d973' : '#f5ead3') + '">' + escape(line) + '</text>').join('') + '</svg>'
}
