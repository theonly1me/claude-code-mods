import type { EngineInterface, PluginOptions, Register } from 'claude-code'

import { installEdits } from './edits'
import { statusLine, takeWrites } from './journal/output'
import { restoreFrom } from './journal/restore'
import { configureJournal, journalSettings } from './journal/settings'
import { adoptJournal, claimAutoOpen, finishSummary, journalView, nextSummaryTurn, resetJournal } from './journal/state'
import { parseSummary, SUMMARY_SYSTEM, summaryPrompt } from './journal/summary'
import type { JournalSettings } from './journal/types'
import { installPane, PANE_ID } from './pane'
import { installReasons } from './reasons'
import { noop } from './shared/noop'
import { installTurns } from './turns'

const PAGE_FILES = ['index.html', 'style.css', 'core.js', 'timeline.js', 'changes.js', 'behavior.js', 'files.js']
const FLUSH_MS = 1000
const SUMMARY_POLL_MS = 1500

let isSummarizing = false
let isInteractive = false

function settingsFrom(options: PluginOptions): JournalSettings {
  const model = options.helperModel
  return {
    liveSummaries: options.liveSummaries !== false,
    helperModel: typeof model === 'string' && model.trim() !== '' ? model.trim() : 'haiku',
    autoOpen: options.autoOpen !== false,
  }
}

function projectSlug(cwd: string): string {
  return cwd.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function openInBrowser($: EngineInterface, options: { path: string }): Promise<void> {
  const opened = await $.process.run(['open', options.path], { timeoutMs: 5000 }).catch(() => undefined)
  if (opened?.exitCode !== 0) {
    await $.process.run(['xdg-open', options.path], { timeoutMs: 5000 }).catch(() => undefined)
  }
}

async function startJournal($: EngineInterface, options: { cwd: string }): Promise<void> {
  const home = (await $.env.get('HOME')) ?? '/tmp'
  const sessionId = await $.session.id()
  const folder = `${home}/.claude/change-journal/${projectSlug(options.cwd)}/${sessionId}`
  resetJournal({
    sessionId,
    project: options.cwd.split('/').filter(Boolean).at(-1) ?? options.cwd,
    root: options.cwd,
    folder,
    startedAt: await $.clock.now(),
  })
  const saved = restoreFrom({ text: await $.fs.read(`${folder}/data.js`).catch(() => ''), sessionId })
  if (saved) {
    adoptJournal(saved)
  }
  for (const name of PAGE_FILES) {
    await $.fs.write(`${folder}/${name}`, await $.fs.read(`${$.plugin.root}/page/${name}`))
  }
}

async function flush($: EngineInterface): Promise<void> {
  const folder = journalView().folder
  if (folder === '') {
    return
  }
  const writes = takeWrites(await $.clock.now())
  for (const edit of writes.edits) {
    await $.fs.write(`${folder}/edit-${edit.id}.js`, edit.text)
  }
  if (writes.data === undefined) {
    return
  }
  await $.fs.write(`${folder}/data.js`, writes.data)
  $.ui.status(statusLine())
  $.ui.invalidate('ui.render')
  if (isInteractive && claimAutoOpen()) {
    await openInBrowser($, { path: `${folder}/index.html` })
  }
}

async function summarizeNext($: EngineInterface): Promise<void> {
  if (isSummarizing) {
    return
  }
  const turn = nextSummaryTurn()
  if (!turn) {
    return
  }
  isSummarizing = true
  const journal = journalView()
  const prompt = summaryPrompt({
    turn,
    edits: journal.edits.filter(edit => edit.turn === turn.index && edit.status === 'applied'),
    tests: journal.tests.filter(test => test.turn === turn.index),
  })
  const result = await $.model
    .complete({ model: journalSettings().helperModel, system: SUMMARY_SYSTEM, prompt, maxTokens: 1500, timeoutMs: 45000 })
    .catch(() => undefined)
  finishSummary({ index: turn.index, summary: result?.isAnswered ? parseSummary(result.text) : null })
  isSummarizing = false
}

export const register: Register = (on, options) => {
  configureJournal(settingsFrom(options))
  installEdits(on)
  installReasons(on)
  installTurns(on)
  installPane(on)

  on('session.start', async ($, e, next) => {
    isInteractive = e.isInteractive
    await $.command.register({
      name: 'changes',
      description: 'Change Journal: no argument opens the pane, "open" opens the live page, "path" prints its path',
      argumentHint: '[open|path]',
      immediate: true,
    })
    await startJournal($, { cwd: e.cwd })
    $.clock.every(FLUSH_MS, () => {
      flush($).catch(noop)
    })
    $.clock.every(SUMMARY_POLL_MS, () => {
      summarizeNext($).catch(noop)
    })
    return next(e)
  })

  on('classic.SessionStart', async ($, e, next) => {
    if (e.source === 'clear') {
      await startJournal($, { cwd: e.cwd })
    }
    return next(e)
  })

  on('command.run', { command: 'changes' }, async ($, e) => {
    const action = e.args.trim().toLowerCase()
    const path = `${journalView().folder}/index.html`
    if (action === 'path') {
      return { text: `Change Journal page: ${path}` }
    }
    if (action === 'open') {
      await openInBrowser($, { path })
      return { text: `Opened the Change Journal page: ${path}` }
    }
    await $.ui.open({ id: PANE_ID, title: 'Change Journal', closeOnEscape: true, rows: 24 })
    return { text: `Change Journal pane opened. Live page: ${path}` }
  })
}
