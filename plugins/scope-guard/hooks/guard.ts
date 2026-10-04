import type { EngineInterface, On } from 'claude-code'

import { CONFIRM_SYSTEM, confirmPrompt, parseVerdict } from './scope/confirm'
import { ASK_OPTIONS, askQuestion, denyReason, statusText } from './scope/messages'
import { folderOf, relativeTo } from './scope/paths'
import { actionOf, assess, commandChange, CONFIRM_SCORE, editChange, notebookChange, rulesVerdict, writeChange } from './scope/rules'
import type { RuleContext } from './scope/rules'
import {
  addFlag,
  allowFolder,
  allowPath,
  endTurn,
  isAllowed,
  isSeen,
  markManyFilesFlagged,
  noteEdited,
  noteNarration,
  noteSeen,
  openFlags,
  scopeView,
  startTurn,
  taskText,
} from './scope/state'
import type { Assessment, Change, Decision, FlagStatus } from './scope/types'

const CONFIRM_TIMEOUT_MS = 20000

type Outcome = { deny?: string; isError?: boolean }
type Answer = { kind: 'once' } | { kind: 'task' } | { kind: 'stop'; typed: string | undefined } | { kind: 'dismissed' }

function ruleContext(): RuleContext {
  const view = scopeView()
  return {
    root: view.root,
    task: taskText(),
    isSeen,
    isAllowed,
    editedPaths: view.editedPaths,
    isManyFilesFlagged: view.isManyFilesFlagged,
    manyFiles: view.settings.manyFiles,
  }
}

function relativePaths(change: Change): string[] {
  return change.paths.map(path => relativeTo({ path, root: scopeView().root }))
}

function isApplied(ran: Outcome): boolean {
  return ran.deny === undefined && ran.isError !== true
}

function remember(options: { change: Change; reason: string; status: FlagStatus }): void {
  const [first = ''] = relativePaths(options.change)
  addFlag({ path: relativePaths(options.change).join(', '), folder: folderOf(first), action: actionOf(options.change), reason: options.reason, status: options.status })
}

async function confirm($: EngineInterface, options: { change: Change; assessment: Assessment }): Promise<Decision> {
  const { change, assessment } = options
  const fallback: Decision = {
    verdict: rulesVerdict(assessment.score),
    reason: assessment.signals.map(signal => signal.text).join('; '),
    isConfirmed: false,
  }
  const view = scopeView()
  const result = await $.model
    .complete({
      model: view.settings.confirmModel,
      effort: 'medium',
      system: CONFIRM_SYSTEM,
      prompt: confirmPrompt({ task: taskText(), narration: view.narration, change, action: actionOf(change), signals: assessment.signals }),
      maxTokens: 300,
      timeoutMs: CONFIRM_TIMEOUT_MS,
    })
    .catch(() => undefined)
  const parsed = result?.isAnswered ? parseVerdict(result.text) : undefined
  return parsed ? { verdict: parsed.verdict, reason: parsed.reason || fallback.reason, isConfirmed: true } : fallback
}

async function askPerson($: EngineInterface, options: { change: Change; reason: string }): Promise<Answer> {
  const question = askQuestion({ action: actionOf(options.change), paths: relativePaths(options.change), reason: options.reason })
  const answer = await $.ui.ask(question, { options: ASK_OPTIONS, header: 'Scope' }).catch(() => undefined)
  if (answer === undefined) {
    return { kind: 'dismissed' }
  }
  if (answer === 'Allow once') {
    return { kind: 'once' }
  }
  if (answer === 'Allow for this task') {
    return { kind: 'task' }
  }
  return { kind: 'stop', typed: answer === 'Stop' ? undefined : answer }
}

async function guarded<Result extends Outcome>($: EngineInterface, options: { change: Change; run: () => Promise<Result> }): Promise<Result | { deny: string }> {
  const { change } = options
  const view = scopeView()
  if (view.mode === 'off') {
    return options.run()
  }
  const assessment = assess({ change, context: ruleContext() })
  if (assessment.signals.some(signal => signal.kind === 'many-files')) {
    markManyFilesFlagged()
  }
  let decision: Decision | undefined
  if (assessment.score >= CONFIRM_SCORE) {
    decision = await confirm($, { change, assessment })
  }
  if (decision?.verdict === 'clear' && view.mode === 'ask') {
    const answer = await askPerson($, { change, reason: decision.reason })
    if (answer.kind === 'stop') {
      remember({ change, reason: decision.reason, status: 'stopped' })
      return { deny: denyReason({ reason: decision.reason, typed: answer.typed }) }
    }
    if (answer.kind === 'task') {
      relativePaths(change).forEach(path => {
        allowPath(path)
        allowFolder(folderOf(path))
      })
    }
    if (answer.kind !== 'dismissed') {
      remember({ change, reason: decision.reason, status: 'asked' })
      decision = undefined
    }
  }
  const ran = await options.run()
  if (!isApplied(ran)) {
    return ran
  }
  noteEdited(change.paths)
  if (decision && decision.verdict !== 'in-scope') {
    remember({ change, reason: decision.reason, status: 'open' })
    $.ui.status(statusText(openFlags().length))
    $.ui.invalidate('ui.render')
  }
  return ran
}

export function installGuard(on: On): void {
  on('tool.call', async ($, e, next) => {
    if (e.tool === 'Read') {
      const ran = await next(e)
      noteSeen(e.file_path)
      return ran
    }
    if (e.tool === 'Bash') {
      const change = commandChange(e.command)
      if (change) {
        return guarded($, { change, run: () => next(e) })
      }
      const ran = await next(e)
      noteSeen(ran.deny !== undefined || ran.isError === true ? e.command : `${e.command}\n${ran.result.stdout}`)
      return ran
    }
    if (e.tool === 'Edit') {
      return guarded($, { change: editChange({ filePath: e.file_path, oldText: e.old_string, newText: e.new_string }), run: () => next(e) })
    }
    if (e.tool === 'NotebookEdit') {
      return guarded($, { change: notebookChange({ filePath: e.notebook_path, mode: e.edit_mode }), run: () => next(e) })
    }
    if (e.tool === 'Write') {
      const original = scopeView().mode === 'off' ? undefined : await $.fs.read(e.file_path).catch(() => undefined)
      return guarded($, { change: writeChange({ filePath: e.file_path, content: e.content, original }), run: () => next(e) })
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const stream = next(e)
    for await (const chunk of stream) {
      if (e.agentId === undefined && chunk.kind === 'text') {
        noteNarration(chunk.text)
      }
      yield chunk
    }
    return await stream.result
  })

  on('turn.start', ($, e, next) => {
    startTurn()
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      endTurn()
    }
    return next(e)
  })
}
