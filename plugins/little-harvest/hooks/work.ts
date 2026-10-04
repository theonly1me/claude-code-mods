import type { On } from 'claude-code'

import { isTestCommand } from './sim/crops'
import { countPatchLines, farm, noteClaudeChange, relativePath } from './sim/ledger'

function lineCount(text: string): number {
  return text === '' ? 0 : text.replace(/\n$/, '').split('\n').length
}

export function installWork(on: On): void {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true && ran.result.staged !== true) {
      noteClaudeChange({ path: relativePath(e.file_path), lines: Math.max(1, countPatchLines(ran.result.structuredPatch)) })
    }
    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true && ran.result.staged !== true) {
      const patched = countPatchLines(ran.result.structuredPatch)
      const lines = patched > 0 ? patched : lineCount(e.content)
      noteClaudeChange({ path: relativePath(e.file_path), lines: Math.max(1, lines) })
    }
    return ran
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && isTestCommand(e.command)) {
      farm.testRan({ isPassing: ran.isError !== true && !ran.result.interrupted })
    }
    return ran
  })
}
