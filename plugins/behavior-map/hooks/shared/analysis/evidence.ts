import type { ToolCallInput, ToolCallResult } from 'claude-code'
import type { Evidence } from './types'
import { excerpt, safePath } from '../privacy'
import { isTestCommand } from '../activity'

export function initialEvidence(options: { event: ToolCallInput; sequence: number; root: string; previous: string }): Evidence {
  const { event } = options
  const base: Evidence = { id: 'e' + options.sequence, tool: event.tool, kind: 'read', status: 'pending', target: event.tool, before: '', after: '', detail: '' }
  if ((event.tool === 'Edit' || event.tool === 'Write') && typeof event.file_path === 'string') {
    const path = safePath({ path: event.file_path, root: options.root })
    if (path === undefined) return { ...base, target: '[excluded file]', detail: 'Content excluded from explanations' }
    const before = event.tool === 'Edit' && typeof event.old_string === 'string' ? event.old_string : options.previous
    const after = event.tool === 'Edit' && typeof event.new_string === 'string' ? event.new_string : typeof event.content === 'string' ? event.content : ''
    return { ...base, kind: 'edit', target: path, before: excerpt(before), after: excerpt(after), detail: 'Tool-reported edit' }
  }
  if (event.tool === 'Bash' && typeof event.command === 'string') return { ...base, kind: isTestCommand(event.command) ? 'check' : 'command', target: excerpt(event.command).slice(0, 160), detail: '' }
  if (event.tool === 'Read' && typeof event.file_path === 'string') return { ...base, target: safePath({ path: event.file_path, root: options.root }) ?? '[excluded file]' }
  return base
}

export function completeEvidence(options: { evidence: Evidence; result: ToolCallResult; shellBefore: string; shellAfter: string }): Evidence {
  const { evidence, result } = options
  const status = result.deny !== undefined ? 'denied' : result.isError === true ? 'failed' : 'successful'
  if ((evidence.kind === 'command' || evidence.kind === 'check') && status !== 'denied' && options.shellBefore !== options.shellAfter) {
    return { ...evidence, status, before: excerpt(options.shellBefore), after: excerpt(options.shellAfter), detail: 'Git changes observed during this command; concurrent edits may be included' }
  }
  return { ...evidence, status, detail: evidence.kind === 'check' ? 'Observed test command ' + status : evidence.detail }
}
