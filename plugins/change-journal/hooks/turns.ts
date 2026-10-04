import type { EngineInterface, On } from 'claude-code'

import { capHunks, creationHunk, parseNumstat, parseUnifiedDiff } from './journal/diff'
import {
  addEdit,
  beginTurn,
  changedOutsideEdits,
  endTurn,
  journalView,
  setBaseline,
} from './journal/state'
import type { Hunk } from './journal/types'
import { isSecretPath, sanitize } from './shared/privacy'

const GIT = ['git', '-c', 'core.pager=cat', '-c', 'color.ui=false']
const MAX_COMMAND_FILES = 10
const UNTRACKED = 'new file'

async function readCounts($: EngineInterface): Promise<Map<string, string> | undefined> {
  const root = journalView().root
  const tracked = await $.process
    .run([...GIT, 'diff', '--numstat', 'HEAD'], { cwd: root, timeoutMs: 3000 })
    .catch(() => undefined)
  if (!tracked || tracked.exitCode !== 0) {
    return undefined
  }
  const counts = parseNumstat(tracked.stdout)
  const untracked = await $.process
    .run(['git', 'ls-files', '--others', '--exclude-standard'], { cwd: root, timeoutMs: 3000 })
    .catch(() => undefined)
  for (const path of (untracked?.stdout ?? '').split('\n').filter(Boolean)) {
    counts.set(path, UNTRACKED)
  }
  return counts
}

async function hunksFor($: EngineInterface, options: { path: string; count: string }): Promise<Hunk[]> {
  const { path } = options
  const root = journalView().root
  if (options.count === UNTRACKED) {
    const text = await $.fs.read(`${root}/${path}`).catch(() => '')
    return text === '' ? [] : [creationHunk(text)]
  }
  const diff = await $.process
    .run([...GIT, 'diff', '--no-ext-diff', '--unified=3', 'HEAD', '--', path], { cwd: root, timeoutMs: 3000 })
    .catch(() => undefined)
  return diff ? parseUnifiedDiff(diff.stdout) : []
}

async function recordOutsideChanges($: EngineInterface): Promise<void> {
  const counts = await readCounts($)
  if (!counts) {
    return
  }
  const at = await $.clock.now()
  for (const path of changedOutsideEdits(counts).slice(0, MAX_COMMAND_FILES)) {
    const isHidden = isSecretPath(path)
    const raw = isHidden ? [] : await hunksFor($, { path, count: counts.get(path) ?? '' })
    const capped = capHunks(raw)
    addEdit({
      toolUseId: '',
      source: 'Command',
      path,
      status: 'applied',
      hunks: capped.hunks.map(hunk => ({ ...hunk, lines: hunk.lines.map(sanitize) })),
      note: isHidden
        ? 'content hidden: this looks like a secrets file'
        : 'changed outside Edit and Write (a command, a tool, or you); the diff shows every uncommitted change in this file',
      at,
    })
  }
}

export function installTurns(on: On): void {
  on('turn.start', async ($, e, next) => {
    if (journalView().turns.length === 0) {
      const counts = await readCounts($)
      if (counts) {
        setBaseline(counts)
      }
    }
    beginTurn({ at: await $.clock.now(), prompt: sanitize(e.text).slice(0, 2000) })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await recordOutsideChanges($)
      endTurn(await $.clock.now())
    }
    return next(e)
  })
}
