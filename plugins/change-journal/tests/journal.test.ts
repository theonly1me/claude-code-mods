import { expect, test } from 'claude-code/testing'

import { parseNumstat, parseUnifiedDiff } from '../hooks/journal/diff'
import { lastSentences, reasonFrom } from '../hooks/journal/reason'
import { hunksFrom } from '../hooks/journal/restore'
import { parseSummary } from '../hooks/journal/summary'
import { isTestCommand } from '../hooks/journal/tests'

test('the reason is the last two sentences Claude wrote before the call', () => {
  const text = 'I read the file. The merge is missing. I will add it to addItem.'
  expect(lastSentences(text)).toBe('The merge is missing. I will add it to addItem.')
  expect(reasonFrom({ text: '', thinking: 'Check the route next.' })).toBe('Check the route next.')
  expect(lastSentences('Look:\n```ts\nconst a = 1\n```\nDone.')).toBe('Look: Done.')
})

test('a unified diff keeps blank context lines and counts', () => {
  const hunks = parseUnifiedDiff('diff --git a/x b/x\n@@ -1,3 +1,4 @@\n a\n\n-b\n+c\n+d')
  expect(hunks).toHaveLength(1)
  expect(hunks[0]?.lines).toEqual([' a', ' ', '-b', '+c', '+d'])
  expect(parseNumstat('3\t1\tsrc/a.ts\n-\t-\timage.png').get('src/a.ts')).toBe('3\t1')
})

test('summaries parse from noisy replies and reject broken ones', () => {
  const summary = parseSummary('Here you go: {"title":"T","explanation":"E","before":[],"after":[{"text":"S","changed":true,"editIds":[2,"x"]}]}')
  expect(summary?.after[0]).toEqual({ text: 'S', isChanged: true, editIds: [2] })
  expect(parseSummary('no json here')).toBeNull()
  expect(parseSummary('{"title": 3}')).toBeNull()
})

test('test commands are recognized across ecosystems', () => {
  expect(isTestCommand('npm test')).toBe(true)
  expect(isTestCommand('cd app && pnpm run test -- --watch=false')).toBe(true)
  expect(isTestCommand('pytest -q')).toBe(true)
  expect(isTestCommand('cargo test')).toBe(true)
  expect(isTestCommand('node --test')).toBe(true)
  expect(isTestCommand('ls tests')).toBe(false)
  expect(isTestCommand('git commit -m "test"')).toBe(false)
})

test('diff hunks come back from an edit file after a reload', () => {
  const script = '(window.__changeJournalEdits = window.__changeJournalEdits || {})[3] = {"hunks":[{"oldStart":1,"oldLines":1,"newStart":1,"newLines":2,"lines":["-a","+b","+c"]}]};\n'
  expect(hunksFrom(script)).toEqual([{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 2, lines: ['-a', '+b', '+c'] }])
  expect(hunksFrom('')).toEqual([])
})
