import type { ClientElements, RenderElement } from 'claude-code'
import type { AnalysisController, AnalysisPublication, Evidence, Explanation } from './types'

type ViewElements = Pick<ClientElements, 'Box' | 'Text' | 'Button' | 'Code'>

export function renderAnalysis(options: { elements: ViewElements; controller: AnalysisController; publication: AnalysisPublication; behavior: boolean; columns?: number; redraw: () => void }): RenderElement {
  const { elements, controller, publication } = options
  const { Box, Text, Button, Code } = elements
  const children: RenderElement[] = [Text({ bold: true, children: [options.behavior ? 'Behavior Map' : 'Change Journal'] }), Text({ children: [`${publication.status} · ${publication.requests} model calls · ${publication.tokens} tokens`], dimColor: true })]
  if (publication.analysis !== null) children.push(Text({ children: ['Inferred · ' + publication.analysis.summary], color: 'cyan' }))
  else children.push(Text({ children: ['Observed changes appear immediately. Semantic explanations update after edits.'], dimColor: true }))
  function evidenceButton(entry: { explanation: Explanation; key: string }): RenderElement {
    const { explanation } = entry
    return Button({ key: entry.key, label: explanation.text + ' [' + explanation.evidenceIds.join(', ') + ']', plain: true, onPress: () => { controller.selected = explanation.evidenceIds[0]; options.redraw() } })
  }
  if (options.behavior && publication.analysis !== null) {
    const flows = ([['Before', publication.analysis.before], ['After', publication.analysis.after]] as const).map(([title, steps]) => Box({ flexDirection: 'column', flexGrow: 1, flexShrink: 1, width: (options.columns ?? 56) < 50 ? '100%' : '50%', children: [Text({ bold: true, color: 'magenta', children: [title + ' (inferred)'] }), ...steps.map((step, index) => evidenceButton({ key: 'flow-' + title + '-' + index, explanation: { ...step, text: (index > 0 ? '↓ ' : '') + step.text } }))] }))
    children.push(Box({ flexDirection: (options.columns ?? 56) < 50 ? 'column' : 'row', columnGap: 2, children: flows }))
  } else publication.analysis?.entries.forEach((entry, index) => children.push(evidenceButton({ explanation: entry, key: 'entry-' + index })))
  const checks = controller.evidence.filter(item => item.kind === 'check')
  checks.forEach(check => children.push(Text({ color: check.status === 'successful' ? 'green' : 'yellow', children: [`Observed ${check.status} · ${check.target}`] })))
  controller.evidence.filter(item => item.kind === 'edit' || item.before !== item.after).slice(-24).forEach(item => {
    children.push(Button({ key: item.id, label: `${item.id} · ${item.status} · ${item.target}`, plain: true, onPress: () => { controller.selected = item.id; options.redraw() } }))
  })
  const selected = controller.evidence.find(item => item.id === controller.selected)
  if (selected !== undefined) children.push(renderEvidence({ elements, evidence: selected }))
  return Box({ flexDirection: 'column', rowGap: 1, children })
}

function renderEvidence(options: { elements: ViewElements; evidence: Evidence }): RenderElement {
  const { Box, Text, Code } = options.elements
  const { evidence } = options
  return Box({ flexDirection: 'column', children: [Text({ bold: true, children: [evidence.id + ' · ' + evidence.detail] }), Text({ children: ['Before'] }), Code({ source: evidence.before || '(empty)', language: 'text' }), Text({ children: ['After'] }), Code({ source: evidence.after || '(empty)', language: 'text' })] })
}
