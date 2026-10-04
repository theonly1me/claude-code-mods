import type { On } from 'claude-code'

import { capHunks, creationHunk, relativePath, replacementHunk } from './journal/diff'
import { addEdit, addTest, journalView } from './journal/state'
import { isTestCommand, shortCommand } from './journal/tests'
import type { EditSource, EditStatus, Hunk } from './journal/types'
import { isSecretPath, sanitize } from './shared/privacy'

type Outcome = { deny?: string; isError?: boolean }

function statusOf(ran: Outcome): EditStatus {
  if (ran.deny !== undefined) {
    return 'denied'
  }
  return ran.isError === true ? 'failed' : 'applied'
}

function record(options: {
  toolUseId: string
  source: EditSource
  filePath: string
  status: EditStatus
  hunks: readonly Hunk[]
  at: number
}): void {
  const path = relativePath({ path: options.filePath, root: journalView().root })
  const isHidden = isSecretPath(path)
  const capped = capHunks(isHidden ? [] : options.hunks)
  const notes = [
    isHidden ? 'content hidden: this looks like a secrets file' : '',
    options.status === 'applied' && !isHidden && options.hunks.length === 0 ? 'changed, but no diff was available' : '',
    capped.isTruncated ? 'diff truncated' : '',
  ]
  addEdit({
    toolUseId: options.toolUseId,
    source: options.source,
    path,
    status: options.status,
    hunks: capped.hunks.map(hunk => ({ ...hunk, lines: hunk.lines.map(sanitize) })),
    note: notes.filter(Boolean).join(' · '),
    at: options.at,
  })
}

export function installEdits(on: On): void {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    const base = { toolUseId: e.tool_use_id, source: 'Edit', filePath: e.file_path, at: await $.clock.now() } as const
    if (ran.deny !== undefined || ran.isError === true) {
      record({ ...base, status: statusOf(ran), hunks: [] })
      return ran
    }
    if (ran.result.staged !== true) {
      record({ ...base, status: 'applied', hunks: ran.result.structuredPatch })
    }
    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    const base = { toolUseId: e.tool_use_id, source: 'Write', filePath: e.file_path, at: await $.clock.now() } as const
    if (ran.deny !== undefined || ran.isError === true) {
      record({ ...base, status: statusOf(ran), hunks: [] })
      return ran
    }
    const { structuredPatch, type, staged } = ran.result
    const hunks = type === 'create' && structuredPatch.length === 0 ? [creationHunk(e.content)] : structuredPatch
    if (staged !== true) {
      record({ ...base, status: 'applied', hunks })
    }
    return ran
  })

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const ran = await next(e)
    const base = { toolUseId: e.tool_use_id, source: 'NotebookEdit', filePath: e.notebook_path, at: await $.clock.now() } as const
    if (ran.deny !== undefined || ran.isError === true) {
      record({ ...base, status: statusOf(ran), hunks: [] })
      return ran
    }
    const hunk = replacementHunk({ before: ran.result.old_source ?? '', after: ran.result.new_source })
    record({ ...base, status: 'applied', hunks: [hunk] })
    return ran
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (!isTestCommand(e.command) || ran.deny !== undefined) {
      return ran
    }
    const isPassing = ran.isError !== true && !ran.result.interrupted
    addTest({ command: shortCommand(e.command), isPassing, at: await $.clock.now() })
    return ran
  })
}
