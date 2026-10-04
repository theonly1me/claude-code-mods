import type { EngineInterface, On } from 'claude-code'

import { DETECT_SYSTEM, detectPrompt, isStillPresent, parseDetection, withSnapshots } from './slop/detect'
import { appendNote, contextNote, statusLine } from './slop/notes'
import { isBinaryText, isIgnoredPath, relativePath } from './slop/paths'
import { scanSegments } from './slop/scan'
import { addedLines, segmentsFromContent, segmentsFromPatch, segmentsFromStrings } from './slop/segments'
import {
  addFindings,
  counts,
  filesWithOpenFindings,
  finishTurn,
  markNotified,
  markRemoved,
  openFindingsFor,
  startTurn,
  unslopView,
} from './slop/state'
import type { DetectJob, Segment } from './slop/types'
import { noop } from './shared/noop'

const DETECT_TIMEOUT_MS = 30000
const DETECT_MAX_TOKENS = 600

let detection: Promise<void> = Promise.resolve()

function showCounts($: EngineInterface): void {
  $.ui.status(statusLine(counts()))
  $.ui.invalidate('ui.render')
}

async function recheck($: EngineInterface, options: { absolutePath: string }): Promise<void> {
  const open = openFindingsFor(options.absolutePath)
  if (open.length === 0) {
    return
  }
  const text = await $.fs.read(options.absolutePath).catch(() => '')
  const { commentBlockLines } = unslopView().settings
  markRemoved(open.filter(finding => !isStillPresent({ finding, text, commentBlockLines })).map(finding => finding.id))
}

async function detect($: EngineInterface, job: DetectJob): Promise<void> {
  const { settings } = unslopView()
  const result = await $.model
    .complete({
      model: settings.detectModel,
      system: DETECT_SYSTEM,
      prompt: detectPrompt({ path: job.path, addedLines: job.addedLines, known: openFindingsFor(job.absolutePath).map(finding => finding.excerpt) }),
      maxTokens: DETECT_MAX_TOKENS,
      timeoutMs: DETECT_TIMEOUT_MS,
    })
    .catch(() => undefined)
  if (!result?.isAnswered) {
    return
  }
  const text = await $.fs.read(job.absolutePath).catch(() => '')
  const current = new Set(text.split('\n').map(line => line.trim()))
  const known = new Set(openFindingsFor(job.absolutePath).map(finding => finding.excerpt))
  const parsed = parseDetection({ text: result.text, path: job.path, addedLines: job.addedLines }).filter(
    candidate => current.has(candidate.excerpt) && !known.has(candidate.excerpt),
  )
  const candidates = withSnapshots({ candidates: parsed, text })
  const added = addFindings({ path: job.path, absolutePath: job.absolutePath, candidates, source: 'model', isNotified: false })
  if (added.length === 0) {
    return
  }
  const view = unslopView()
  if (view.isWorking && view.turn === job.turn) {
    const appended = await $.session
      .append({ message: { type: 'user', content: [{ type: 'text', text: appendNote(added) }] } })
      .catch(() => undefined)
    if (appended !== undefined && appended.deny === undefined) {
      markNotified(added.map(finding => finding.id))
    }
  }
  showCounts($)
}

function queueDetection($: EngineInterface, job: DetectJob): void {
  detection = detection.then(() => detect($, job)).catch(noop)
}

async function afterEdit($: EngineInterface, options: { absolutePath: string; segments: readonly Segment[] }): Promise<string | undefined> {
  const view = unslopView()
  const path = relativePath({ path: options.absolutePath, root: view.root })
  if (!view.isOn || isIgnoredPath(path)) {
    return undefined
  }
  await recheck($, { absolutePath: options.absolutePath })
  const lines = addedLines(options.segments)
  if (lines.every(line => line.trim() === '') || isBinaryText(lines.join('\n'))) {
    showCounts($)
    return undefined
  }
  const candidates = scanSegments({ path, segments: options.segments, commentBlockLines: view.settings.commentBlockLines })
  const added = addFindings({ path, absolutePath: options.absolutePath, candidates, source: 'rules', isNotified: true })
  if (view.settings.modelPass) {
    queueDetection($, { path, absolutePath: options.absolutePath, addedLines: lines, turn: view.turn })
  }
  showCounts($)
  return added.length === 0 ? undefined : contextNote({ path, findings: added })
}

export function installEdits(on: On): void {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true || ran.result.staged === true) {
      return ran
    }
    const patch = ran.result.structuredPatch
    const segments = patch.length > 0 ? segmentsFromPatch(patch) : segmentsFromStrings({ before: e.old_string, after: e.new_string })
    const note = await afterEdit($, { absolutePath: e.file_path, segments })
    return note === undefined ? ran : { ...ran, context: [...(ran.context ?? []), note] }
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true || ran.result.staged === true) {
      return ran
    }
    const { structuredPatch, type, originalFile } = ran.result
    let segments = segmentsFromPatch(structuredPatch)
    if (type === 'create') {
      segments = segmentsFromContent(e.content)
    } else if (structuredPatch.length === 0) {
      segments = segmentsFromStrings({ before: originalFile ?? '', after: e.content })
    }
    const note = await afterEdit($, { absolutePath: e.file_path, segments })
    return note === undefined ? ran : { ...ran, context: [...(ran.context ?? []), note] }
  })

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true || e.edit_mode === 'delete') {
      return ran
    }
    const segments = segmentsFromStrings({ before: ran.result.old_source ?? '', after: e.new_source })
    const note = await afterEdit($, { absolutePath: e.notebook_path, segments })
    return note === undefined ? ran : { ...ran, context: [...(ran.context ?? []), note] }
  })

  on('turn.start', ($, e, next) => {
    startTurn()
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      finishTurn()
      for (const absolutePath of filesWithOpenFindings()) {
        await recheck($, { absolutePath })
      }
      showCounts($)
    }
    return next(e)
  })
}
